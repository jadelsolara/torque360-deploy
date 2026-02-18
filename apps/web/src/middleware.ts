import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = request.headers.get('x-nonce') ?? crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set('x-nonce', nonce);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
