import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { getUserByLogin } from '@/lib/auth/users';
import { conferenceAuthority, isAdminRole } from '@/lib/auth/roles';
import { isRoomCreator } from '@/lib/livekit/room-registry';

export const canModerateRoom = async (
  request: NextRequest,
  roomName: string,
): Promise<boolean> => {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return false;
  const user = await getUserByLogin(session.login);
  const actor = {
    admin: isAdminRole(user?.role),
    creator: isRoomCreator(roomName, null, session.login),
  };
  return conferenceAuthority(actor) >= 2;
};
