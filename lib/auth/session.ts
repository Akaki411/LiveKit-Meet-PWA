const encoder = new TextEncoder();

const toBase64Url = (input: ArrayBuffer | string): string => {
  const bytes = typeof input === 'string' ? encoder.encode(input) : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (input: string): string => atob(input.replace(/-/g, '+').replace(/_/g, '/'));

const hmacSign = async (data: string, secret: string): Promise<string> => {
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

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
export const SESSION_COOKIE = 'cf_session';

const FALLBACK_SECRET = 'livekit-meet-insecure-dev-secret';

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

export interface SessionData {
  login: string;
  isAdmin: boolean;
}

export const signSession = async (login: string, isAdmin: boolean): Promise<string> => {
  const secret = getSecret();
  const payload = toBase64Url(
    JSON.stringify({ u: login, a: isAdmin, exp: Date.now() + SESSION_TTL_MS }),
  );
  const signature = await hmacSign(payload, secret);
  return `${payload}.${signature}`;
};

export const verifySession = async (
  token: string | undefined | null,
): Promise<SessionData | null> => {
  if (!token) return null;
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = await hmacSign(payload, secret);
  if (!timingSafeEqual(signature, expected)) return null;
  try {
    const data = JSON.parse(fromBase64Url(payload)) as { u?: string; a?: boolean; exp?: number };
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (typeof data.u !== 'string') return null;
    return { login: data.u, isAdmin: data.a === true };
  } catch {
    return null;
  }
};
