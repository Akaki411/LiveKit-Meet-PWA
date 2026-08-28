import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from '@/lib/auth/session';
import { validateCredentials } from '@/lib/auth/users';
import { isAdminRole } from '@/lib/auth/roles';
import { getClientIp } from '@/lib/net/client-ip';
import { rateLimit } from '@/lib/net/rate-limit';

export const POST = async (request: NextRequest) => {
  const ip = getClientIp(request) ?? 'unknown';
  if (!rateLimit(`login:${ip}`, 10, 5 * 60 * 1000)) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  let username = '';
  let password = '';
  try {
    const body = await request.json();
    username = typeof body?.username === 'string' ? body.username : '';
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  const user = await validateCredentials(username, password);
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const admin = isAdminRole(user.role);
  const token = await signSession(user.login, admin);
  const response = NextResponse.json({ ok: true, isAdmin: admin });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
};
