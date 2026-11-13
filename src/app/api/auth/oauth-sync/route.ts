import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { authService, setAuthCookies } from '@/features/auth';

export const dynamic = 'force-dynamic';

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  if (host && !host.includes('0.0.0.0') && !host.includes('localhost')) {
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || process.env.AUTH_URL || 'https://cospaces.coderhivex.com';
}

export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl(request);
    const session = await auth();
    const searchParams = request.nextUrl.searchParams;
    const targetRedirect = searchParams.get('redirect') || '/dashboard';

    if (!session?.user?.email) {
      const errorUrl = new URL('/login', baseUrl);
      errorUrl.searchParams.set('error', 'OAuthFailed');
      return NextResponse.redirect(errorUrl);
    }

    // Sincronizar o crear usuario en la base de datos y generar tokens CoSpace
    const result = await authService.handleOAuthLogin({
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    });

    let finalDestination = targetRedirect;
    if (result.user.role === 'ADMIN' && (targetRedirect === '/' || targetRedirect === '/dashboard')) {
      finalDestination = '/gestion';
    }

    const destinationUrl = new URL(finalDestination, baseUrl);
    const response = NextResponse.redirect(destinationUrl);

    // Adjuntar cookies de sesi?n cospace_access_token y cospace_refresh_token
    setAuthCookies(response, result.accessToken, result.refreshToken);

    return response;
  } catch (error) {
    console.error('[OAuth Sync Error]:', error);
    const baseUrl = getBaseUrl(request);
    const errorUrl = new URL('/login', baseUrl);
    errorUrl.searchParams.set('error', 'OAuthSyncFailed');
    return NextResponse.redirect(errorUrl);
  }
}
