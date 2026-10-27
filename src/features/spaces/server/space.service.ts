import { prisma } from '@/core/db';
import { NotFoundError, ConflictError } from '@/core/errors';
import { CreateSpaceInput, UpdateSpaceInput, SpaceFilterInput } from '../schemas/space.schema';
import { SpaceDTO, toSpaceDTO } from '../types';

export class SpaceService {
  /**
   * Catálogo público: Retorna solo espacios activos (RN-07)
   */
  async getActiveSpaces(filters?: SpaceFilterInput): Promise<SpaceDTO[]> {
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.minCapacity) {
      where.capacity = { gte: filters.minCapacity };
    }

    const spaces = await prisma.space.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return spaces.map(toSpaceDTO);
  }

  /**
   * Panel administrativo: Lista todos los espacios (activos e inactivos)
   */
  async getAllSpaces(): Promise<SpaceDTO[]> {
    const spaces = await prisma.space.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return spaces.map(toSpaceDTO);
  }

  /**
   * Ficha técnica del espacio por ID
   */
  async getSpaceById(id: string, allowInactive: boolean = false): Promise<SpaceDTO> {
    const space = await prisma.space.findUnique({
      where: { id },
    });

    if (!space) {
      throw new NotFoundError('El espacio solicitado no existe.');
    }

    if (!space.isActive && !allowInactive) {
      throw new NotFoundError('El espacio solicitado no se encuentra activo o disponible.');
    }

    return toSpaceDTO(space);
  }

  /**
   * Creación de espacios (RF-08 - Solo ADMIN)
   */
  async createSpace(data: CreateSpaceInput): Promise<SpaceDTO> {
    const space = await prisma.space.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        capacity: data.capacity,
        pricePerHour: data.pricePerHour,
        imageUrl: data.imageUrl,
        isActive: true,
      },
    });

    return toSpaceDTO(space);
  }

  /**
   * Edición de espacios (RF-09 - Solo ADMIN)
   * Las nuevas tarifas se aplicarán únicamente para reservas futuras debido al snapshot de precios.
   */
  async updateSpace(id: string, data: UpdateSpaceInput): Promise<SpaceDTO> {
    const existing = await prisma.space.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('El espacio a editar no existe.');
    }

    const updated = await prisma.space.update({
      where: { id },
      data,
    });

    return toSpaceDTO(updated);
  }

  /**
   * Desactivación lógica de espacios (RF-10, RN-12, RN-13 - Solo ADMIN)
   * Verifica de forma atómica que no existan reservas futuras confirmadas antes de desactivar.
   */
  async deactivateSpace(id: string): Promise<SpaceDTO> {
    const space = await prisma.space.findUnique({
      where: { id },
    });

    if (!space) {
      throw new NotFoundError('El espacio no existe.');
    }

    if (!space.isActive) {
      return toSpaceDTO(space); // Ya se encuentra inactivo
    }

    // RN-13: Verificación de integridad referencial antes de desactivar
    const now = new Date();
    const futureConfirmedBookings = await prisma.booking.count({
      where: {
        spaceId: id,
        status: 'CONFIRMED',
        startTime: { gt: now },
      },
    });

    if (futureConfirmedBookings > 0) {
      throw new ConflictError(
        `No es posible desactivar este espacio porque tiene ${futureConfirmedBookings} reserva(s) futura(s) confirmada(s).`
      );
    }

    // RN-12: Borrado lógico
    const deactivated = await prisma.space.update({
      where: { id },
      data: { isActive: false },
    });

    return toSpaceDTO(deactivated);
  }

  /**
   * Reactivación de espacio en catálogo (Solo ADMIN)
   */
  async activateSpace(id: string): Promise<SpaceDTO> {
    const space = await prisma.space.findUnique({
      where: { id },
    });

    if (!space) {
      throw new NotFoundError('El espacio no existe.');
    }

    const activated = await prisma.space.update({
      where: { id },
      data: { isActive: true },
    });

    return toSpaceDTO(activated);
  }
}

export const spaceService = new SpaceService();
