'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Wifi, MonitorUp, Coffee, Users, ShieldCheck, Clock3 } from 'lucide-react';
import { BookingWidget } from './BookingWidget';
import { useTranslation } from '@/core/i18n';

export interface SpaceDetailData {
  id: string;
  name: string;
  type: string;
  description: string;
  capacity: number;
  pricePerHour: number;
  imageUrl: string;
  isActive: boolean;
}

export function SpaceDetailClientView({ spaceDetail }: { spaceDetail: SpaceDetailData | null }) {
  const { t } = useTranslation();

  if (!spaceDetail) {
    return (
      <section className="mx-auto max-w-4xl px-5 pb-24 pt-36 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            {t('spaces.noSpaces')}
          </h1>
          <Link
            href="/spaces"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            <ArrowLeft size={16} /> {t('nav.spaces')}
          </Link>
        </div>
      </section>
    );
  }

  const typeLabel = t(`spaceTypes.${spaceDetail.type}`) || spaceDetail.type;

  const amenities = [
    { icon: Wifi, label: 'WiFi (1 Gbps)' },
    { icon: MonitorUp, label: 'Display 4K' },
    { icon: Coffee, label: 'Coffee' },
    {
      icon: Users,
      label: `${t('spaces.upTo')} ${spaceDetail.capacity} ${
        spaceDetail.capacity === 1 ? t('spaces.person') : t('spaces.people')
      }`,
    },
    { icon: ShieldCheck, label: 'Digital Access' },
    { icon: Clock3, label: '07:00 - 21:00 (UTC-5)' },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-32">
      <Link
        href="/spaces"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft size={17} /> {t('nav.spaces')}
      </Link>

      <div className="relative h-[340px] w-full overflow-hidden rounded-[32px] sm:h-[460px]">
        <Image
          src={spaceDetail.imageUrl}
          alt={spaceDetail.name}
          fill
          priority
          className="object-cover"
        />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
              {typeLabel}
            </span>
            {!spaceDetail.isActive && (
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                Inactive (Admin Only)
              </span>
            )}
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
            {spaceDetail.name}
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-slate-600">
            {spaceDetail.description}
          </p>

          <h2 className="mt-10 text-xl font-bold text-slate-900">Amenities</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {amenities.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <Icon size={20} className="text-sky-600" />
                  <p className="mt-3 text-sm font-medium text-slate-800">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <BookingWidget spaceId={spaceDetail.id} pricePerHour={spaceDetail.pricePerHour} />
      </div>
    </section>
  );
}
