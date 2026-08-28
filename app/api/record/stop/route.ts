import { NextRequest, NextResponse } from 'next/server';
import { getEgressClient } from '@/lib/livekit/server';
import { canModerateRoom } from '@/lib/auth/room-moderator';

export const GET = async (req: NextRequest) => {
  try {
    const roomName = req.nextUrl.searchParams.get('roomName');
    if (roomName === null) {
      return new NextResponse('Missing roomName parameter', { status: 400 });
    }
    if (!(await canModerateRoom(req, roomName))) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const egressClient = getEgressClient();
    const activeEgresses = (await egressClient.listEgress({ roomName })).filter(
      (info) => info.status < 2,
    );
    if (activeEgresses.length === 0) {
      return new NextResponse('No active recording found', { status: 404 });
    }
    await Promise.all(activeEgresses.map((info) => egressClient.stopEgress(info.egressId)));

    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse('Unexpected error', { status: 500 });
  }
};
