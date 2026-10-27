'use client';

import { AlertTriangle } from 'lucide-react';
import { Portal } from '@/components/shared/Portal';
import { useTranslation } from '@/core/i18n';
import type { BookingCardItem } from './BookingCard';

interface BookingCancelModalProps {
  booking: BookingCardItem | null;
  cancelling: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function BookingCancelModal({
  booking,
  cancelling,
  onClose,
  onConfirm,
}: BookingCancelModalProps) {
  const { locale } = useTranslation();

  if (!booking) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-5 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <div className="flex min-h-full items-center justify-center py-6">
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertTriangle size={22} />
            </span>
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              {locale === 'en'
                ? `Cancel booking at ${booking.space?.name ?? 'this space'}?`
                : `¿Cancelar tu reserva en ${booking.space?.name ?? 'este espacio'}?`}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {locale === 'en'
                ? 'This action will change the booking status to CANCELLED and free the time slot for other users.'
                : 'Esta acción cambiará el estado de la reserva a CANCELLED de forma irreversible y liberará el bloque horario.'}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 flex-1 rounded-xl bg-slate-100 font-semibold text-slate-700 hover:bg-slate-200"
              >
                {locale === 'en' ? 'Back' : 'Volver'}
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={onConfirm}
                className="min-h-11 flex-1 rounded-xl bg-rose-600 font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {cancelling
                  ? locale === 'en'
                    ? 'Cancelling...'
                    : 'Cancelando...'
                  : locale === 'en'
                  ? 'Confirm'
                  : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
