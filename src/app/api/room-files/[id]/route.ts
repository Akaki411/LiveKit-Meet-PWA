import fs from 'node:fs/promises';
import type { RouteContext } from 'rari';
import { verifyRoomAccess } from '@/lib/livekit/room-access';
import { readRoomFile } from '@/lib/data/room-files';

export async function GET(
  request: Request,
  context?: RouteContext<{ id: string }>,
): Promise<Response> {
  const access = await verifyRoomAccess(request);
  if (!access) return new Response('Forbidden', { status: 403 });

  const id = context?.params.id ?? '';
  const found = await readRoomFile(access.room, id);
  if (!found) return new Response('Not Found', { status: 404 });

  const data = await fs.readFile(found.path);
  return Response.json(
    {
      name: found.meta.name,
      type: found.meta.type,
      size: found.meta.size,
      dataBase64: data.toString('base64'),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
