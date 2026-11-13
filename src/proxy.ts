import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'cospace_access_secret_default_min_32_characters_key!'
);

const ACCESS_COOKIE_NAME = 'cospace_access_token';

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  if (host && !host.includes('0.0.0.0') && !host.includes('localhost')) {
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || process.env.AUTH_URL || 'https://cospaces.coderhivex.com';
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const baseUrl = getBaseUrl(request);

  // 1. Verificar si tiene token y si es v?lido
  let payload: { sub?: string; role?: string } | null = null;
  if (token) {
    try {
      const { payload: verifiedPayload } = await jwtVerify(token, ACCESS_SECRET);
      payload = verifiedPayload as { sub?: string; role?: string };
    } catch {
      payload = null;
    }
  }

  // 2. Si no tiene sesi?n v?lida, redirigir al inicio abriendo el modal de login
  if (!payload) {
    const loginModalUrl = new URL('/', baseUrl);
    loginModalUrl.searchParams.set('auth', 'login');
    loginModalUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginModalUrl);
  }

  // 3. Si intenta acceder a /gestion o /admin, verificar que tenga rol ADMIN
  if (pathname.startsWith('/gestion') || pathname.startsWith('/admin')) {
    if (payload.role !== 'ADMIN') {
      // Redirigir al dashboard si no es administrador
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/gestion/:path*', '/admin/:path*'],
};
