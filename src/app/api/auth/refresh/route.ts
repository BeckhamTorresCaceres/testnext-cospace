import { NextRequest, NextResponse } from 'next/server';
import { authService, setAuthCookies, REFRESH_COOKIE_NAME } from '@/features/auth';
import { UnauthorizedError, handleApiError } from '@/core/errors';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

    if (!refreshToken) {
      throw new UnauthorizedError('Cookie de renovación no encontrada.');
    }

    const { user, accessToken, refreshToken: newRefreshToken } =
      await authService.rotateTokens(refreshToken);

    const response = NextResponse.json(
      {
        message: 'Tokens renovados exitosamente.',
        user,
      },
      { status: 200 }
    );

    setAuthCookies(response, accessToken, newRefreshToken);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
