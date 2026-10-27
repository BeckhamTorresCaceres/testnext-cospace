'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { LocalTimeBanner } from '@/components/shared/LocalTimeBanner';
import { PageLoader } from '@/components/shared/Loader';
import {
  fetchWithAuth,
  parseApiError,
  type UserSession,
} from '@/lib/api';
import { useTranslation } from '@/core/i18n';
import {
  BookingCard,
  BookingCancelModal,
  DashboardStats,
  BookingDetailModal,
  type BookingCardItem,
  type BookingDetailData,
} from '@/features/bookings';

type TabKey = 'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'ALL';

export default function DashboardPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [bookings, setBookings] = useState<BookingCardItem[]>([]);
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('UPCOMING');
  const [selectedBooking, setSelectedBooking] = useState<BookingDetailData | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<BookingCardItem | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [bookingsRes, meRes] = await Promise.all([
          fetchWithAuth('/api/bookings'),
          fetchWithAuth('/api/auth/me'),
        ]);

        if (!active) return;

        if (bookingsRes.status === 401) {
          router.push('/login?redirect=/dashboard');
          return;
        }

        if (meRes.ok) {
          const meData = await meRes.json();
          if (active) setUser(meData.user ?? null);
        }

        const data = await bookingsRes.json();
        if (active) {
          if (Array.isArray(data)) {
            setBookings(data);
          } else if (Array.isArray(data?.bookings)) {
            setBookings(data.bookings);
          }
        }
      } catch {
        if (active) setErrorMsg('No se pudieron cargar las reservas.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [router]);

  const confirmCancelBooking = async () => {
    if (!bookingToCancel) return;

    setCancellingId(bookingToCancel.id);
    setErrorMsg(null);

    try {
      const res = await fetchWithAuth(`/api/bookings/${bookingToCancel.id}/cancel`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        const message = await parseApiError(res, 'Error al cancelar la reserva');
        throw new Error(message);
      }
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingToCancel.id ? { ...b, status: 'CANCELLED' } : b))
      );
      setBookingToCancel(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado.');
      setBookingToCancel(null);
    } finally {
      setCancellingId(null);
    }
  };

  const upcomingBookings = bookings.filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.startTime).getTime() > nowMs
  );
  const completedBookings = bookings.filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.startTime).getTime() <= nowMs
  );
  const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED');

  const displayedBookings =
    activeTab === 'UPCOMING'
      ? upcomingBookings
      : activeTab === 'COMPLETED'
      ? completedBookings
      : activeTab === 'CANCELLED'
      ? cancelledBookings
      : bookings;

  const totalSpent = completedBookings.reduce(
    (acc, b) => acc + Number(b.totalPrice),
    0
  );

  const tabLabels: Record<TabKey, string> = {
    UPCOMING:
      locale === 'en'
        ? `Upcoming (${upcomingBookings.length})`
        : `Próximas (${upcomingBookings.length})`,
    COMPLETED:
      locale === 'en'
        ? `History (${completedBookings.length})`
        : `Historial (${completedBookings.length})`,
    CANCELLED:
      locale === 'en'
        ? `Cancelled (${cancelledBookings.length})`
        : `Canceladas (${cancelledBookings.length})`,
    ALL:
      locale === 'en'
        ? `All (${bookings.length})`
        : `Todas (${bookings.length})`,
  };

  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-36">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-sky-600 uppercase tracking-wider">
            {t('nav.myBookings')}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
            {t('dashboard.title')}
          </h1>
          <p className="mt-2 text-slate-500">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <LocalTimeBanner />
      </div>

      {errorMsg && (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Resumen de cuota y métricas */}
      <DashboardStats
        upcomingCount={upcomingBookings.length}
        completedCount={completedBookings.length}
        totalSpent={totalSpent}
      />

      {/* Barra de pestañas */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1 rounded-2xl bg-slate-200/70 p-1">
          {(['UPCOMING', 'COMPLETED', 'CANCELLED', 'ALL'] as TabKey[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                activeTab === tab
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        <Link
          href="/spaces"
          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700"
        >
          {t('dashboard.exploreCta')} <ArrowRight size={14} />
        </Link>
      </div>

      {/* Contenido / Listado de Reservas */}
      {loading ? (
        <PageLoader label="Cargando tus reservas..." />
      ) : displayedBookings.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-base font-semibold text-slate-700">
            {t('dashboard.noBookings')}
          </p>
          <Link
            href="/spaces"
            className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-600 px-5 text-xs font-semibold text-white transition hover:bg-sky-700"
          >
            {t('dashboard.exploreCta')} <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {displayedBookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              nowMs={nowMs}
              isAdmin={user?.role === 'ADMIN'}
              cancellingId={cancellingId}
              onOpenDetails={(item) => setSelectedBooking(item)}
              onRequestCancel={(item) => setBookingToCancel(item)}
            />
          ))}
        </div>
      )}

      {/* Modal de detalle completo de la reserva */}
      <BookingDetailModal
        booking={selectedBooking}
        isAdmin={user?.role === 'ADMIN'}
        onClose={() => setSelectedBooking(null)}
        onRequestCancel={(b) => setBookingToCancel(b as BookingCardItem)}
      />

      {/* Modal de confirmación de cancelación */}
      <BookingCancelModal
        booking={bookingToCancel}
        cancelling={Boolean(cancellingId)}
        onClose={() => setBookingToCancel(null)}
        onConfirm={confirmCancelBooking}
      />
    </section>
  );
}
