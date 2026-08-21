import { NextRequest } from 'next/server';
import { SESSION_COOKIE, SessionData, verifySession } from '@/lib/session';
import { getRoleChange } from '@/lib/role-cache';
import { isAdminRole } from '@/lib/roles';

export async function requireAdmin(request: NextRequest): Promise<SessionData | null> {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const changedRole = getRoleChange(session.login);
  const isAdmin = changedRole ? isAdminRole(changedRole) : session.isAdmin;
  return isAdmin ? { ...session, isAdmin } : null;
}
