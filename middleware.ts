import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

function externalOrigin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '') ?? 'https';
  return `${proto}://${host}`;
}

export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');

  if (!session) {
    if (isApi) return new NextResponse('Unauthorized', { status: 401 });
    const loginUrl = new URL('/login', externalOrigin(req));
    loginUrl.searchParams.set('from', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) && !session.isAdmin) {
    if (isApi) return new NextResponse('Forbidden', { status: 403 });
    return NextResponse.redirect(new URL('/', externalOrigin(req)));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!login|api/auth|manifest.webmanifest|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|svg|ico|webp|gif|css|js|woff2?|map|webmanifest)$).*)',
  ],
};
