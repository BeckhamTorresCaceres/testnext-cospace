import { NextRequest, NextResponse } from 'next/server';
import {
  spaceService,
  createSpaceSchema,
  spaceFilterSchema,
} from '@/features/spaces';
import { getAuthenticatedUser, requireAdmin } from '@/features/auth';
import { handleApiError } from '@/core/errors';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get('type') || undefined;
    const minCapacityParam = searchParams.get('minCapacity') || undefined;
    const allParam = searchParams.get('all') === 'true';

    const filters = spaceFilterSchema.parse({
      type: typeParam,
      minCapacity: minCapacityParam,
    });

    // Si solicita "all=true", validar privilegios de administrador
    if (allParam) {
      const user = await getAuthenticatedUser();
      if (user && user.role === 'ADMIN') {
        const spaces = await spaceService.getAllSpaces();
        return NextResponse.json({ spaces }, { status: 200 });
      }
    }

    // Catálogo público: solo activos
    const spaces = await spaceService.getActiveSpaces(filters);
    return NextResponse.json({ spaces }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Defensa en profundidad: solo ADMIN puede crear espacios
    await requireAdmin();

    const body = await req.json();
    const validatedData = createSpaceSchema.parse(body);

    const newSpace = await spaceService.createSpace(validatedData);

    return NextResponse.json(
      {
        message: 'Espacio creado exitosamente.',
        space: newSpace,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
