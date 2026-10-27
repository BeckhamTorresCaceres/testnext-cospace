import { NextRequest, NextResponse } from 'next/server';
import { authService, registerSchema, setAuthCookies } from '@/features/auth';
import { handleApiError } from '@/core/errors';
import { rateLimiter } from '@/core/security/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    // Protección contra spam de registros: máx 3 registros por minuto por IP
    rateLimiter.check(req, {
      maxRequests: 3,
      windowSeconds: 60,
      keyPrefix: 'auth:register',
    });

    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const { user, accessToken, refreshToken } = await authService.registerUser(validatedData);

    const response = NextResponse.json(
      {
        message: 'Usuario registrado exitosamente.',
        user,
      },
      { status: 201 }
    );

    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
