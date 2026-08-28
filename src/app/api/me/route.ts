import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { getUserByLogin } from '@/lib/auth/users';
import { isAdminRole } from '@/lib/auth/roles';
import { setSessionCookie } from '@/lib/auth/session-cookie';
import { readCookie } from '@/lib/net/cookies';

export async function GET(request: Request): Promise<Response> {
  const session = await verifySession(readCookie(request, SESSION_COOKIE));
  if (!session) {
    return Response.json({ login: null, role: 'guest', nickname: null, avatar: null });
  }
  const user = await getUserByLogin(session.login);
  const response = Response.json({
    login: session.login,
    role: user?.role ?? 'user',
    nickname: user?.nickname ?? null,
    avatar: user?.avatar ?? null,
  });
  const admin = isAdminRole(user?.role);
  if (admin !== session.isAdmin) {
    await setSessionCookie(response.headers, session.login, admin);
  }
  return response;
}
