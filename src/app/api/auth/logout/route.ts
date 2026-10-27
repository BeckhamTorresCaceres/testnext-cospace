import { NextResponse } from 'next/server';
import { authService, clearAuthCookies, getAuthenticatedUser } from '@/features/auth';
import { handleApiError } from '@/core/errors';

export async function POST() {
  try {
    const user = await getAuthenticatedUser();

    if (user) {
      await authService.revokeSession(user.sub);
    }

    const response = NextResponse.json(
      { message: 'Sesión cerrada exitosamente.' },
      { status: 200 }
    );

    clearAuthCookies(response);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
