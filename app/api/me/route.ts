import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session';
import { getUserByLogin } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { setSessionCookie } from '@/lib/session-cookie';

export async function GET(request: NextRequest) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });
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
}
