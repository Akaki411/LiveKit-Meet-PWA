import { NextResponse } from 'next/server';

const encoder = new TextEncoder();
const FALLBACK_SECRET = 'livekit-meet-insecure-dev-secret';
const TTL_MS = 6 * 60 * 60 * 1000;
export const ROOM_TOKEN_COOKIE = 'cf_rt';
const ROOM_TOKEN_MAX_AGE = 6 * 60 * 60;

const toBase64Url = (input: ArrayBuffer | string): string => {
  const bytes = typeof input === 'string' ? encoder.encode(input) : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (input: string): string => atob(input.replace(/-/g, '+').replace(/_/g, '/'));

const getSecret = (): string => {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be set in production');
  }
  return FALLBACK_SECRET;
};

const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const hmac = async (data: string): Promise<string> => {
  const secret = getSecret();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return toBase64Url(signature);
};

export interface RoomTokenData {
  room: string;
  identity: string;
}

export const signRoomToken = async (room: string, identity: string): Promise<string> => {
  const payload = toBase64Url(JSON.stringify({ r: room, i: identity, exp: Date.now() + TTL_MS }));
  return `${payload}.${await hmac(payload)}`;
};

export const verifyRoomToken = async (
  token: string | undefined | null,
): Promise<RoomTokenData | null> => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  let expected: string;
  try {
    expected = await hmac(payload);
  } catch {
    return null;
  }
  if (!timingSafeEqual(signature, expected)) return null;
  try {
    const data = JSON.parse(fromBase64Url(payload)) as { r?: string; i?: string; exp?: number };
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (typeof data.r !== 'string' || typeof data.i !== 'string') return null;
    return { room: data.r, identity: data.i };
  } catch {
    return null;
  }
};

export const setRoomTokenCookie = async (
  res: NextResponse,
  room: string,
  identity: string,
): Promise<void> => {
  const token = await signRoomToken(room, identity);
  res.cookies.set(ROOM_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ROOM_TOKEN_MAX_AGE,
  });
};
