import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { updateLogin } from '@/lib/auth/users';
import { setSessionCookie } from '@/lib/auth/session-cookie';
import { readCookie } from '@/lib/net/cookies';

export async function POST(request: Request): Promise<Response> {
  const session = await verifySession(readCookie(request, SESSION_COOKIE));
  if (!session) return new Response('Unauthorized', { status: 401 });

  let newLogin = '';
  try {
    const body = await request.json();
    newLogin = typeof body?.login === 'string' ? body.login.trim() : '';
  } catch {
    return new Response('Bad Request', { status: 400 });
  }
  if (!newLogin) return Response.json({ error: 'empty' }, { status: 400 });

  const result = await updateLogin(session.login, newLogin);
  if (result === 'exists') return Response.json({ error: 'exists' }, { status: 409 });
  if (result === 'notfound') return new Response('Not Found', { status: 404 });

  const response = Response.json({ ok: true });
  await setSessionCookie(response.headers, newLogin, session.isAdmin);
  return response;
}
