import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { getUserByLogin } from '@/lib/auth/users';
import { conferenceAuthority, isAdminRole } from '@/lib/auth/roles';
import { endRoom } from '@/lib/livekit/server';
import { isRoomCreator, forgetRoom } from '@/lib/livekit/room-registry';
import { deleteRoomDir } from '@/lib/data/room-files';
import { readCookie } from '@/lib/net/cookies';

export async function POST(request: Request): Promise<Response> {
  let roomName = '';
  try {
    const body = await request.json();
    roomName = typeof body?.roomName === 'string' ? body.roomName : '';
  } catch {
    return new Response('Bad Request', { status: 400 });
  }
  if (!roomName) return new Response('Bad Request', { status: 400 });

  const session = await verifySession(readCookie(request, SESSION_COOKIE));
  if (!session) return new Response('Forbidden', { status: 403 });
  const user = await getUserByLogin(session.login);
  const actor = {
    admin: isAdminRole(user?.role),
    creator: isRoomCreator(roomName, null, session.login),
  };
  if (conferenceAuthority(actor) < 2) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    await endRoom(roomName);
  } catch {
  }
  await deleteRoomDir(roomName);
  forgetRoom(roomName);
  return Response.json({ ok: true });
}
