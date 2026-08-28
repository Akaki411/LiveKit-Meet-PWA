import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { updatePassword } from '@/lib/auth/users';
import { readCookie } from '@/lib/net/cookies';

export async function POST(request: Request): Promise<Response> {
  const session = await verifySession(readCookie(request, SESSION_COOKIE));
  if (!session) return new Response('Unauthorized', { status: 401 });

  let currentPassword = '';
  let newPassword = '';
  try {
    const body = await request.json();
    currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
  } catch {
    return new Response('Bad Request', { status: 400 });
  }
  const ok = await updatePassword(session.login, currentPassword, newPassword);
  if (!ok) return Response.json({ error: 'wrong_password' }, { status: 400 });
  return Response.json({ ok: true });
}
