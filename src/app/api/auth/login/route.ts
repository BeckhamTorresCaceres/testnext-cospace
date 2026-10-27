import { NextRequest, NextResponse } from 'next/server';
import { authService, loginSchema, setAuthCookies } from '@/features/auth';
import { handleApiError } from '@/core/errors';
import { rateLimiter } from '@/core/security/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    // Protección contra fuerza bruta: máx 5 intentos por minuto por IP
    rateLimiter.check(req, {
      maxRequests: 5,
      windowSeconds: 60,
      keyPrefix: 'auth:login',
    });

    const body = await req.json();
    const validatedData = loginSchema.parse(body);

    const { user, accessToken, refreshToken } = await authService.authenticateUser(validatedData);

    const response = NextResponse.json(
      {
        message: 'Sesión iniciada correctamente.',
        user,
      },
      { status: 200 }
    );

    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
