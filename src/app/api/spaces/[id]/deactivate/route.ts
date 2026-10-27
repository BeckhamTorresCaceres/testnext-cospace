import { NextRequest, NextResponse } from 'next/server';
import { spaceService } from '@/features/spaces';
import { requireAdmin } from '@/features/auth';
import { handleApiError } from '@/core/errors';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const deactivated = await spaceService.deactivateSpace(id);

    return NextResponse.json(
      {
        message: 'Espacio desactivado exitosamente.',
        space: deactivated,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
