import { requireAdmin } from '@/lib/auth/admin-guard';
import { createRoom, listRooms } from '@/lib/data/rooms';

export async function GET(request: Request): Promise<Response> {
  if (!(await requireAdmin(request))) return new Response('Forbidden', { status: 403 });
  return Response.json(await listRooms());
}

export async function POST(request: Request): Promise<Response> {
  const session = await requireAdmin(request);
  if (!session) return new Response('Forbidden', { status: 403 });

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
    return new Response('Bad Request', { status: 400 });
  }

  if (!name) return Response.json({ error: 'room_name_required' }, { status: 400 });

  try {
    const room = await createRoom(name, { password, adminOnly, createdBy: session.login });
    return Response.json(room, { status: 201 });
  } catch {
    return Response.json({ error: 'room_exists' }, { status: 409 });
  }
}
