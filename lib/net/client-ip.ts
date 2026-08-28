import type { NextRequest } from 'next/server';

const TRUSTED_PROXY_COUNT = Math.max(0, Number(process.env.TRUSTED_PROXY_COUNT ?? '1') || 0);

const normalize = (ip: string): string => {
  let value = ip;
  if (value.startsWith('::ffff:')) value = value.slice('::ffff:'.length);
  if (value.includes('.') && value.includes(':')) value = value.split(':')[0];
  return value;
};

export const getClientIp = (request: NextRequest): string | null => {
  const xff = request.headers.get('x-forwarded-for');
  if (xff && TRUSTED_PROXY_COUNT > 0) {
    const parts = xff
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      const index = Math.max(0, parts.length - TRUSTED_PROXY_COUNT);
      return normalize(parts[index]);
    }
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return normalize(realIp.trim());
  return null;
};
