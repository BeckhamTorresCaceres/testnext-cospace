'use client';

import Image from 'next/image';
import { Search, User, CalendarDays, Clock, Eye } from 'lucide-react';
import { PageLoader } from '@/components/shared/Loader';
import { useTranslation } from '@/core/i18n';
import type { AdminBookingItem } from '../types';

interface AdminBookingsSectionProps {
  bookings: AdminBookingItem[];
  bookingSearch: string;
  onBookingSearchChange: (search: string) => void;
  loading: boolean;
  nowMs: number;
  cancellingBookingId: string | null;
  onSelectBooking: (booking: AdminBookingItem) => void;
  onCancelBooking: (bookingId: string) => void;
}

export function AdminBookingsSection({
  bookings,
  bookingSearch,
  onBookingSearchChange,
  loading,
  nowMs,
  cancellingBookingId,
  onSelectBooking,
  onCancelBooking,
}: AdminBookingsSectionProps) {
  const { t, locale } = useTranslation();

  const filteredBookings = bookings.filter((b) => {
    const q = bookingSearch.toLowerCase();
    const spaceName = b.space?.name?.toLowerCase() ?? '';
    const userName = b.user?.name?.toLowerCase() ?? '';
    const userEmail = b.user?.email?.toLowerCase() ?? '';
    return spaceName.includes(q) || userName.includes(q) || userEmail.includes(q);
  });

  return (
    <div>
      {/* Buscador de reservas */}
      <div className="mt-6 flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
        <Search size={18} className="text-slate-400" />
        <input
          value={bookingSearch}
          onChange={(e) => onBookingSearchChange(e.target.value)}
          className="w-full bg-transparent text-sm outline-none"
          placeholder={
            locale === 'en'
              ? 'Search booking by space, client name or email...'
              : 'Buscar reserva por espacio, nombre de cliente o correo...'
          }
        />
      </div>

      {/* Listado de reservas */}
      <div className="mt-5 space-y-4">
        {loading ? (
          <PageLoader
            label={
              locale === 'en'
                ? 'Loading global bookings...'
                : 'Cargando reservas globales...'
            }
          />
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
            {t('dashboard.noBookings')}
          </div>
        ) : (
          filteredBookings.map((b) => {
            const start = new Date(b.startTime);
            const isFuture = start.getTime() > nowMs;
            const spaceName = b.space?.name ?? 'Espacio CoSpace';
            const spaceImage =
              b.space?.imageUrl ??
              'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85';

            const statusText =
              b.status === 'CONFIRMED'
                ? isFuture
                  ? t('dashboard.status.CONFIRMED')
                  : t('dashboard.status.COMPLETED')
                : t('dashboard.status.CANCELLED');

            return (
              <div
                key={b.id}
                className="flex flex-col justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md animate-fade-up sm:flex-row sm:items-center"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-2xl sm:w-36">
                    <Image
                      src={spaceImage}
                      alt={spaceName}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          b.status === 'CONFIRMED'
                            ? isFuture
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        ● {statusText}
                      </span>
                      <span className="text-base font-bold text-slate-900">
                        {spaceName}
                      </span>
                    </div>

                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
                      <User size={13} className="text-sky-600" />
                      <span className="font-semibold text-slate-800">
                        {b.user?.name ?? 'Cliente'}
                      </span>
                      <span className="text-slate-400">
                        ({b.user?.email ?? ''})
                      </span>
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={13} className="text-sky-600" />
                        {new Intl.DateTimeFormat(
                          locale === 'en' ? 'en-US' : 'es-CO',
                          {
                            timeZone: 'America/Bogota',
                            dateStyle: 'medium',
                          }
                        ).format(start)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-sky-600" />
                        {new Intl.DateTimeFormat(
                          locale === 'en' ? 'en-US' : 'es-CO',
                          {
                            timeZone: 'America/Bogota',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          }
                        ).format(start)}{' '}
                        -{' '}
                        {new Intl.DateTimeFormat(
                          locale === 'en' ? 'en-US' : 'es-CO',
                          {
                            timeZone: 'America/Bogota',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          }
                        ).format(new Date(b.endTime))}{' '}
                        ({b.totalHours}h · ${Number(b.totalPrice).toFixed(2)})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <button
                    type="button"
                    onClick={() => onSelectBooking(b)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                  >
                    <Eye size={14} />{' '}
                    {locale === 'en' ? 'View Details' : 'Ver detalle'}
                  </button>

                  {b.status === 'CONFIRMED' && isFuture && (
                    <button
                      type="button"
                      onClick={() => onCancelBooking(b.id)}
                      disabled={cancellingBookingId === b.id}
                      className="min-h-9 rounded-xl border border-rose-200 px-3.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                    >
                      {cancellingBookingId === b.id
                        ? '...'
                        : t('dashboard.cancelButton')}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
