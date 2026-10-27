'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { fetchWithAuth, parseApiError } from '@/lib/api';
import { openAuthModal } from '@/components/auth/AuthModal';
import { useTranslation } from '@/core/i18n';
import { Spinner } from '@/components/shared/Loader';

interface BookingWidgetProps {
  spaceId: string;
  pricePerHour: number;
}

function getBogotaDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return parts; // YYYY-MM-DD
}

function getBogotaCurrentHour(): number {
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    hour: 'numeric',
    hour12: false,
  }).format(new Date());
  const h = parseInt(hourStr, 10);
  return h === 24 ? 0 : h;
}

const OPERATING_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export function BookingWidget({ spaceId, pricePerHour }: BookingWidgetProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const { minDate, maxDate, todayBogota } = useMemo(() => {
    const now = new Date();
    const todayStr = getBogotaDateString(now);
    const currentH = getBogotaCurrentHour();

    // Si ya pasaron las 19:00 en Bogotá hoy, sugerir mañana por defecto
    const defaultStart =
      currentH >= 20 ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : now;
    const maxD = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000);

    return {
      todayBogota: todayStr,
      minDate: getBogotaDateString(defaultStart),
      maxDate: getBogotaDateString(maxD),
    };
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(minDate);
  const [startHour, setStartHour] = useState<number>(10);
  const [duration, setDuration] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const currentBogotaHour = getBogotaCurrentHour();
  const isSelectedToday = selectedDate === todayBogota;

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (newDate === todayBogota) {
      const nextValidHour = Math.max(7, currentBogotaHour + 1);
      if (nextValidHour <= 20 && startHour <= currentBogotaHour) {
        setStartHour(nextValidHour);
        if (nextValidHour + duration > 21) {
          setDuration(Math.max(1, 21 - nextValidHour));
        }
      }
    }
  };

  const endHour = startHour + duration;
  const total = Number((duration * pricePerHour).toFixed(2));

  const isHourDisabled = (h: number) => {
    if (isSelectedToday && h <= currentBogotaHour) {
      return true;
    }
    return false;
  };

  const handleBooking = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Construir ISO 8601 con offset explícito de America/Bogota (-05:00)
      const startTime = new Date(
        `${selectedDate}T${String(startHour).padStart(2, '0')}:00:00-05:00`
      ).toISOString();
      const endTime = new Date(
        `${selectedDate}T${String(endHour).padStart(2, '0')}:00:00-05:00`
      ).toISOString();

      const res = await fetchWithAuth('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId, startTime, endTime }),
      });

      if (res.status === 401) {
        setErrorMsg(t('booking.loginRequired'));
        openAuthModal('login');
        return;
      }

      if (!res.ok) {
        const message = await parseApiError(res, 'Error al procesar la reserva.');
        throw new Error(message);
      }

      setSuccessMsg(t('booking.bookingSuccess'));
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 800);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Error de conexión con el servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/8 animate-fade-up delay-150 lg:sticky lg:top-28">
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-slate-900">
          ${Number(pricePerHour).toFixed(0)}
          <span className="text-sm font-normal text-slate-500"> {t('spaces.perHour')}</span>
        </p>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          {t('booking.available')}
        </span>
      </div>

      {errorMsg && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <label
          htmlFor="booking-date"
          className="text-xs font-bold uppercase tracking-wider text-slate-500"
        >
          {t('booking.selectDate')}
        </label>
        <span className="text-xs text-slate-400">{t('booking.maxAnticipation')}</span>
      </div>
      <input
        id="booking-date"
        type="date"
        value={selectedDate}
        min={todayBogota}
        max={maxDate}
        onChange={(e) => handleDateChange(e.target.value)}
        className="mt-2 flex min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-sky-500"
      />

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {t('booking.startHour')}
        </p>
        <p className="text-xs text-slate-400">{t('booking.operatingWindow')}</p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {OPERATING_HOURS.map((h) => {
          const disabled = isHourDisabled(h);
          return (
            <button
              key={h}
              type="button"
              disabled={disabled}
              onClick={() => {
                setStartHour(h);
                if (h + duration > 21) setDuration(21 - h);
              }}
              className={`rounded-xl py-2.5 text-xs font-semibold transition ${
                startHour === h
                  ? 'bg-sky-600 text-white shadow-sm'
                  : disabled
                  ? 'cursor-not-allowed bg-slate-50 text-slate-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {String(h).padStart(2, '0')}:00
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {t('booking.duration')}
        </p>
        <p className="text-xs text-slate-400">{t('booking.durationRange')}</p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((d) => {
          const disabled = startHour + d > 21;
          return (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => setDuration(d)}
              className={`rounded-xl py-2 text-xs font-semibold transition ${
                duration === d
                  ? 'bg-sky-600 text-white shadow-sm'
                  : disabled
                  ? 'cursor-not-allowed bg-slate-50 text-slate-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d} {d === 1 ? t('booking.hour') : t('booking.hours')}
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-4">
        <div className="flex justify-between text-sm text-slate-500">
          <span>{t('booking.timeSlot')}</span>
          <span className="font-semibold text-slate-800">
            {String(startHour).padStart(2, '0')}:00 a{' '}
            {String(endHour).padStart(2, '0')}:00 ({duration}h)
          </span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-slate-500">
          <span>
            {duration}h × ${Number(pricePerHour).toFixed(2)}
          </span>
          <span>${total.toFixed(2)}</span>
        </div>
        <div className="my-3 h-px bg-slate-200" />
        <div className="flex justify-between font-bold text-slate-900">
          <span>{t('booking.total')}</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
          <Clock size={13} className="shrink-0 text-sky-600" />
          Huso horario oficial America/Bogota (UTC-5).
        </p>
      </div>

      <button
        type="button"
        onClick={handleBooking}
        disabled={loading || isHourDisabled(startHour)}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 font-semibold text-white shadow-lg shadow-sky-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-700 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? (
          <>
            <Spinner size={18} />
            <span>{t('booking.confirming')}</span>
          </>
        ) : (
          t('booking.confirmButton')
        )}
      </button>
    </aside>
  );
}
