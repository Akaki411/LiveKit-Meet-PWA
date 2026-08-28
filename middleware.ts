import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';

function externalOrigin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '') ?? 'https';
  return `${proto}://${host}`;
}

const PUBLIC_PREFIXES = [
  '/api/connection-details',
  '/api/room-info',
  '/api/room/',
  '/api/room-files',
  '/api/livekit-webhook',
  '/api/me',
];

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname.startsWith('/rooms/')) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');

  if (!session && !isPublicPath(pathname)) {
    if (isApi) return new NextResponse('Unauthorized', { status: 401 });
    const loginUrl = new URL('/login', externalOrigin(req));
    loginUrl.searchParams.set('from', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!session?.isAdmin) {
      if (isApi) return new NextResponse('Forbidden', { status: 403 });
      return NextResponse.redirect(new URL('/', externalOrigin(req)));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // `api/room-files` is excluded so large uploads/downloads are not buffered
    // (and size-clamped) by the middleware layer; that route guards itself.
    '/((?!login|api/auth|api/room-files|manifest.webmanifest|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|svg|ico|webp|gif|css|js|woff2?|map|webmanifest)$).*)',
  ],
};
