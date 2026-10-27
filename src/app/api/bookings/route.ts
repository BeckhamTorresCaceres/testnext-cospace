import { NextRequest, NextResponse } from 'next/server';
import {
  bookingService,
  createBookingSchema,
} from '@/features/bookings';
import { requireAuth } from '@/features/auth';
import { handleApiError } from '@/core/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const allParam = searchParams.get('all') === 'true';

    // Panel ADMIN: Si solicita all=true y tiene rol ADMIN, lista todas las reservas globales
    if (allParam && user.role === 'ADMIN') {
      const bookings = await bookingService.getAllBookings();
      return NextResponse.json({ bookings }, { status: 200 });
    }

    // RN-14: Por defecto retorna única y exclusivamente las reservas propias del usuario
    const bookings = await bookingService.getUserBookings(user.sub);
    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await req.json();
    const validatedData = createBookingSchema.parse(body);

    const booking = await bookingService.createBooking(user.sub, validatedData);

    return NextResponse.json(
      {
        message: 'Reserva confirmada exitosamente.',
        booking,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
