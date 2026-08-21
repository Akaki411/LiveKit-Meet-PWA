import { getLiveKitUrl } from '@/lib/get-live-kit-url';
import { ConnectionDetails } from '@/lib/types';
import { AccessToken, AccessTokenOptions, VideoGrant } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session';
import { checkRoomAccess } from '@/lib/rooms';
import { getUserByLogin, setLastNickname } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { setSessionCookie } from '@/lib/session-cookie';

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < length; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const roomName = request.nextUrl.searchParams.get('roomName');
    const participantName = request.nextUrl.searchParams.get('participantName');
    const roomPassword = request.nextUrl.searchParams.get('password') ?? undefined;
    const region = request.nextUrl.searchParams.get('region');

    if (!LIVEKIT_URL) throw new Error('LIVEKIT_URL is not defined');
    if (!API_KEY || !API_SECRET) throw new Error('LiveKit API key/secret is not defined');
    if (typeof roomName !== 'string') {
      return new NextResponse('Missing required query parameter: roomName', { status: 400 });
    }
    if (participantName === null) {
      return new NextResponse('Missing required query parameter: participantName', { status: 400 });
    }
    const livekitServerUrl = region ? getLiveKitUrl(LIVEKIT_URL, region) : LIVEKIT_URL;
    if (livekitServerUrl === undefined) throw new Error('Invalid region');

    const user = await getUserByLogin(session.login);
    const admin = isAdminRole(user?.role);

    const access = await checkRoomAccess(roomName, {
      isAdmin: admin,
      password: roomPassword,
    });
    if (!access.ok) {
      const status = access.reason === 'admin_only' ? 403 : 401;
      const denied = NextResponse.json({ error: access.reason }, { status });
      if (admin !== session.isAdmin) await setSessionCookie(denied, session.login, admin);
      return denied;
    }

    if (participantName) {
      try {
        await setLastNickname(session.login, participantName);
      } catch {
      }
    }

    const identity = `${session.login}__${randomString(4)}`;
    const metadata = JSON.stringify({
      admin,
      login: session.login,
      avatar: user?.avatar ?? null,
    });
    const participantToken = await createParticipantToken(
      { identity, name: participantName, metadata },
      roomName,
    );

    const data: ConnectionDetails = {
      serverUrl: livekitServerUrl,
      roomName,
      participantToken,
      participantName,
    };
    const response = NextResponse.json(data);
    if (admin !== session.isAdmin) await setSessionCookie(response, session.login, admin);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Unexpected error', { status: 500 });
  }
}

function createParticipantToken(userInfo: AccessTokenOptions, roomName: string) {
  const at = new AccessToken(API_KEY, API_SECRET, userInfo);
  at.ttl = '5m';
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);
  return at.toJwt();
}
