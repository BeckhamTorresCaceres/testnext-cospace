'use client';

import { Building2, CalendarCheck2, Plus } from 'lucide-react';
import { LocalTimeBanner } from '@/components/shared/LocalTimeBanner';
import { useTranslation } from '@/core/i18n';
import type { AdminSection } from '../types';

interface AdminHeaderProps {
  spacesCount: number;
  activeSpacesCount: number;
  futureConfirmedCount: number;
  confirmedRevenue: number;
  activeSection: AdminSection;
  onSelectSection: (section: AdminSection) => void;
  onOpenCreateSpace: () => void;
}

export function AdminHeader({
  spacesCount,
  activeSpacesCount,
  futureConfirmedCount,
  confirmedRevenue,
  activeSection,
  onSelectSection,
  onOpenCreateSpace,
}: AdminHeaderProps) {
  const { t, locale } = useTranslation();

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-sky-600">
            {t('nav.admin')}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
            {locale === 'en' ? 'Spaces & Bookings Management' : 'Gestión de Espacios y Reservas'}
          </h1>
          <p className="mt-2 text-slate-500">
            {locale === 'en'
              ? 'Manage the coworking space catalog and oversee all user bookings.'
              : 'Administra el catálogo de espacios de coworking y supervisa las reservas de todos los usuarios.'}
          </p>
        </div>

        <LocalTimeBanner />
      </div>

      {/* Métricas ejecutivas */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-3xl font-bold text-sky-600">
            {activeSpacesCount}{' '}
            <span className="text-lg font-semibold text-slate-400">
              / {spacesCount}
            </span>
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {locale === 'en' ? 'Active spaces in catalog' : 'Espacios activos en catálogo'}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-3xl font-bold text-emerald-600">
            {futureConfirmedCount}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {locale === 'en' ? 'Upcoming confirmed bookings' : 'Reservas futuras confirmadas'}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-3xl font-bold text-slate-900">
            ${confirmedRevenue.toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {locale === 'en' ? 'Confirmed revenue' : 'Facturación confirmada'}
          </p>
        </div>
      </div>

      {/* Pestañas para alternar entre Gestión de Espacios y Gestión de Reservas */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1.5 rounded-2xl bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => onSelectSection('SPACES')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeSection === 'SPACES'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 size={15} className="text-sky-600" />
            <span>
              {locale === 'en' ? `Spaces (${spacesCount})` : `Espacios (${spacesCount})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSection('BOOKINGS')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeSection === 'BOOKINGS'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck2 size={15} className="text-sky-600" />
            <span>
              {locale === 'en' ? 'Bookings' : 'Reservas'}
            </span>
          </button>
        </div>

        {activeSection === 'SPACES' && (
          <button
            type="button"
            onClick={onOpenCreateSpace}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            <Plus size={16} />
            <span>{locale === 'en' ? 'New Space' : 'Nuevo Espacio'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
