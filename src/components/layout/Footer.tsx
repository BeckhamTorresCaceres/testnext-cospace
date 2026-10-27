'use client';

import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { useTranslation } from '@/core/i18n';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200 bg-white px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <Building2 size={20} className="text-sky-600" />
          <span>CoSpace</span>
        </Link>
        <p className="text-sm text-slate-400">
          {t('footer.tagline')}
        </p>
        <div className="flex gap-5 text-sm font-medium text-slate-500">
          <span className="cursor-pointer hover:text-slate-800">{t('footer.privacy')}</span>
          <span className="cursor-pointer hover:text-slate-800">{t('footer.legal')}</span>
          <span className="cursor-pointer hover:text-slate-800">{t('footer.support')}</span>
        </div>
      </div>
    </footer>
  );
}
