'use client';

import { AlertTriangle } from 'lucide-react';
import { Portal } from '@/components/shared/Portal';
import { useTranslation } from '@/core/i18n';
import type { SpaceItem } from '../types';

interface SpaceDeactivateDialogProps {
  space: SpaceItem | null;
  deactivating: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function SpaceDeactivateDialog({
  space,
  deactivating,
  error,
  onClose,
  onConfirm,
}: SpaceDeactivateDialogProps) {
  const { locale } = useTranslation();

  if (!space) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <div className="flex min-h-full items-center justify-center py-6">
          <div
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <AlertTriangle />
            </span>
            <h2 className="mt-5 text-xl font-bold text-slate-900">
              {locale === 'en'
                ? `Deactivate ${space.name}?`
                : `¿Desactivar ${space.name}?`}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {locale === 'en'
                ? 'This space will be hidden from the public catalog (RN-12). Only allowed if there are no future confirmed bookings (RN-13).'
                : 'El espacio no aparecerá en el catálogo público (RN-12). La operación solo se permite si no existen reservas futuras confirmadas (RN-13).'}
            </p>
            {error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 flex-1 rounded-xl bg-slate-100 font-semibold text-slate-700 hover:bg-slate-200"
              >
                {locale === 'en' ? 'Back' : 'Volver'}
              </button>
              <button
                type="button"
                disabled={deactivating}
                onClick={onConfirm}
                className="min-h-11 flex-1 rounded-xl bg-rose-600 font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deactivating
                  ? locale === 'en'
                    ? 'Checking...'
                    : 'Verificando...'
                  : locale === 'en'
                  ? 'Deactivate'
                  : 'Desactivar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
