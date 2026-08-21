import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from './session';

export async function setSessionCookie(
  res: NextResponse,
  login: string,
  isAdmin: boolean,
): Promise<void> {
  const token = await signSession(login, isAdmin);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}
