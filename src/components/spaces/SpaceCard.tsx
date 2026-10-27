'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';
import { useTranslation } from '@/core/i18n';

export interface SpaceData {
  id: string;
  name: string;
  description?: string;
  type: 'DESK' | 'MEETING_ROOM' | 'BOOTH' | string;
  capacity: number;
  pricePerHour: number;
  imageUrl: string;
}

export function SpaceCard({ space }: { space: SpaceData }) {
  const { t } = useTranslation();
  const typeLabel = t(`spaceTypes.${space.type}`) || space.type;

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-sky-200 hover:shadow-xl hover:shadow-slate-900/10 animate-fade-up">
      <div className="relative h-60 w-full overflow-hidden">
        <Image
          src={space.imageUrl}
          alt={space.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur">
          {typeLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{space.name}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <Users size={14} className="inline text-slate-400" /> {t('spaces.upTo')}{' '}
                {space.capacity} {space.capacity === 1 ? t('spaces.person') : t('spaces.people')}
              </p>
            </div>
            <p className="shrink-0 text-lg font-bold text-slate-900">
              ${Number(space.pricePerHour).toFixed(0)}
              <span className="text-sm font-normal text-slate-500">{t('spaces.perHour')}</span>
            </p>
          </div>

          {space.description && (
            <p className="mt-3 line-clamp-2 text-sm text-slate-500">
              {space.description}
            </p>
          )}
        </div>

        <Link
          href={`/spaces/${space.id}`}
          className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-semibold text-slate-800 transition hover:bg-sky-600 hover:text-white"
        >
          {t('spaces.viewDetails')} <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}
