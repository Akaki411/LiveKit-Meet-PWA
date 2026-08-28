import { requireAdmin } from '@/lib/auth/admin-guard';
import { kickParticipant, listActiveRooms, listParticipants } from '@/lib/livekit/server';

export async function GET(request: Request): Promise<Response> {
  if (!(await requireAdmin(request))) return new Response('Forbidden', { status: 403 });
  const roomName = new URL(request.url).searchParams.get('roomName');
  try {
    if (roomName) return Response.json(await listParticipants(roomName));
    return Response.json(await listActiveRooms());
  } catch {
    return Response.json({ error: 'livekit_unavailable' }, { status: 502 });
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!(await requireAdmin(request))) return new Response('Forbidden', { status: 403 });
  let roomName = '';
  let identity = '';
  try {
    const body = await request.json();
    roomName = typeof body?.roomName === 'string' ? body.roomName : '';
    identity = typeof body?.identity === 'string' ? body.identity : '';
  } catch {
    return new Response('Bad Request', { status: 400 });
  }
  if (!roomName || !identity) return new Response('Bad Request', { status: 400 });
  try {
    await kickParticipant(roomName, identity);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'kick_failed' }, { status: 502 });
  }
}
