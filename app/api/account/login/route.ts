import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from '@/lib/auth/session';
import { updateLogin } from '@/lib/auth/users';

export const POST = async (request: NextRequest) => {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  let newLogin = '';
  try {
    const body = await request.json();
    newLogin = typeof body?.login === 'string' ? body.login.trim() : '';
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }
  if (!newLogin) return NextResponse.json({ error: 'empty' }, { status: 400 });

  const result = await updateLogin(session.login, newLogin);
  if (result === 'exists') return NextResponse.json({ error: 'exists' }, { status: 409 });
  if (result === 'notfound') return new NextResponse('Not Found', { status: 404 });

  const token = await signSession(newLogin, session.isAdmin);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
};
