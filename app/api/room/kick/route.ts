import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { getUserByLogin } from '@/lib/auth/users';
import { canModerate, isAdminRole, type ConferenceFlags } from '@/lib/auth/roles';
import { getParticipantFlags, kickParticipant } from '@/lib/livekit/server';
import { isRoomCreator } from '@/lib/livekit/room-registry';
import { forgetParticipant } from '@/lib/livekit/participant-registry';

const actorFlags = async (request: NextRequest, roomName: string): Promise<ConferenceFlags> => {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return { creator: false, admin: false };
  const user = await getUserByLogin(session.login);
  return {
    admin: isAdminRole(user?.role),
    creator: isRoomCreator(roomName, null, session.login),
  };
};

export const POST = async (request: NextRequest) => {
  let roomName = '';
  let identity = '';
  try {
    const body = await request.json();
    roomName = typeof body?.roomName === 'string' ? body.roomName : '';
    identity = typeof body?.identity === 'string' ? body.identity : '';
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }
  if (!roomName || !identity) return new NextResponse('Bad Request', { status: 400 });

  const actor = await actorFlags(request, roomName);
  const target = (await getParticipantFlags(roomName, identity)) ?? {
    role: 'guest',
    admin: false,
    creator: false,
  };

  if (!canModerate(actor, { creator: target.creator, admin: target.admin })) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    await kickParticipant(roomName, identity);
    forgetParticipant(roomName, identity);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'kick_failed' }, { status: 502 });
  }
};
