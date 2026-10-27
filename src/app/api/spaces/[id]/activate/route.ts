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

    const activated = await spaceService.activateSpace(id);

    return NextResponse.json(
      {
        message: 'Espacio reactivado exitosamente en el catálogo.',
        space: activated,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

