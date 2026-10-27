import { Booking, BookingStatus, SpaceType } from '@prisma/client';

export type { BookingStatus };

export interface BookingDTO {
  id: string;
  userId: string;
  spaceId: string;
  startTime: Date;
  endTime: Date;
  totalHours: number;
  pricePerHourSnapshot: number;
  totalPrice: number;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
  space?: {
    name: string;
    type: SpaceType;
    imageUrl: string;
    capacity: number;
  };
  user?: {
    name: string;
    email: string;
  };
}

export function toBookingDTO(
  booking: Booking & {
    space?: { name: string; type: SpaceType; imageUrl: string; capacity: number } | null;
    user?: { name: string; email: string } | null;
  }
): BookingDTO {
  return {
    id: booking.id,
    userId: booking.userId,
    spaceId: booking.spaceId,
    startTime: booking.startTime,
    endTime: booking.endTime,
    totalHours: booking.totalHours,
    pricePerHourSnapshot: Number(booking.pricePerHourSnapshot),
    totalPrice: Number(booking.totalPrice),
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    space: booking.space
      ? {
          name: booking.space.name,
          type: booking.space.type,
          imageUrl: booking.space.imageUrl,
          capacity: booking.space.capacity,
        }
      : undefined,
    user: booking.user
      ? {
          name: booking.user.name,
          email: booking.user.email,
        }
      : undefined,
  };
}
