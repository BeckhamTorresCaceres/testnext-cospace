'use client';

import React from 'react';
import Image from 'next/image';
import {
  X,
  Building2,
  LayoutDashboard,
  DoorOpen,
  Users,
  DollarSign,
  ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { Portal } from '@/components/shared/Portal';
import { Spinner } from '@/components/shared/Loader';
import { useTranslation } from '@/core/i18n';
import type { SpaceItem, SpaceFormState } from '../types';

interface SpaceFormModalProps {
  isOpen: boolean;
  editingSpace: SpaceItem | null;
  formState: SpaceFormState & { isActive?: boolean };
  setFormState: React.Dispatch<
    React.SetStateAction<SpaceFormState & { isActive?: boolean }>
  >;
  formError: string | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function SpaceFormModal({
  isOpen,
  editingSpace,
  formState,
  setFormState,
  formError,
  saving,
  onClose,
  onSubmit,
}: SpaceFormModalProps) {
  const { t, locale } = useTranslation();

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <div className="flex min-h-full items-center justify-center py-6">
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-sky-50 text-sky-600">
                  <Building2 size={22} />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
                    {editingSpace
                      ? locale === 'en'
                        ? 'Catalog Update'
                        : 'Actualización de Catálogo'
                      : locale === 'en'
                      ? 'Catalog Expansion'
                      : 'Nuevo Registro'}
                  </span>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {editingSpace
                      ? locale === 'en'
                        ? `Edit ${editingSpace.name}`
                        : `Editar ${editingSpace.name}`
                      : locale === 'en'
                      ? 'Create New Space'
                      : 'Crear Nuevo Espacio'}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              {/* Nombre */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  {locale === 'en' ? 'Space Name' : 'Nombre del espacio'}
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={100}
                  value={formState.name}
                  onChange={(e) =>
                    setFormState({ ...formState, name: e.target.value })
                  }
                  placeholder="Ej. Sala Copenhague"
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              {/* Selector interactivo de categoría */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  {locale === 'en' ? 'Category' : 'Categoría del Espacio'}
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      {
                        type: 'DESK',
                        icon: LayoutDashboard,
                        label: t('spaceTypes.DESK'),
                      },
                      {
                        type: 'MEETING_ROOM',
                        icon: Users,
                        label: t('spaceTypes.MEETING_ROOM'),
                      },
                      {
                        type: 'BOOTH',
                        icon: DoorOpen,
                        label: t('spaceTypes.BOOTH'),
                      },
                    ] as const
                  ).map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = formState.type === cat.type;
                    return (
                      <button
                        key={cat.type}
                        type="button"
                        onClick={() =>
                          setFormState({
                            ...formState,
                            type: cat.type as 'DESK' | 'MEETING_ROOM' | 'BOOTH',
                          })
                        }
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center transition-all ${
                          isSelected
                            ? 'border-sky-600 bg-sky-50/80 text-sky-700 shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100/70'
                        }`}
                      >
                        <Icon
                          size={18}
                          className={isSelected ? 'text-sky-600' : 'text-slate-400'}
                        />
                        <span className="text-xs font-semibold leading-tight">
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Capacidad y Precio en 2 columnas */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <Users size={13} className="text-sky-600" />
                    <span>{locale === 'en' ? 'Capacity' : 'Capacidad'}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1}
                      max={200}
                      value={formState.capacity}
                      onChange={(e) =>
                        setFormState({ ...formState, capacity: e.target.value })
                      }
                      className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    />
                    <span className="pointer-events-none absolute right-3.5 top-3.5 text-xs font-medium text-slate-400">
                      pers.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <DollarSign size={13} className="text-sky-600" />
                    <span>
                      {locale === 'en' ? 'Price / Hour ($)' : 'Precio / Hora ($)'}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1}
                      step="0.01"
                      value={formState.pricePerHour}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          pricePerHour: e.target.value,
                        })
                      }
                      className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    />
                    <span className="pointer-events-none absolute right-3.5 top-3.5 text-xs font-medium text-slate-400">
                      /h
                    </span>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  {locale === 'en'
                    ? 'Description (min. 10 chars)'
                    : 'Descripción (mín. 10 caracteres)'}
                </label>
                <textarea
                  required
                  minLength={10}
                  rows={3}
                  value={formState.description}
                  onChange={(e) =>
                    setFormState({ ...formState, description: e.target.value })
                  }
                  placeholder={
                    locale === 'en'
                      ? 'Describe equipment, lighting, and ambience...'
                      : 'Describe el equipamiento, iluminación y ambiente del espacio...'
                  }
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              {/* URL de fotografía y Preview instantáneo */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <ImageIcon size={13} className="text-sky-600" />
                  <span>
                    {locale === 'en'
                      ? 'Photo URL (Unsplash)'
                      : 'URL de fotografía (Unsplash)'}
                  </span>
                </label>
                <input
                  type="url"
                  required
                  value={formState.imageUrl}
                  onChange={(e) =>
                    setFormState({ ...formState, imageUrl: e.target.value })
                  }
                  placeholder="https://images.unsplash.com/photo-..."
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />

                {formState.imageUrl && formState.imageUrl.startsWith('http') && (
                  <div className="mt-2.5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                      <Image
                        src={formState.imageUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-700">
                        {locale === 'en'
                          ? 'Real-time image preview'
                          : 'Vista previa de imagen'}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {formState.imageUrl}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Estado de activación en edición */}
              {editingSpace && typeof formState.isActive === 'boolean' && (
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {locale === 'en' ? 'Space Visibility' : 'Visibilidad del espacio'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formState.isActive
                        ? locale === 'en'
                          ? 'Visible in public catalog'
                          : 'Visible en catálogo público'
                        : locale === 'en'
                        ? 'Hidden from public catalog'
                        : 'Oculto en catálogo público'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormState({
                        ...formState,
                        isActive: !formState.isActive,
                      })
                    }
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                      formState.isActive
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    <span>
                      {formState.isActive
                        ? locale === 'en'
                          ? 'Active'
                          : 'Activo'
                        : locale === 'en'
                        ? 'Inactive'
                        : 'Inactivo'}
                    </span>
                  </button>
                </div>
              )}

              {/* Botones de acción */}
              <div className="mt-8 flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-12 flex-1 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  {locale === 'en' ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 text-sm font-semibold text-white shadow-lg shadow-sky-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Spinner size={16} />
                      <span>{locale === 'en' ? 'Saving...' : 'Guardando...'}</span>
                    </>
                  ) : editingSpace ? (
                    locale === 'en' ? 'Save Changes' : 'Guardar cambios'
                  ) : locale === 'en' ? (
                    'Create Space'
                  ) : (
                    'Crear espacio'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
}
