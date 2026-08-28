import { NextRequest, NextResponse } from 'next/server';
import { verifyRoomAccess } from '@/lib/livekit/room-access';
import { MAX_FILE_BYTES, saveRoomFile, sweepStaleRoomFiles } from '@/lib/data/room-files';

export const POST = async (request: NextRequest) => {
  const access = await verifyRoomAccess(request);
  if (!access) return new NextResponse('Forbidden', { status: 403 });

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get('file');
    if (value instanceof File) file = value;
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }
  if (!file) return new NextResponse('Bad Request', { status: 400 });
  if (file.size > MAX_FILE_BYTES) return new NextResponse('Payload Too Large', { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await saveRoomFile(access.room, {
    buffer,
    name: file.name,
    type: file.type,
  });

  void sweepStaleRoomFiles();

  return NextResponse.json({
    id: stored.id,
    name: stored.name,
    type: stored.type,
    size: stored.size,
    url: `/api/room-files/${stored.id}`,
  });
};
