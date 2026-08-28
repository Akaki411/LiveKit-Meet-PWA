import * as React from 'react';
import { cookies } from 'next/headers';
import { PageClientImpl } from '@/lib/components/prejoin/page-client-impl';
import { isVideoCodec } from '@/lib/livekit/types';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { getUserByLogin } from '@/lib/auth/users';
import { isAdminRole } from '@/lib/auth/roles';
import { getRoomInfo } from '@/lib/data/rooms';

const safeDecodeRoomName = (name: string): string => {
  try {
    let decoded = name;
    for (let i = 0; i < 3 && /%[0-9a-fA-F]{2}/.test(decoded); i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    return decoded;
  } catch {
    return name;
  }
};

const Page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ roomName: string }>;
  searchParams: Promise<{
    region?: string;
    hq?: string;
    codec?: string;
    singlePC?: string;
  }>;
}) => {
  const _params = await params;
  const _searchParams = await searchParams;
  const roomName = safeDecodeRoomName(_params.roomName);
  const codec =
    typeof _searchParams.codec === 'string' && isVideoCodec(_searchParams.codec)
      ? _searchParams.codec
      : 'vp9';
  const hq = _searchParams.hq === 'true';
  const singlePC = _searchParams.singlePC !== 'false';

  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value);
  let initialNickname = '';
  let isAdmin = false;
  if (session) {
    const user = await getUserByLogin(session.login);
    initialNickname = user?.nickname ?? '';
    isAdmin = isAdminRole(user?.role);
  }
  const roomInfo = await getRoomInfo(roomName);
  const requiresPassword = roomInfo.requiresPassword && !isAdmin;

  return (
    <PageClientImpl
      roomName={roomName}
      region={_searchParams.region}
      hq={hq}
      codec={codec}
      singlePeerConnection={singlePC}
      initialNickname={initialNickname}
      requiresPassword={requiresPassword}
    />
  );
};

export default Page;
