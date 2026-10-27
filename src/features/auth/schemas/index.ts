import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string({ message: 'El nombre es requerido.' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(120, 'El nombre no puede exceder 120 caracteres.'),
  email: z
    .string({ message: 'El correo electrónico es requerido.' })
    .trim()
    .toLowerCase()
    .email('El formato del correo electrónico no es válido.')
    .max(150, 'El correo no puede exceder 150 caracteres.'),
  password: z
    .string({ message: 'La contraseña es requerida.' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(100, 'La contraseña no puede exceder 100 caracteres.'),
});

export const loginSchema = z.object({
  email: z
    .string({ message: 'El correo electrónico es requerido.' })
    .trim()
    .toLowerCase()
    .email('El formato del correo electrónico no es válido.'),
  password: z
    .string({ message: 'La contraseña es requerida.' })
    .min(1, 'La contraseña es requerida.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
