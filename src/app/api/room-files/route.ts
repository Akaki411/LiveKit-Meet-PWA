import fs from 'node:fs/promises';
import { verifyRoomAccess } from '@/lib/livekit/room-access';
import {
  MAX_FILE_BYTES,
  UPLOADS_TMP_DIR,
  finalizeUpload,
  isSafeUploadId,
  sweepStaleRoomFiles,
  uploadTmpPath,
} from '@/lib/data/room-files';

interface ChunkBody {
  uploadId?: string;
  index?: number;
  totalChunks?: number;
  chunkBase64?: string;
  name?: string;
  type?: string;
}

export async function POST(request: Request): Promise<Response> {
  const access = await verifyRoomAccess(request);
  if (!access) return new Response('Forbidden', { status: 403 });

  let body: ChunkBody;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const { uploadId, index, totalChunks, chunkBase64, name, type } = body;
  if (
    typeof uploadId !== 'string' ||
    !isSafeUploadId(uploadId) ||
    typeof index !== 'number' ||
    typeof totalChunks !== 'number' ||
    !Number.isInteger(index) ||
    !Number.isInteger(totalChunks) ||
    index < 0 ||
    index >= totalChunks ||
    typeof chunkBase64 !== 'string'
  ) {
    return new Response('Bad Request', { status: 400 });
  }

  const chunk = Buffer.from(chunkBase64, 'base64');
  const tmpPath = uploadTmpPath(uploadId);

  let priorSize = 0;
  try {
    priorSize = (await fs.stat(tmpPath)).size;
  } catch {
    // first chunk of this upload — no partial file yet
  }
  if (priorSize + chunk.length > MAX_FILE_BYTES) {
    await fs.rm(tmpPath, { force: true });
    return Response.json({ error: 'too_large' }, { status: 413 });
  }

  await fs.mkdir(UPLOADS_TMP_DIR, { recursive: true });
  await fs.appendFile(tmpPath, chunk);

  if (index < totalChunks - 1) {
    return Response.json({ ok: true });
  }

  try {
    const stored = await finalizeUpload(access.room, tmpPath, {
      name: name ?? 'file',
      type: type ?? 'application/octet-stream',
    });
    void sweepStaleRoomFiles();
    return Response.json({
      id: stored.id,
      name: stored.name,
      type: stored.type,
      size: stored.size,
      url: `/api/room-files/${stored.id}`,
    });
  } catch (error) {
    console.error('[room-files] finalize failed', error);
    await fs.rm(tmpPath, { force: true });
    return new Response('Unexpected error', { status: 500 });
  }
}
