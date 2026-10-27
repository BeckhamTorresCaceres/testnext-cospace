'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  CalendarDays,
  Clock,
  Copy,
  Check,
  Users,
  Receipt,
  MapPin,
  ExternalLink,
  Printer,
  X,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from '@/core/i18n';
import { Portal } from '@/components/shared/Portal';

export interface BookingDetailData {
  id: string;
  spaceId: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  pricePerHourSnapshot: number;
  totalPrice: number;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt?: string;
  space?: {
    name: string;
    type: 'DESK' | 'MEETING_ROOM' | 'BOOTH';
    imageUrl: string;
    capacity: number;
  };
}

interface BookingDetailModalProps {
  booking: BookingDetailData | null;
  isAdmin?: boolean;
  onClose: () => void;
  onRequestCancel: (booking: BookingDetailData) => void;
}

export function BookingDetailModal({
  booking,
  isAdmin = false,
  onClose,
  onRequestCancel,
}: BookingDetailModalProps) {
  const { t, locale } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!booking) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [booking, onClose]);

  if (!booking) return null;

  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const isFuture = start.getTime() > nowMs;
  const diffSeconds = (start.getTime() - nowMs) / 1000;
  const hoursRemaining = Math.max(0, diffSeconds / 3600);
  const canCancel =
    booking.status === 'CONFIRMED' && isFuture && (isAdmin || diffSeconds >= 7200);

  const spaceName = booking.space?.name ?? 'Espacio CoSpace';
  const spaceImage =
    booking.space?.imageUrl ??
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85';
  const spaceTypeLabel = booking.space?.type
    ? t(`spaceTypes.${booking.space.type}`) || booking.space.type
    : 'Coworking';
  const capacity = booking.space?.capacity ?? 1;

  const statusText =
    booking.status === 'CONFIRMED'
      ? isFuture
        ? t('dashboard.status.CONFIRMED')
        : t('dashboard.status.COMPLETED')
      : t('dashboard.status.CANCELLED');

  const fullDateStr = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(start);

  const startHourStr = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(start);

  const endHourStr = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(end);

  const createdAtStr = booking.createdAt
    ? new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
        timeZone: 'America/Bogota',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(booking.createdAt))
    : null;

  const shortCode = booking.id.slice(0, 8).toUpperCase();

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(booking.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-4 sm:p-6 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-detail-title"
      >
        <div className="flex min-h-full items-center justify-center py-6">
          <div
            className="relative w-full max-w-xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Cabecera visual con imagen del espacio */}
        <div className="relative h-48 w-full">
          <Image
            src={spaceImage}
            alt={spaceName}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent" />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/90 text-slate-700 shadow-md backdrop-blur transition hover:bg-white hover:text-slate-950"
            aria-label="Cerrar detalle"
          >
            <X size={18} />
          </button>

          <div className="absolute left-5 top-4 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold shadow-sm backdrop-blur ${
                booking.status === 'CONFIRMED'
                  ? isFuture
                    ? 'bg-emerald-500/95 text-white'
                    : 'bg-slate-800/90 text-slate-100'
                  : 'bg-rose-500/95 text-white'
              }`}
            >
              ● {statusText}
            </span>
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur">
              {spaceTypeLabel}
            </span>
          </div>

          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3 text-white">
            <div>
              <p className="text-xs font-medium text-sky-300">
                {locale === 'en' ? 'Booking Voucher' : 'Comprobante de Reserva'}
              </p>
              <h2 id="booking-detail-title" className="text-2xl font-bold tracking-tight">
                {spaceName}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleCopyId}
              className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-mono font-semibold text-white backdrop-blur transition hover:bg-white/25"
              title="Copiar ID completo de la reserva"
            >
              <span>#{shortCode}</span>
              {copied ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Cuerpo del detalle */}
        <div className="p-6 sm:p-7">
          {/* Grid de Fecha, Horario, Sede y Capacidad */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <CalendarDays size={15} className="text-sky-600" />
                <span>{locale === 'en' ? 'Reserved Date' : 'Fecha reservada'}</span>
              </div>
              <p className="mt-1.5 text-sm font-bold capitalize text-slate-900">
                {fullDateStr}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Clock size={15} className="text-sky-600" />
                <span>
                  {locale === 'en' ? 'Time Slot (Bogotá)' : 'Horario (Bogotá UTC-5)'}
                </span>
              </div>
              <p className="mt-1.5 text-sm font-bold text-slate-900">
                {startHourStr} a {endHourStr}{' '}
                <span className="font-normal text-slate-500">
                  ({booking.totalHours}{' '}
                  {booking.totalHours === 1 ? t('booking.hour') : t('booking.hours')})
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Users size={15} className="text-sky-600" />
                <span>{locale === 'en' ? 'Space Capacity' : 'Capacidad máxima'}</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-slate-800">
                {t('spaces.upTo')} {capacity}{' '}
                {capacity === 1 ? t('spaces.person') : t('spaces.people')}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <MapPin size={15} className="text-sky-600" />
                <span>{locale === 'en' ? 'Location' : 'Sede y Acceso'}</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-slate-800">
                CoSpace Central Hub · Bogotá
              </p>
            </div>
          </div>

          {/* Desglose Financiero Inmutable (Snapshot RN-08) */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Receipt size={15} className="text-sky-600" />
                {locale === 'en'
                  ? 'Financial Breakdown (Snapshot RN-08)'
                  : 'Desglose Financiero (Snapshot RN-08)'}
              </span>
              {createdAtStr && (
                <span className="text-[11px] text-slate-400">
                  {locale === 'en' ? 'Created:' : 'Creada:'} {createdAtStr}
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>
                  {locale === 'en'
                    ? 'Locked hourly rate'
                    : 'Tarifa por hora garantizada'}
                </span>
                <span className="font-medium text-slate-900">
                  ${Number(booking.pricePerHourSnapshot).toFixed(2)} / h
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>
                  {locale === 'en' ? 'Booked duration' : 'Duración contratada'}
                </span>
                <span className="font-medium text-slate-900">
                  × {booking.totalHours}{' '}
                  {booking.totalHours === 1 ? t('booking.hour') : t('booking.hours')}
                </span>
              </div>
              <div className="my-2 h-px bg-slate-100" />
              <div className="flex items-center justify-between text-base font-bold text-slate-900">
                <span>{locale === 'en' ? 'Total Amount' : 'Total de la Reserva'}</span>
                <span className="text-lg text-sky-600">
                  ${Number(booking.totalPrice).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Estado de política de cancelación RN-10 */}
          {booking.status === 'CONFIRMED' && isFuture && (
            <div
              className={`mt-4 flex items-start gap-2.5 rounded-2xl border p-3.5 text-xs ${
                canCancel
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              {canCancel ? (
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-600" />
              )}
              <div>
                <p className="font-bold">
                  {canCancel
                    ? locale === 'en'
                      ? 'Free cancellation available (RN-10)'
                      : 'Cancelación habilitada (Regla RN-10)'
                    : locale === 'en'
                    ? 'Cancellation window closed (< 2 hours before start)'
                    : 'Ventana de cancelación cerrada (< 2 horas para iniciar)'}
                </p>
                <p className="mt-0.5 opacity-90">
                  {canCancel
                    ? locale === 'en'
                      ? `Starts in ~${hoursRemaining.toFixed(1)} hours. You can cancel up to 2 hours before start time.`
                      : `Inicia en ~${hoursRemaining.toFixed(1)} horas. Puedes cancelar sin cargo hasta 2 horas antes del inicio.`
                    : t('dashboard.cancelWarning')}
                </p>
              </div>
            </div>
          )}

          {/* Botones de acción inferiores */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Link
                href={`/spaces/${booking.spaceId}`}
                onClick={onClose}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ExternalLink size={14} />
                {locale === 'en' ? 'View Space' : 'Ver espacio'}
              </Link>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Printer size={14} />
                {locale === 'en' ? 'Print' : 'Imprimir'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {canCancel && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestCancel(booking);
                  }}
                  className="min-h-10 rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                >
                  {t('dashboard.cancelButton')}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="min-h-10 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                {locale === 'en' ? 'Close' : 'Cerrar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</Portal>
  );
}

