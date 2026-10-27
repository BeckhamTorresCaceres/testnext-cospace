'use client';

import { useTranslation } from '@/core/i18n';

interface DashboardStatsProps {
  upcomingCount: number;
  completedCount: number;
  totalSpent: number;
}

export function DashboardStats({
  upcomingCount,
  completedCount,
  totalSpent,
}: DashboardStatsProps) {
  const { t } = useTranslation();

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {/* Cuota RN-06 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-bold text-sky-600">
            {upcomingCount}{' '}
            <span className="text-lg font-semibold text-slate-400">/ 3</span>
          </p>
          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
            RN-06
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {t('dashboard.activeNotice', { count: upcomingCount })}
        </p>
      </div>

      {/* Historial */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-3xl font-bold text-emerald-600">
          {completedCount}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {t('dashboard.completed')}
        </p>
      </div>

      {/* Total invertido */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-3xl font-bold text-slate-900">
          ${totalSpent.toFixed(2)}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {t('dashboard.spent')}
        </p>
      </div>
    </div>
  );
}
