import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { createRoom, listRooms } from '@/lib/data/rooms';

export const GET = async (request: NextRequest) => {
  if (!(await requireAdmin(request))) return new NextResponse('Forbidden', { status: 403 });
  return NextResponse.json(await listRooms());
};

export const POST = async (request: NextRequest) => {
  const session = await requireAdmin(request);
  if (!session) return new NextResponse('Forbidden', { status: 403 });

  let name = '';
  let password: string | undefined;
  let adminOnly = false;
  try {
    const body = await request.json();
    name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, '-') : '';
    password =
      typeof body?.password === 'string' && body.password.length > 0 ? body.password : undefined;
    adminOnly = body?.adminOnly === true;
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  if (!name) return NextResponse.json({ error: 'room_name_required' }, { status: 400 });

  try {
    const room = await createRoom(name, { password, adminOnly, createdBy: session.login });
    return NextResponse.json(room, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'room_exists' }, { status: 409 });
  }
};
