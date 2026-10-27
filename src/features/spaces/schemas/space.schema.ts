import { z } from 'zod';

export const spaceTypeEnum = z.enum(['DESK', 'MEETING_ROOM', 'BOOTH'] as const, {
  message: 'El tipo de espacio debe ser DESK, MEETING_ROOM o BOOTH.',
});

export const createSpaceSchema = z.object({
  name: z
    .string({ message: 'El nombre del espacio es requerido.' })
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(100, 'El nombre no puede exceder 100 caracteres.'),
  description: z
    .string({ message: 'La descripción es requerida.' })
    .trim()
    .min(10, 'La descripción debe tener al menos 10 caracteres.'),
  type: spaceTypeEnum,
  capacity: z
    .number({ message: 'La capacidad es requerida.' })
    .int('La capacidad debe ser un número entero.')
    .min(1, 'La capacidad mínima es de 1 persona.')
    .max(200, 'La capacidad máxima es de 200 personas.'),
  pricePerHour: z
    .number({ message: 'El precio por hora es requerido.' })
    .positive('La tarifa por hora debe ser un valor positivo.')
    .max(10000000, 'El precio excede el límite permitido.'),
  imageUrl: z
    .string({ message: 'La URL de la imagen es requerida.' })
    .trim()
    .url('La URL de la imagen debe ser un enlace válido.')
    .max(500, 'La URL no puede exceder 500 caracteres.'),
});

export const updateSpaceSchema = createSpaceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const spaceFilterSchema = z.object({
  type: spaceTypeEnum.optional(),
  minCapacity: z.coerce.number().int().positive().optional(),
});

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
export type UpdateSpaceInput = z.infer<typeof updateSpaceSchema>;
export type SpaceFilterInput = z.infer<typeof spaceFilterSchema>;
