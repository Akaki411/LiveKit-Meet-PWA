const encoder = new TextEncoder();

function toBase64Url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? encoder.encode(input) : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): string {
  return atob(input.replace(/-/g, '+').replace(/_/g, '/'));
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return toBase64Url(signature);
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
export const SESSION_COOKIE = 'cf_session';

const FALLBACK_SECRET = 'livekit-meet-insecure-dev-secret';

export interface SessionData {
  login: string;
  isAdmin: boolean;
}

export async function signSession(login: string, isAdmin: boolean): Promise<string> {
  const secret = process.env.AUTH_SECRET || FALLBACK_SECRET;
  const payload = toBase64Url(
    JSON.stringify({ u: login, a: isAdmin, exp: Date.now() + SESSION_TTL_MS }),
  );
  const signature = await hmacSign(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifySession(
  token: string | undefined | null,
): Promise<SessionData | null> {
  if (!token) return null;
  const secret = process.env.AUTH_SECRET || FALLBACK_SECRET;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = await hmacSign(payload, secret);
  if (signature !== expected) return null;
  try {
    const data = JSON.parse(fromBase64Url(payload)) as { u?: string; a?: boolean; exp?: number };
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (typeof data.u !== 'string') return null;
    return { login: data.u, isAdmin: data.a === true };
  } catch {
    return null;
  }
}
