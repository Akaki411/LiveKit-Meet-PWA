import { SESSION_COOKIE, SessionData, verifySession } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/roles';
import { getUserByLogin } from '@/lib/auth/users';
import { readCookie } from '@/lib/net/cookies';

export const requireAdmin = async (request: Request): Promise<SessionData | null> => {
  const session = await verifySession(readCookie(request, SESSION_COOKIE));
  if (!session) return null;
  const user = await getUserByLogin(session.login);
  if (!user || !isAdminRole(user.role)) return null;
  return { ...session, isAdmin: true };
};
