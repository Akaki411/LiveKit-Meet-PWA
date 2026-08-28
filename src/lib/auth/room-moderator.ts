import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { getUserByLogin } from '@/lib/auth/users';
import { conferenceAuthority, isAdminRole } from '@/lib/auth/roles';
import { isRoomCreator } from '@/lib/livekit/room-registry';
import { readCookie } from '@/lib/net/cookies';

export const canModerateRoom = async (request: Request, roomName: string): Promise<boolean> => {
  const session = await verifySession(readCookie(request, SESSION_COOKIE));
  if (!session) return false;
  const user = await getUserByLogin(session.login);
  const actor = {
    admin: isAdminRole(user?.role),
    creator: isRoomCreator(roomName, null, session.login),
  };
  return conferenceAuthority(actor) >= 2;
};
