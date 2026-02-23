import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const publicPaths = ['/login', '/api/auth'];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path)) ||
                       pathname.startsWith('/_next') ||
                       pathname.startsWith('/favicon.ico') ||
                       pathname === '/manifest.json' ||
                       pathname.endsWith('.svg') ||
                       pathname.endsWith('.png') ||
                       pathname.endsWith('.ico');
  
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  const authCookie = request.cookies.get('arachne_auth');
  
  if (!authCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
