import { z } from 'zod';

export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MIME_TO_EXTENSION: Record<AllowedImageMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export const presignUploadSchema = z.object({
  fileName: z
    .string({ message: 'El nombre del archivo es requerido.' })
    .trim()
    .min(1, 'El nombre del archivo es requerido.')
    .max(255, 'El nombre del archivo es demasiado largo.'),
  contentType: z.enum(ALLOWED_IMAGE_TYPES, {
    message: 'Formato no soportado. Usa JPG, PNG, WebP o AVIF.',
  }),
  fileSize: z
    .number({ message: 'El tamaño del archivo es requerido.' })
    .int('El tamaño del archivo debe ser un entero en bytes.')
    .positive('El archivo no puede estar vacío.')
    .max(
      MAX_IMAGE_FILE_SIZE_BYTES,
      'La imagen supera el límite máximo permitido de 10 MB.'
    ),
});

export const uploadStatusQuerySchema = z.object({
  key: z
    .string({ message: 'La clave del objeto en S3 es requerida.' })
    .trim()
    .min(1, 'La clave del objeto en S3 es requerida.')
    .max(500, 'La clave del objeto es demasiado larga.'),
});

export type PresignUploadInput = z.infer<typeof presignUploadSchema>;
export type UploadStatusQueryInput = z.infer<typeof uploadStatusQuerySchema>;

