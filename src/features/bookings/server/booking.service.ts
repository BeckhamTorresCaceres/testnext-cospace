import { prisma } from '@/core/db';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '@/core/errors';
import {
  validateBookingTimeRules,
  canUserCancelBooking,
} from '@/core/timezone';
import { CreateBookingInput } from '../schemas/create-booking.schema';
import { BookingDTO, toBookingDTO } from '../types';

export class BookingService {
  /**
   * Creación de reserva con transacción interactiva atómica (RN-01 a RN-08)
   */
  async createBooking(userId: string, input: CreateBookingInput): Promise<BookingDTO> {
    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);

    // 1. Validar reglas de tiempo (RN-01, RN-02, RN-03) en America/Bogota
    const { totalHours } = validateBookingTimeRules(startTime, endTime);

    // 2. Ejecutar bloque interactivo atómico ($transaction) anti-race condition
    return await prisma.$transaction(async (tx) => {
      // a. RN-07: Validar que el espacio exista y esté activo
      const space = await tx.space.findUnique({
        where: { id: input.spaceId },
      });

      if (!space) {
        throw new NotFoundError('El espacio seleccionado no existe.');
      }

      if (!space.isActive) {
        throw new ConflictError('No se puede reservar un espacio que se encuentra inactivo.');
      }

      // b. RN-06: Validar límite de reservas futuras del usuario (máximo 3)
      const now = new Date();
      const futureUserBookingsCount = await tx.booking.count({
        where: {
          userId,
          status: 'CONFIRMED',
          startTime: { gt: now },
        },
      });

      if (futureUserBookingsCount >= 3) {
        throw new ConflictError(
          'Has alcanzado el límite máximo permitido de 3 reservas futuras activas.'
        );
      }

      // c. RN-05: Validar que el usuario no tenga otra reserva confirmada que se solape
      const userOverlap = await tx.booking.findFirst({
        where: {
          userId,
          status: 'CONFIRMED',
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (userOverlap) {
        throw new ConflictError(
          'Ya tienes otra reserva confirmada que coincide total o parcialmente con este horario.'
        );
      }

      // d. RN-04: Validar que el espacio no tenga una reserva confirmada que se solape
      const spaceOverlap = await tx.booking.findFirst({
        where: {
          spaceId: input.spaceId,
          status: 'CONFIRMED',
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (spaceOverlap) {
        throw new ConflictError(
          'El espacio ya cuenta con una reserva confirmada en la franja horaria seleccionada.'
        );
      }

      // e. RN-08: Cálculo estricto de precio en el servidor y snapshot contable
      const pricePerHourSnapshot = Number(space.pricePerHour);
      const totalPrice = Number((pricePerHourSnapshot * totalHours).toFixed(2));

      // f. Persistencia de la reserva
      const created = await tx.booking.create({
        data: {
          userId,
          spaceId: input.spaceId,
          startTime,
          endTime,
          totalHours,
          pricePerHourSnapshot,
          totalPrice,
          status: 'CONFIRMED',
        },
        include: {
          space: {
            select: {
              name: true,
              type: true,
              imageUrl: true,
              capacity: true,
            },
          },
        },
      });

      return toBookingDTO(created);
    });
  }

  /**
   * Cancelación de reserva (RN-09, RN-10, RN-11, RN-14)
   */
  async cancelBooking(bookingId: string, userId: string, userRole: string): Promise<BookingDTO> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        space: {
          select: {
            name: true,
            type: true,
            imageUrl: true,
            capacity: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('La reserva solicitada no existe.');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestError('La reserva ya ha sido cancelada previamente.');
    }

    const isAdmin = userRole === 'ADMIN';

    // RN-09 & RN-14: Solo el propietario o un ADMIN pueden cancelar
    if (!isAdmin && booking.userId !== userId) {
      throw new ForbiddenError('No tienes autorización para cancelar reservas pertenecientes a otros usuarios.');
    }

    // RN-10: Usuario regular debe cancelar con >= 2 horas de anticipación
    if (!isAdmin && !canUserCancelBooking(booking.startTime, false)) {
      throw new BadRequestError(
        'No es posible cancelar la reserva con menos de 2 horas de anticipación a su inicio.'
      );
    }

    // RN-11: Actualización de estado a CANCELLED (borrado lógico, no físico)
    const cancelled = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
      include: {
        space: {
          select: {
            name: true,
            type: true,
            imageUrl: true,
            capacity: true,
          },
        },
      },
    });

    return toBookingDTO(cancelled);
  }

  /**
   * Listado de reservas propias del usuario (RN-14)
   */
  async getUserBookings(userId: string): Promise<BookingDTO[]> {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        space: {
          select: {
            name: true,
            type: true,
            imageUrl: true,
            capacity: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    return bookings.map(toBookingDTO);
  }

  /**
   * Listado global de reservas (Panel ADMIN)
   */
  async getAllBookings(): Promise<BookingDTO[]> {
    const bookings = await prisma.booking.findMany({
      include: {
        space: {
          select: {
            name: true,
            type: true,
            imageUrl: true,
            capacity: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    return bookings.map(toBookingDTO);
  }
}

export const bookingService = new BookingService();
