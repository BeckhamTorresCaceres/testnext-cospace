'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, ArrowRight, LayoutDashboard, Users, DoorOpen } from 'lucide-react';
import { LocalTimeBanner } from '@/components/shared/LocalTimeBanner';
import { useTranslation } from '@/core/i18n';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <section className="relative overflow-hidden bg-[#f8fafc] px-5 pb-20 pt-36 text-slate-900 md:pb-28 md:pt-44">
        <div className="pointer-events-none absolute left-1/2 top-28 size-[540px] rounded-full bg-sky-200/35 blur-3xl animate-float-slow" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 animate-fade-up">
              <Sparkles size={14} /> {t('home.badge')}
            </div>
            <h1 className="text-balance text-5xl font-bold leading-[1.02] tracking-[-0.045em] text-slate-900 sm:text-6xl lg:text-7xl animate-fade-up delay-75">
              {t('home.heroTitle1')}{' '}
              <span className="text-sky-600">{t('home.heroTitle2')}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-8 text-slate-600 animate-fade-up delay-150">
              {t('home.heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row animate-fade-up delay-225">
              <Link
                href="/spaces"
                className="group flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 font-semibold text-white shadow-xl shadow-sky-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-700 active:scale-[0.98]"
              >
                {t('home.exploreSpaces')}{' '}
                <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="relative mt-16 overflow-hidden rounded-[32px] border-[6px] border-white bg-white shadow-2xl shadow-slate-900/15 animate-fade-up delay-300">
            <div className="relative h-[320px] w-full sm:h-[480px]">
              <Image
                src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1400&q=85"
                alt="Espacio CoSpace"
                fill
                priority
                className="object-cover"
              />
            </div>
            <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 sm:inset-x-6 sm:bottom-6">
              <LocalTimeBanner />
              <div className="hidden rounded-2xl border border-white/60 bg-white/85 p-4 shadow-xl backdrop-blur-xl sm:block">
                <p className="text-sm font-semibold text-slate-900">{t('home.hubTitle')}</p>
                <p className="mt-1 text-xs text-emerald-700">{t('home.openHours')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-sky-600 uppercase tracking-widest">{t('home.findYourPlace')}</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {t('home.workYourWay')}
              </h2>
            </div>
            <Link
              href="/spaces"
              className="hidden items-center gap-1 text-sm font-semibold text-sky-700 sm:flex hover:underline"
            >
              {t('home.viewAll')} <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/spaces?type=DESK"
              className="group flex min-h-44 flex-col items-start justify-between rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left transition hover:-translate-y-1 hover:border-sky-200 hover:bg-sky-50"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-white text-sky-600 shadow-sm">
                <LayoutDashboard size={23} />
              </span>
              <span>
                <span className="block text-lg font-bold text-slate-900">{t('home.deskTitle')}</span>
                <span className="mt-1 block text-sm text-slate-500">{t('home.deskDesc')}</span>
              </span>
            </Link>

            <Link
              href="/spaces?type=MEETING_ROOM"
              className="group flex min-h-44 flex-col items-start justify-between rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left transition hover:-translate-y-1 hover:border-sky-200 hover:bg-sky-50"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-white text-sky-600 shadow-sm">
                <Users size={23} />
              </span>
              <span>
                <span className="block text-lg font-bold text-slate-900">{t('home.meetingTitle')}</span>
                <span className="mt-1 block text-sm text-slate-500">{t('home.meetingDesc')}</span>
              </span>
            </Link>

            <Link
              href="/spaces?type=BOOTH"
              className="group flex min-h-44 flex-col items-start justify-between rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left transition hover:-translate-y-1 hover:border-sky-200 hover:bg-sky-50"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-white text-sky-600 shadow-sm">
                <DoorOpen size={23} />
              </span>
              <span>
                <span className="block text-lg font-bold text-slate-900">{t('home.boothTitle')}</span>
                <span className="mt-1 block text-sm text-slate-500">{t('home.boothDesc')}</span>
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
