import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { getRoomInfo } from '@/lib/data/rooms';

export const GET = async (request: NextRequest) => {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });
  const roomName = request.nextUrl.searchParams.get('roomName');
  if (!roomName) return new NextResponse('Missing roomName', { status: 400 });
  return NextResponse.json(await getRoomInfo(roomName));
};
