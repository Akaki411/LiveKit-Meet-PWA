import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { updatePassword } from '@/lib/auth/users';

export const POST = async (request: NextRequest) => {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  let currentPassword = '';
  let newPassword = '';
  try {
    const body = await request.json();
    currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }
  const ok = await updatePassword(session.login, currentPassword, newPassword);
  if (!ok) return NextResponse.json({ error: 'wrong_password' }, { status: 400 });
  return NextResponse.json({ ok: true });
};
