import fs from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { verifyRoomAccess } from '@/lib/livekit/room-access';
import { readRoomFile } from '@/lib/data/room-files';

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const access = await verifyRoomAccess(request);
  if (!access) return new NextResponse('Forbidden', { status: 403 });

  const { id } = await params;
  const found = await readRoomFile(access.room, id);
  if (!found) return new NextResponse('Not Found', { status: 404 });

  const data = await fs.readFile(found.path);
  const isImage = found.meta.type.startsWith('image/');
  const filename = encodeURIComponent(found.meta.name);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': found.meta.type,
      'Content-Disposition': `${isImage ? 'inline' : 'attachment'}; filename*=UTF-8''${filename}`,
      'Cache-Control': 'private, no-store',
    },
  });
};
