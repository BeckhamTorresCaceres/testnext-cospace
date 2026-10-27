import { NextRequest, NextResponse } from 'next/server';
import { spaceService, updateSpaceSchema } from '@/features/spaces';
import { getAuthenticatedUser, requireAdmin } from '@/features/auth';
import { handleApiError } from '@/core/errors';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();
    const isAdmin = user?.role === 'ADMIN';

    const space = await spaceService.getSpaceById(id, isAdmin);
    return NextResponse.json({ space }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const validatedData = updateSpaceSchema.parse(body);

    const updatedSpace = await spaceService.updateSpace(id, validatedData);

    return NextResponse.json(
      {
        message: 'Espacio actualizado exitosamente.',
        space: updatedSpace,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
