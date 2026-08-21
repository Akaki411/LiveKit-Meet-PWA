import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session';
import { getRoomInfo } from '@/lib/rooms';

export async function GET(request: NextRequest) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });
  const roomName = request.nextUrl.searchParams.get('roomName');
  if (!roomName) return new NextResponse('Missing roomName', { status: 400 });
  return NextResponse.json(await getRoomInfo(roomName));
}
