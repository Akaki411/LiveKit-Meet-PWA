import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { getUserByLogin } from '@/lib/auth/users';
import { isAdminRole } from '@/lib/auth/roles';
import { setSessionCookie } from '@/lib/auth/session-cookie';

export const GET = async (request: NextRequest) => {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ login: null, role: 'guest', nickname: null, avatar: null });
  }
  const user = await getUserByLogin(session.login);
  const response = NextResponse.json({
    login: session.login,
    role: user?.role ?? 'user',
    nickname: user?.nickname ?? null,
    avatar: user?.avatar ?? null,
  });
  const admin = isAdminRole(user?.role);
  if (admin !== session.isAdmin) {
    await setSessionCookie(response, session.login, admin);
  }
  return response;
};
