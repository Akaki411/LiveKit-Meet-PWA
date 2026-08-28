import { getLiveKitUrl } from '@/lib/livekit/get-live-kit-url';
import { ConnectionDetails } from '@/lib/livekit/types';
import { AccessToken, AccessTokenOptions, VideoGrant } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { checkRoomAccess, getRoomCreatedBy, getRoomInfo } from '@/lib/data/rooms';
import { deriveRoomE2EEPassphrase } from '@/lib/livekit/e2ee-key';
import { getUserByLogin, setLastNickname } from '@/lib/auth/users';
import { isAdminRole, type Role } from '@/lib/auth/roles';
import { setSessionCookie } from '@/lib/auth/session-cookie';
import { isRoomActive } from '@/lib/livekit/server';
import { isIpBanned } from '@/lib/data/bans';
import { getClientIp } from '@/lib/net/client-ip';
import { recordParticipant } from '@/lib/livekit/participant-registry';
import { getRoomMeta, isRoomCreator, setRoomCreator } from '@/lib/livekit/room-registry';
import { setRoomTokenCookie } from '@/lib/auth/room-token';

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

const randomString = (length: number): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < length; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
};

const createParticipantToken = (userInfo: AccessTokenOptions, roomName: string) => {
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
};

export const GET = async (request: NextRequest) => {
  try {
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

    const ip = getClientIp(request);
    if (await isIpBanned(ip)) {
      return NextResponse.json({ error: 'banned' }, { status: 403 });
    }

    const roomActive = await isRoomActive(roomName);
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

    let role: Role;
    let login: string | null;
    let avatar: string | null = null;
    let admin = false;
    let identity: string;

    if (session) {
      const user = await getUserByLogin(session.login);
      admin = isAdminRole(user?.role);
      role = (user?.role as Role) ?? 'user';
      login = session.login;
      avatar = user?.avatar ?? null;
      identity = `${session.login}__${randomString(4)}`;
    } else {
      if (!roomActive) {
        return NextResponse.json({ error: 'guest_cannot_create' }, { status: 403 });
      }
      role = 'guest';
      login = null;
      identity = `guest__${randomString(8)}`;
    }

    let creator;
    const dbCreatedBy = await getRoomCreatedBy(roomName);
    if (session && dbCreatedBy && dbCreatedBy === session.login) {
      creator = true;
      setRoomCreator(roomName, identity, login);
    } else if (!getRoomMeta(roomName) && !roomActive) {
      creator = true;
      setRoomCreator(roomName, identity, login);
    } else {
      creator = isRoomCreator(roomName, identity, login);
    }

    const access = await checkRoomAccess(roomName, { isAdmin: admin, password: roomPassword });
    if (!access.ok) {
      const status = access.reason === 'admin_only' ? 403 : 401;
      const denied = NextResponse.json({ error: access.reason }, { status });
      if (session && admin !== session.isAdmin) await setSessionCookie(denied, session.login, admin);
      return denied;
    }

    if (session && participantName) {
      try {
        await setLastNickname(session.login, participantName);
      } catch {
      }
    }

    const metadata = JSON.stringify({ role, admin, creator, login, avatar });
    const participantToken = await createParticipantToken(
      { identity, name: participantName, metadata },
      roomName,
    );

    recordParticipant(roomName, identity, { ip, role, name: participantName, login });

    const roomInfo = await getRoomInfo(roomName);
    const e2eePassphrase = roomInfo.requiresPassword
      ? deriveRoomE2EEPassphrase(roomName)
      : undefined;

    const data: ConnectionDetails = {
      serverUrl: livekitServerUrl,
      roomName,
      participantToken,
      participantName,
      e2eePassphrase,
    };
    const response = NextResponse.json(data);
    if (session && admin !== session.isAdmin) await setSessionCookie(response, session.login, admin);
    await setRoomTokenCookie(response, roomName, identity);
    return response;
  } catch {
    return new NextResponse('Unexpected error', { status: 500 });
  }
};
