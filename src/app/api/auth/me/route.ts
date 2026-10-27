import { NextResponse } from 'next/server';
import { requireAuth, authService } from '@/features/auth';
import { handleApiError } from '@/core/errors';

export async function GET() {
  try {
    const session = await requireAuth();
    const user = await authService.getUserProfile(session.sub);

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
