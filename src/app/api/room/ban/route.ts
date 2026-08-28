import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { getUserByLogin } from '@/lib/auth/users';
import { canModerate, isAdminRole, type ConferenceFlags } from '@/lib/auth/roles';
import { getParticipantFlags, kickParticipant } from '@/lib/livekit/server';
import { isRoomCreator } from '@/lib/livekit/room-registry';
import { forgetParticipant, getParticipantInfo } from '@/lib/livekit/participant-registry';
import { addBan } from '@/lib/data/bans';
import { readCookie } from '@/lib/net/cookies';

export async function POST(request: Request): Promise<Response> {
  let roomName = '';
  let identity = '';
  try {
    const body = await request.json();
    roomName = typeof body?.roomName === 'string' ? body.roomName : '';
    identity = typeof body?.identity === 'string' ? body.identity : '';
  } catch {
    return new Response('Bad Request', { status: 400 });
  }
  if (!roomName || !identity) return new Response('Bad Request', { status: 400 });

  const session = await verifySession(readCookie(request, SESSION_COOKIE));
  const actor: ConferenceFlags = session
    ? {
        admin: isAdminRole((await getUserByLogin(session.login))?.role),
        creator: isRoomCreator(roomName, null, session.login),
      }
    : { creator: false, admin: false };

  const targetFlags = (await getParticipantFlags(roomName, identity)) ?? {
    role: 'guest',
    admin: false,
    creator: false,
  };
  if (!canModerate(actor, { creator: targetFlags.creator, admin: targetFlags.admin })) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  const info = getParticipantInfo(roomName, identity);
  if (!info?.ip) {
    try {
      await kickParticipant(roomName, identity);
      forgetParticipant(roomName, identity);
    } catch {
    }
    return Response.json({ error: 'no_ip' }, { status: 409 });
  }

  await addBan({
    ip: info.ip,
    name: info.name,
    role: targetFlags.role,
    login: info.login,
    roomName,
    bannedBy: session?.login ?? null,
  });

  try {
    await kickParticipant(roomName, identity);
    forgetParticipant(roomName, identity);
  } catch {
  }
  return Response.json({ ok: true });
}
