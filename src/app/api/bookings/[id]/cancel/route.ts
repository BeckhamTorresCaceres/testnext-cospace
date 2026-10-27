import { NextRequest, NextResponse } from 'next/server';
import { bookingService } from '@/features/bookings';
import { requireAuth } from '@/features/auth';
import { handleApiError } from '@/core/errors';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const cancelledBooking = await bookingService.cancelBooking(
      id,
      user.sub,
      user.role
    );

    return NextResponse.json(
      {
        message: 'Reserva cancelada exitosamente.',
        booking: cancelledBooking,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
