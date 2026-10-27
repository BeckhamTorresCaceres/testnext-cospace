'use client';

import Image from 'next/image';
import { Search, Pencil, CheckCircle2 } from 'lucide-react';
import { PageLoader, Spinner } from '@/components/shared/Loader';
import { useTranslation } from '@/core/i18n';
import type { SpaceItem } from '../types';

interface AdminSpacesSectionProps {
  spaces: SpaceItem[];
  search: string;
  onSearchChange: (search: string) => void;
  loading: boolean;
  activatingId: string | null;
  onOpenEdit: (space: SpaceItem) => void;
  onOpenDeactivate: (space: SpaceItem) => void;
  onActivate: (spaceId: string) => void;
}

export function AdminSpacesSection({
  spaces,
  search,
  onSearchChange,
  loading,
  activatingId,
  onOpenEdit,
  onOpenDeactivate,
  onActivate,
}: AdminSpacesSectionProps) {
  const { t, locale } = useTranslation();

  const filteredSpaces = spaces.filter((s) => {
    const label = t(`spaceTypes.${s.type}`) || s.type;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      label.toLowerCase().includes(q) ||
      s.type.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Buscador de espacios */}
      <div className="mt-6 flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
        <Search size={18} className="text-slate-400" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-transparent text-sm outline-none"
          placeholder={
            locale === 'en'
              ? 'Search space by name or category...'
              : 'Buscar espacio por nombre o categoría (Escritorio, Sala, Cabina)...'
          }
        />
      </div>

      {/* Tabla / Lista de Espacios */}
      <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <PageLoader
            label={
              locale === 'en'
                ? 'Loading spaces and bookings...'
                : 'Cargando espacios y reservas...'
            }
          />
        ) : filteredSpaces.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            {t('spaces.noSpaces')}
          </div>
        ) : (
          filteredSpaces.map((space) => (
            <div
              key={space.id}
              className="grid gap-4 border-b border-slate-100 p-5 transition hover:bg-slate-50/70 last:border-0 md:grid-cols-[2fr_1fr_.7fr_.8fr_.8fr_auto] md:items-center md:px-6"
            >
              <div className="flex items-center gap-3.5">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl">
                  <Image
                    src={space.imageUrl}
                    alt={space.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <span className="block font-bold text-slate-900">
                    {space.name}
                  </span>
                  <span className="line-clamp-1 text-xs text-slate-400">
                    {space.description}
                  </span>
                </div>
              </div>

              <span className="text-sm font-medium text-slate-600">
                {t(`spaceTypes.${space.type}`) || space.type}
              </span>

              <span className="text-sm text-slate-700">
                {space.capacity}{' '}
                {space.capacity === 1 ? t('spaces.person') : t('spaces.people')}
              </span>

              <span className="text-sm font-bold text-slate-900">
                ${Number(space.pricePerHour).toFixed(2)}
                {t('spaces.perHour')}
              </span>

              <span
                className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                  space.isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                ●{' '}
                {space.isActive
                  ? locale === 'en'
                    ? 'Active'
                    : 'Activo'
                  : locale === 'en'
                  ? 'Inactive'
                  : 'Inactivo'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenEdit(space)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                >
                  <Pencil size={13} /> {locale === 'en' ? 'Edit' : 'Editar'}
                </button>

                {space.isActive ? (
                  <button
                    type="button"
                    onClick={() => onOpenDeactivate(space)}
                    className="min-h-9 rounded-xl border border-rose-200 px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    {locale === 'en' ? 'Deactivate' : 'Desactivar'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={activatingId === space.id}
                    onClick={() => onActivate(space.id)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {activatingId === space.id ? (
                      <>
                        <Spinner size={12} className="text-emerald-700" />
                        <span>{locale === 'en' ? 'Activating...' : 'Activando...'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>{locale === 'en' ? 'Activate' : 'Activar'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
