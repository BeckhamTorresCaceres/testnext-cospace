'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  Upload,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Portal } from '@/components/shared/Portal';
import { Spinner } from '@/components/shared/Loader';
import { useTranslation } from '@/core/i18n';
import { fetchWithAuth, parseApiError } from '@/lib/api';
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

type UploadStage = 'idle' | 'presigning' | 'uploading' | 'compressing' | 'ready' | 'error';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);
const POLL_INTERVAL_MS = 800;
const MAX_POLL_ATTEMPTS = 25;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function SpaceFormModal(props: SpaceFormModalProps) {
  if (!props.isOpen) return null;

  return (
    <Portal>
      <SpaceFormDialogBody
        key={props.editingSpace?.id ?? 'create'}
        {...props}
      />
    </Portal>
  );
}

function SpaceFormDialogBody({
  editingSpace,
  formState,
  setFormState,
  formError,
  saving,
  onClose,
  onSubmit,
}: SpaceFormModalProps) {
  const { t, locale } = useTranslation();

  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [originalBytes, setOriginalBytes] = useState<number | null>(null);
  const [compressedBytes, setCompressedBytes] = useState<number | null>(null);
  const [pendingOptimizedKey, setPendingOptimizedKey] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadRunIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const pollOptimizedImage = async (
    optimizedKey: string,
    runId: number
  ): Promise<boolean> => {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      if (!isMountedRef.current || uploadRunIdRef.current !== runId) {
        return false;
      }

      const statusRes = await fetchWithAuth(
        `/api/uploads/status?key=${encodeURIComponent(optimizedKey)}`
      );

      if (!statusRes.ok) {
        const msg = await parseApiError(
          statusRes,
          locale === 'en'
            ? 'Could not verify compressed image status.'
            : 'No se pudo verificar el estado de la imagen comprimida.'
        );
        throw new Error(msg);
      }

      const statusData = (await statusRes.json()) as {
        ready: boolean;
        url: string;
        contentLength: number | null;
      };

      if (statusData.ready) {
        if (!isMountedRef.current || uploadRunIdRef.current !== runId) {
          return false;
        }
        setFormState((prev) => ({ ...prev, imageUrl: statusData.url }));
        setCompressedBytes(statusData.contentLength);
        setPendingOptimizedKey(null);
        setUploadStage('ready');
        return true;
      }

      await sleep(POLL_INTERVAL_MS);
    }

    return false;
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      setUploadStage('error');
      setUploadError(
        locale === 'en'
          ? 'Unsupported format. Please upload JPG, PNG, WebP, or AVIF.'
          : 'Formato no soportado. Usa JPG, PNG, WebP o AVIF.'
      );
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setUploadStage('error');
      setUploadError(
        locale === 'en'
          ? 'Image exceeds the 10 MB maximum size.'
          : 'La imagen supera el tamaño máximo de 10 MB.'
      );
      return;
    }

    const runId = uploadRunIdRef.current + 1;
    uploadRunIdRef.current = runId;

    const previewObjectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(previewObjectUrl);
    setOriginalBytes(file.size);
    setCompressedBytes(null);
    setPendingOptimizedKey(null);
    setUploadStage('presigning');

    try {
      const presignRes = await fetchWithAuth('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!presignRes.ok) {
        const msg = await parseApiError(
          presignRes,
          locale === 'en'
            ? 'Could not generate S3 upload URL.'
            : 'No se pudo generar la URL de subida a S3.'
        );
        throw new Error(msg);
      }

      const { uploadUrl, optimizedKey } = (await presignRes.json()) as {
        uploadUrl: string;
        optimizedKey: string;
      };

      if (!isMountedRef.current || uploadRunIdRef.current !== runId) return;
      setPendingOptimizedKey(optimizedKey);
      setUploadStage('uploading');

      let s3PutRes: Response;
      try {
        s3PutRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });
      } catch {
        throw new Error(
          locale === 'en'
            ? 'Network or CORS error uploading directly to S3. Check the bucket CORS configuration.'
            : 'Error de red o CORS al subir directo a S3. Revisa la configuración CORS del bucket.'
        );
      }

      if (!s3PutRes.ok) {
        throw new Error(
          locale === 'en'
            ? `S3 rejected the upload (HTTP ${s3PutRes.status}).`
            : `S3 rechazó la subida (HTTP ${s3PutRes.status}).`
        );
      }

      if (!isMountedRef.current || uploadRunIdRef.current !== runId) return;
      setUploadStage('compressing');

      const ready = await pollOptimizedImage(optimizedKey, runId);
      if (!ready && isMountedRef.current && uploadRunIdRef.current === runId) {
        setUploadStage('error');
        setUploadError(
          locale === 'en'
            ? 'The file was uploaded to S3 (raw/), but the Lambda compressed output in spaces/ is not ready yet. Check your Lambda trigger or retry verification.'
            : 'La imagen subió a S3 (raw/), pero la Lambda aún no genera el archivo comprimido en spaces/. Verifica el trigger de Lambda o reintenta.'
        );
      }
    } catch (err) {
      if (!isMountedRef.current || uploadRunIdRef.current !== runId) return;
      setUploadStage('error');
      setUploadError(
        err instanceof Error
          ? err.message
          : locale === 'en'
          ? 'Unexpected error uploading image.'
          : 'Error inesperado al subir la imagen.'
      );
    }
  };

  const handleRetryStatus = async () => {
    if (!pendingOptimizedKey) return;
    const runId = uploadRunIdRef.current + 1;
    uploadRunIdRef.current = runId;
    setUploadError(null);
    setUploadStage('compressing');

    try {
      const ready = await pollOptimizedImage(pendingOptimizedKey, runId);
      if (!ready && isMountedRef.current && uploadRunIdRef.current === runId) {
        setUploadStage('error');
        setUploadError(
          locale === 'en'
            ? 'Still waiting for the compressed image in spaces/. Please check Lambda logs.'
            : 'La imagen comprimida aún no aparece en spaces/. Revisa los logs de la Lambda.'
        );
      }
    } catch (err) {
      if (!isMountedRef.current || uploadRunIdRef.current !== runId) return;
      setUploadStage('error');
      setUploadError(
        err instanceof Error
          ? err.message
          : locale === 'en'
          ? 'Could not verify compressed image status.'
          : 'No se pudo verificar el estado de la imagen comprimida.'
      );
    }
  };

  const isUploading =
    uploadStage === 'presigning' ||
    uploadStage === 'uploading' ||
    uploadStage === 'compressing';

  const previewUrl =
    localPreviewUrl ||
    (formState.imageUrl && formState.imageUrl.startsWith('http')
      ? formState.imageUrl
      : null);

  const savingsPct =
    originalBytes && compressedBytes && compressedBytes < originalBytes
      ? Math.round(((originalBytes - compressedBytes) / originalBytes) * 100)
      : null;

  return (
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

            {/* Subida directa a S3 + compresión Lambda, o URL manual */}
            <div className="space-y-3">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                <ImageIcon size={13} className="text-sky-600" />
                <span>
                  {locale === 'en'
                    ? 'Space Photograph (S3 Upload or URL)'
                    : 'Fotografía del espacio (Subir a S3 o URL)'}
                </span>
              </label>

              {/* Dropzone para Presigned Upload a S3 */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isUploading) setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (isUploading) return;
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (droppedFile) {
                    void handleFileUpload(droppedFile);
                  }
                }}
                onClick={() => {
                  if (!isUploading) fileInputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isUploading) {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition ${
                  isDragging
                    ? 'border-sky-500 bg-sky-50'
                    : isUploading
                    ? 'cursor-wait border-sky-300 bg-sky-50/50'
                    : 'border-slate-200 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={isUploading}
                  className="hidden"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    e.target.value = '';
                    if (selectedFile) {
                      void handleFileUpload(selectedFile);
                    }
                  }}
                />

                {isUploading ? (
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-sky-700">
                    <Spinner size={16} />
                    <span>
                      {uploadStage === 'presigning'
                        ? locale === 'en'
                          ? 'Requesting secure S3 upload URL...'
                          : 'Preparando subida segura a S3...'
                        : uploadStage === 'uploading'
                        ? locale === 'en'
                          ? 'Uploading original image to S3...'
                          : 'Subiendo imagen original a S3...'
                        : locale === 'en'
                        ? 'Compressing image with AWS Lambda...'
                        : 'Comprimiendo imagen con AWS Lambda...'}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <div className="grid size-9 place-items-center rounded-xl bg-white text-sky-600 shadow-sm">
                      <Upload size={16} />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      {locale === 'en'
                        ? 'Click or drag an image here to upload & compress'
                        : 'Haz clic o arrastra una imagen aquí para subir y comprimir'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      JPG, PNG, WebP o AVIF (máx. 10 MB)
                    </p>
                  </div>
                )}
              </div>

              {uploadStage === 'ready' && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    {locale === 'en'
                      ? 'Compressed image ready in S3'
                      : 'Imagen comprimida lista en S3'}
                  </span>
                  {originalBytes !== null && compressedBytes !== null && (
                    <span className="text-[11px] font-medium text-emerald-800">
                      {formatBytes(originalBytes)} → {formatBytes(compressedBytes)}
                      {savingsPct !== null && savingsPct > 0 ? ` (-${savingsPct}%)` : ''}
                    </span>
                  )}
                </div>
              )}

              {uploadStage === 'error' && uploadError && (
                <div className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                  {pendingOptimizedKey && (
                    <button
                      type="button"
                      onClick={() => void handleRetryStatus()}
                      className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800 transition hover:bg-rose-200"
                    >
                      <RefreshCw size={12} />
                      <span>
                        {locale === 'en'
                          ? 'Retry verification'
                          : 'Reintentar verificación'}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Campo URLeditable (se autorellena con la imagen comprimida o permite URL externa) */}
              <input
                type="url"
                required
                value={formState.imageUrl}
                onChange={(e) => {
                  setFormState({ ...formState, imageUrl: e.target.value });
                  if (localPreviewUrl) {
                    setLocalPreviewUrl(null);
                  }
                }}
                placeholder="https://..."
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-medium text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />

              {previewUrl && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-700">
                      {locale === 'en'
                        ? 'Image preview'
                        : 'Vista previa de imagen'}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {formState.imageUrl || previewUrl}
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
                disabled={saving || isUploading}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 text-sm font-semibold text-white shadow-lg shadow-sky-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Spinner size={16} />
                    <span>{locale === 'en' ? 'Saving...' : 'Guardando...'}</span>
                  </>
                ) : isUploading ? (
                  <>
                    <Spinner size={16} />
                    <span>
                      {locale === 'en' ? 'Processing image...' : 'Procesando imagen...'}
                    </span>
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
  );
}
