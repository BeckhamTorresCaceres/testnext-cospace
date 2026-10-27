'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Clock, Eye, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/core/i18n';
import type { BookingDetailData } from '@/components/bookings/BookingDetailModal';

export interface BookingCardItem {
  id: string;
  spaceId: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  pricePerHourSnapshot: number;
  totalPrice: number;
  status: 'CONFIRMED' | 'CANCELLED';
  space?: {
    name: string;
    type: 'DESK' | 'MEETING_ROOM' | 'BOOTH';
    imageUrl: string;
    capacity: number;
  };
}

interface BookingCardProps {
  booking: BookingCardItem;
  nowMs: number;
  isAdmin: boolean;
  cancellingId: string | null;
  onOpenDetails: (booking: BookingDetailData) => void;
  onRequestCancel: (booking: BookingCardItem) => void;
}

function formatBogotaDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatBogotaHour(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function BookingCard({
  booking,
  nowMs,
  isAdmin,
  cancellingId,
  onOpenDetails,
  onRequestCancel,
}: BookingCardProps) {
  const { t, locale } = useTranslation();

  const start = new Date(booking.startTime);
  const isFuture = start.getTime() > nowMs;
  const diffSeconds = (start.getTime() - nowMs) / 1000;
  const canCancel =
    booking.status === 'CONFIRMED' && isFuture && (isAdmin || diffSeconds >= 7200);

  const spaceName = booking.space?.name ?? 'Espacio CoSpace';
  const spaceImage =
    booking.space?.imageUrl ??
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85';
  const spaceTypeLabel = booking.space?.type
    ? t(`spaceTypes.${booking.space.type}`) || booking.space.type
    : null;

  const statusText =
    booking.status === 'CONFIRMED'
      ? isFuture
        ? t('dashboard.status.CONFIRMED')
        : t('dashboard.status.COMPLETED')
      : t('dashboard.status.CANCELLED');

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md animate-fade-up sm:flex-row sm:items-center">
      <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-2xl sm:w-44">
        <Image src={spaceImage} alt={spaceName} fill className="object-cover" />
      </div>

      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              booking.status === 'CONFIRMED'
                ? isFuture
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            ● {statusText}
          </span>
          {spaceTypeLabel && (
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
              {spaceTypeLabel}
            </span>
          )}
        </div>

        <Link
          href={`/spaces/${booking.spaceId}`}
          className="mt-2 block text-lg font-bold text-slate-900 hover:text-sky-600"
        >
          {spaceName}
        </Link>

        <div className="mt-1.5 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={15} className="text-sky-600" />
            {formatBogotaDate(booking.startTime, locale)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={15} className="text-sky-600" />
            {formatBogotaHour(booking.startTime, locale)} -{' '}
            {formatBogotaHour(booking.endTime, locale)} ({booking.totalHours}h)
          </span>
        </div>

        <p className="mt-2 text-xs font-semibold text-slate-700">
          {locale === 'en' ? 'Snapshot:' : 'Snapshot:'}{' '}
          ${Number(booking.pricePerHourSnapshot).toFixed(2)}/h ·{' '}
          <span className="text-slate-900 font-bold">
            ${Number(booking.totalPrice).toFixed(2)} total
          </span>
        </p>

        {booking.status === 'CONFIRMED' && isFuture && !canCancel && (
          <p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle size={13} />
            <span>
              {locale === 'en'
                ? 'Cancellation locked (<2h before start)'
                : 'Cancelación bloqueada (< 2h para el inicio)'}
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
        <button
          type="button"
          onClick={() => onOpenDetails(booking)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
        >
          <Eye size={14} /> {locale === 'en' ? 'View Details' : 'Ver detalle'}
        </button>

        {canCancel && (
          <button
            type="button"
            onClick={() => onRequestCancel(booking)}
            disabled={cancellingId === booking.id}
            className="min-h-10 rounded-xl border border-rose-200 px-4 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
          >
            {cancellingId === booking.id ? '...' : t('dashboard.cancelButton')}
          </button>
        )}
      </div>
    </div>
  );
}
