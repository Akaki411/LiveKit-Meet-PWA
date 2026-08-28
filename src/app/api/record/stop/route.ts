import { getEgressClient } from '@/lib/livekit/server';
import { canModerateRoom } from '@/lib/auth/room-moderator';

export async function GET(request: Request): Promise<Response> {
  try {
    const roomName = new URL(request.url).searchParams.get('roomName');
    if (roomName === null) {
      return new Response('Missing roomName parameter', { status: 400 });
    }
    if (!(await canModerateRoom(request, roomName))) {
      return new Response('Forbidden', { status: 403 });
    }

    const egressClient = getEgressClient();
    const activeEgresses = (await egressClient.listEgress({ roomName })).filter(
      (info) => info.status < 2,
    );
    if (activeEgresses.length === 0) {
      return new Response('No active recording found', { status: 404 });
    }
    await Promise.all(activeEgresses.map((info) => egressClient.stopEgress(info.egressId)));

    return new Response(null, { status: 200 });
  } catch {
    return new Response('Unexpected error', { status: 500 });
  }
}
