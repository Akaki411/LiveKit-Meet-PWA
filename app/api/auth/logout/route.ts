import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/session';

export const POST = async () => {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
};
