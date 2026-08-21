import * as React from 'react';
import { cookies } from 'next/headers';
import { PageClientImpl } from '@/lib/components/page-client-impl';
import { isVideoCodec } from '@/lib/types';
import { SESSION_COOKIE, verifySession } from '@/lib/session';
import { getUserByLogin } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { getRoomInfo } from '@/lib/rooms';

export default async function Page({
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
}) {
  const _params = await params;
  const _searchParams = await searchParams;
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
  const roomInfo = await getRoomInfo(_params.roomName);
  const requiresPassword = roomInfo.requiresPassword && !isAdmin;

  return (
    <PageClientImpl
      roomName={_params.roomName}
      region={_searchParams.region}
      hq={hq}
      codec={codec}
      singlePeerConnection={singlePC}
      initialNickname={initialNickname}
      requiresPassword={requiresPassword}
    />
  );
}
