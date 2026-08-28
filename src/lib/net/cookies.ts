export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  maxAge?: number;
}

export const readCookie = (request: Request, name: string): string | undefined => {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
};

export const serializeCookie = (
  name: string,
  value: string,
  options: CookieOptions = {},
): string => {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? '/'}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) {
    const v = options.sameSite;
    parts.push(`SameSite=${v.charAt(0).toUpperCase()}${v.slice(1)}`);
  }
  return parts.join('; ');
};

export const isSecureCookies = process.env.NODE_ENV === 'production';
