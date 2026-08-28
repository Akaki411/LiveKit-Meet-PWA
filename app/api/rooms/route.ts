import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { createRoom } from '@/lib/data/rooms';

export const POST = async (request: NextRequest) => {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  let name = '';
  let password: string | undefined;
  try {
    const body = await request.json();
    name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, '-') : '';
    password =
      typeof body?.password === 'string' && body.password.length > 0 ? body.password : undefined;
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  if (!name) return NextResponse.json({ error: 'room_name_required' }, { status: 400 });
  if (!password) return NextResponse.json({ error: 'password_required' }, { status: 400 });

  try {
    const room = await createRoom(name, { password, createdBy: session.login });
    return NextResponse.json(room, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'room_exists' }, { status: 409 });
  }
};
