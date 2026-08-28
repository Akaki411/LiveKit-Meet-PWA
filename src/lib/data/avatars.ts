import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const STATIC_DIR = path.join(process.cwd(), 'static');

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export const isAllowedType = (type: string): boolean => type in EXT_BY_TYPE;

export const saveAvatar = async (bytes: Buffer, type: string): Promise<string> => {
  fs.mkdirSync(STATIC_DIR, { recursive: true });
  const ext = EXT_BY_TYPE[type] ?? 'bin';
  const filename = `${crypto.randomUUID()}.${ext}`;
  await fs.promises.writeFile(path.join(STATIC_DIR, filename), bytes);
  return filename;
};

export const deleteAvatar = async (filename: string | null | undefined): Promise<void> => {
  if (!filename) return;
  try {
    await fs.promises.unlink(path.join(STATIC_DIR, path.basename(filename)));
  } catch {
    return;
  }
};

export const avatarPath = (filename: string): string =>
  path.join(STATIC_DIR, path.basename(filename));

export const contentTypeFor = (filename: string): string => {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return TYPE_BY_EXT[ext] ?? 'application/octet-stream';
};
