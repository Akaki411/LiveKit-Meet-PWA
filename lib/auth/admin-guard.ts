import { NextRequest } from 'next/server';
import { SESSION_COOKIE, SessionData, verifySession } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/roles';
import { getUserByLogin } from '@/lib/auth/users';

export const requireAdmin = async (request: NextRequest): Promise<SessionData | null> => {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await getUserByLogin(session.login);
  if (!user || !isAdminRole(user.role)) return null;
  return { ...session, isAdmin: true };
};
