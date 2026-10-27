'use client';

import Link from 'next/link';
import { SpaceCard, type SpaceData } from './SpaceCard';
import { useTranslation } from '@/core/i18n';

interface SpacesCatalogViewProps {
  spaces: SpaceData[];
  currentType: string;
  currentCap: string;
}

export function SpacesCatalogView({ spaces, currentType, currentCap }: SpacesCatalogViewProps) {
  const { t } = useTranslation();

  const typeFilters = [
    { label: t('spaces.allTypes'), value: '' },
    { label: t('spaces.desks'), value: 'DESK' },
    { label: t('spaces.meetingRooms'), value: 'MEETING_ROOM' },
    { label: t('spaces.booths'), value: 'BOOTH' },
  ];

  const capacityFilters = [
    { label: t('spaces.allTypes'), value: '' },
    { label: `2+ ${t('spaces.people')}`, value: '2' },
    { label: `6+ ${t('spaces.people')}`, value: '6' },
    { label: `8+ ${t('spaces.people')}`, value: '8' },
  ];

  const buildFilterHref = (nextType: string, nextCap: string) => {
    const query = new URLSearchParams();
    if (nextType) query.set('type', nextType);
    if (nextCap) query.set('minCapacity', nextCap);
    const qs = query.toString();
    return qs ? `/spaces?${qs}` : '/spaces';
  };

  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-36">
      <div>
        <p className="text-sm font-semibold text-sky-600 uppercase tracking-widest">
          {t('spaces.title')}
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
          {t('spaces.subtitle')}
        </h1>
        <p className="mt-3 text-slate-500">
          07:00 - 21:00 (America/Bogota)
        </p>
      </div>

      {/* Filtros */}
      <div className="mt-8 flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          {typeFilters.map((f) => {
            const active = currentType === f.value;
            return (
              <Link
                key={f.value}
                href={buildFilterHref(f.value, currentCap)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {capacityFilters.map((c) => {
            const active = currentCap === c.value;
            return (
              <Link
                key={c.value}
                href={buildFilterHref(currentType, c.value)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {c.label}
              </Link>
            );
          })}
        </div>
      </div>

      {spaces.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-lg font-bold text-slate-800">
            {t('spaces.noSpaces')}
          </p>
          <Link
            href="/spaces"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-sky-600 px-5 text-xs font-semibold text-white transition hover:bg-sky-700"
          >
            {t('home.viewAll')}
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((space) => (
            <SpaceCard key={space.id} space={space} />
          ))}
        </div>
      )}
    </section>
  );
}
