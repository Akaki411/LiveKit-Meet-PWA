import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { createRoom } from '@/lib/data/rooms';
import { readCookie } from '@/lib/net/cookies';

export async function POST(request: Request): Promise<Response> {
  const session = await verifySession(readCookie(request, SESSION_COOKIE));
  if (!session) return new Response('Unauthorized', { status: 401 });

  let name = '';
  let password: string | undefined;
  try {
    const body = await request.json();
    name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, '-') : '';
    password =
      typeof body?.password === 'string' && body.password.length > 0 ? body.password : undefined;
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  if (!name) return Response.json({ error: 'room_name_required' }, { status: 400 });
  if (!password) return Response.json({ error: 'password_required' }, { status: 400 });

  try {
    const room = await createRoom(name, { password, createdBy: session.login });
    return Response.json(room, { status: 201 });
  } catch {
    return Response.json({ error: 'room_exists' }, { status: 409 });
  }
}
