import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { kickParticipant, listActiveRooms, listParticipants } from '@/lib/livekit';

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return new NextResponse('Forbidden', { status: 403 });
  const roomName = request.nextUrl.searchParams.get('roomName');
  try {
    if (roomName) return NextResponse.json(await listParticipants(roomName));
    return NextResponse.json(await listActiveRooms());
  } catch {
    return NextResponse.json({ error: 'livekit_unavailable' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return new NextResponse('Forbidden', { status: 403 });
  let roomName = '';
  let identity = '';
  try {
    const body = await request.json();
    roomName = typeof body?.roomName === 'string' ? body.roomName : '';
    identity = typeof body?.identity === 'string' ? body.identity : '';
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }
  if (!roomName || !identity) return new NextResponse('Bad Request', { status: 400 });
  try {
    await kickParticipant(roomName, identity);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'kick_failed' }, { status: 502 });
  }
}
