import { validateCredentials } from '@/lib/auth/users';
import { isAdminRole } from '@/lib/auth/roles';
import { getClientIp } from '@/lib/net/client-ip';
import { rateLimit } from '@/lib/net/rate-limit';
import { setSessionCookie } from '@/lib/auth/session-cookie';

export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request) ?? 'unknown';
  if (!rateLimit(`login:${ip}`, 10, 5 * 60 * 1000)) {
    return new Response('Too Many Requests', { status: 429 });
  }

  let username = '';
  let password = '';
  try {
    const body = await request.json();
    username = typeof body?.username === 'string' ? body.username : '';
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const user = await validateCredentials(username, password);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const admin = isAdminRole(user.role);
  const response = Response.json({ ok: true, isAdmin: admin });
  await setSessionCookie(response.headers, user.login, admin);
  return response;
}
