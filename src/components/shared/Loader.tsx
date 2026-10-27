'use client';

import { Building2 } from 'lucide-react';

export function Spinner({
  size = 18,
  className = 'text-current',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
       aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function PageLoader({
  label = 'Preparando tu espacio...',
  fullScreen = false,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-5 ${
        fullScreen ? 'min-h-screen' : 'min-h-[55vh]'
      } animate-fade-in`}
      role="status"
      aria-live="polite"
    >
      <div className="relative grid size-20 place-items-center">
        {/* Anillo exterior giratorio */}
        <span className="absolute inset-0 animate-spin rounded-3xl border-[3px] border-sky-100 border-t-sky-600" />
        {/* Pulso suave intermedio */}
        <span className="absolute inset-2 animate-pulse rounded-2xl bg-sky-50" />
        {/* Icono central CoSpace */}
        <span className="relative grid size-11 place-items-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/30">
          <Building2 size={22} />
        </span>
      </div>

      <p className="mt-5 text-sm font-semibold tracking-tight text-slate-700">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="size-1.5 animate-bounce rounded-full bg-sky-600 [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-sky-600 [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-sky-600" />
      </div>
    </div>
  );
}

export function SpaceCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-sm">
      <div className="h-60 w-full animate-shimmer" />
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="h-6 w-2/3 rounded-lg animate-shimmer" />
          <div className="h-6 w-16 rounded-lg animate-shimmer" />
        </div>
        <div className="h-4 w-1/3 rounded-lg animate-shimmer" />
        <div className="h-4 w-full rounded-lg animate-shimmer" />
        <div className="mt-4 h-11 w-full rounded-xl animate-shimmer" />
      </div>
    </div>
  );
}

