'use client';

import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { useTranslation } from '@/core/i18n';

export function LocalTimeBanner({
  label,
}: {
  label?: string;
}) {
  const { t } = useTranslation();
  const [bogotaTime, setBogotaTime] = useState<string | null>(null);
  const [localTime, setLocalTime] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setBogotaTime(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Bogota',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(now)
      );
      setLocalTime(
        new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(now)
      );
    };
    updateTime();
    const interval = window.setInterval(updateTime, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-xl backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label || `${t('localBanner.hqLabel')} (America/Bogota)`}
      </p>
      <div className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-900">
        <Clock3 size={19} className="text-sky-600" />
        <span>{bogotaTime ?? '--:--'} UTC-5</span>
        {localTime && bogotaTime && localTime !== bogotaTime && (
          <span className="text-xs font-normal text-slate-500">
            ({t('localBanner.userLabel')}: {localTime})
          </span>
        )}
      </div>
    </div>
  );
}
