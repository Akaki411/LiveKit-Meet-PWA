import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { MAX_FILE_BYTES } from './attachment-limits';

export const STATIC_ROOT = path.join(process.cwd(), 'static');
export const UPLOADS_TMP_DIR = path.join(STATIC_ROOT, '.uploads');
export { MAX_FILE_BYTES };
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000;

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
}

const roomHash = (roomName: string): string =>
  crypto.createHash('sha256').update(roomName).digest('hex').slice(0, 32);

export const roomDir = (roomName: string): string => path.join(STATIC_ROOT, roomHash(roomName));

export const isSafeUploadId = (id: string): boolean => /^[a-f0-9-]{36}$/i.test(id);

export const uploadTmpPath = (uploadId: string): string =>
  path.join(UPLOADS_TMP_DIR, `${uploadId}.part`);

export const finalizeUpload = async (
  roomName: string,
  tmpPath: string,
  file: { name: string; type: string },
): Promise<StoredFile> => {
  const dir = roomDir(roomName);
  await fs.mkdir(dir, { recursive: true });
  const id = crypto.randomUUID();
  const name = file.name.slice(0, 200) || 'file';
  await fs.rename(tmpPath, path.join(dir, id));
  const stat = await fs.stat(path.join(dir, id));
  const meta: StoredFile = {
    id,
    name,
    type: file.type || 'application/octet-stream',
    size: stat.size,
  };
  await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify(meta), 'utf8');
  await fs.utimes(dir, new Date(), new Date()).catch(() => {});
  return meta;
};

export const readRoomFile = async (
  roomName: string,
  id: string,
): Promise<{ path: string; meta: StoredFile } | null> => {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
  const dir = roomDir(roomName);
  const filePath = path.join(dir, id);
  const metaPath = path.join(dir, `${id}.json`);
  try {
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf8')) as StoredFile;
    await fs.access(filePath);
    return { path: filePath, meta };
  } catch {
    return null;
  }
};

export const deleteRoomDir = async (roomName: string): Promise<void> => {
  await fs.rm(roomDir(roomName), { recursive: true, force: true }).catch(() => {});
};

let lastSweep = 0;

export const sweepStaleRoomFiles = async (): Promise<void> => {
  const now = Date.now();
  if (now - lastSweep < 60 * 60 * 1000) return;
  lastSweep = now;
  try {
    if (fsSync.existsSync(STATIC_ROOT)) {
      const entries = await fs.readdir(STATIC_ROOT, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === '.uploads') continue;
        const dir = path.join(STATIC_ROOT, entry.name);
        try {
          const stat = await fs.stat(dir);
          if (now - stat.mtimeMs > STALE_MS) {
            await fs.rm(dir, { recursive: true, force: true });
          }
        } catch {
        }
      }
    }
    if (fsSync.existsSync(UPLOADS_TMP_DIR)) {
      const entries = await fs.readdir(UPLOADS_TMP_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const filePath = path.join(UPLOADS_TMP_DIR, entry.name);
        try {
          const stat = await fs.stat(filePath);
          if (now - stat.mtimeMs > STALE_UPLOAD_MS) {
            await fs.rm(filePath, { force: true });
          }
        } catch {
        }
      }
    }
  } catch {
  }
};
