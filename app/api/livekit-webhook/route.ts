import { NextRequest, NextResponse } from 'next/server';
import { WebhookReceiver } from 'livekit-server-sdk';
import { deleteRoomDir, sweepStaleRoomFiles } from '@/lib/data/room-files';
import { forgetRoom } from '@/lib/livekit/room-registry';

const API_KEY = process.env.LIVEKIT_API_KEY || '';
const API_SECRET = process.env.LIVEKIT_API_SECRET || '';

const receiver = new WebhookReceiver(API_KEY, API_SECRET);

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.text();
    const event = await receiver.receive(body, request.headers.get('Authorization') ?? undefined);
    if (event.event === 'room_finished' && event.room?.name) {
      await deleteRoomDir(event.room.name);
      forgetRoom(event.room.name);
    }
    void sweepStaleRoomFiles();
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse('invalid', { status: 401 });
  }
};
