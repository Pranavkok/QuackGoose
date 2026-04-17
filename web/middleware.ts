import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PROTECTED_ROUTES = ['/dashboard', '/garden', '/analytics', '/settings', '/onboarding'];
const SESSION_COOKIES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_ROUTES.some(path => pathname.startsWith(path));
  const hasSession = SESSION_COOKIES.some(cookie => Boolean(req.cookies.get(cookie)?.value));

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
