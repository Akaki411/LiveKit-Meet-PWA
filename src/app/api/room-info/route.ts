import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { getRoomInfo } from '@/lib/data/rooms';
import { getUserByLogin } from '@/lib/auth/users';
import { isAdminRole } from '@/lib/auth/roles';
import { readCookie } from '@/lib/net/cookies';

export async function GET(request: Request): Promise<Response> {
  const roomName = new URL(request.url).searchParams.get('roomName');
  if (!roomName) return new Response('Missing roomName', { status: 400 });

  const session = await verifySession(readCookie(request, SESSION_COOKIE));
  let isAdmin = false;
  if (session) {
    const user = await getUserByLogin(session.login);
    isAdmin = isAdminRole(user?.role);
  }

  const info = await getRoomInfo(roomName);
  return Response.json({
    exists: info.exists,
    adminOnly: info.adminOnly,
    requiresPassword: info.requiresPassword && !isAdmin,
  });
}
