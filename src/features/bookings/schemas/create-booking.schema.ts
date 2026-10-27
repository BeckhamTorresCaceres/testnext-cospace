import { z } from 'zod';

export const createBookingSchema = z.object({
  spaceId: z
    .string({ message: 'El identificador del espacio es requerido.' })
    .uuid('El identificador del espacio debe ser un UUID válido.'),
  startTime: z
    .string({ message: 'La fecha y hora de inicio es requerida.' })
    .datetime({ message: 'La fecha de inicio debe tener formato ISO 8601 válido.' }),
  endTime: z
    .string({ message: 'La fecha y hora de fin es requerida.' })
    .datetime({ message: 'La fecha de fin debe tener formato ISO 8601 válido.' }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
