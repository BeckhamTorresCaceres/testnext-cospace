import { cookies } from 'next/headers';
import { UnauthorizedError, ForbiddenError } from '@/core/errors';
import { verifyAccessToken } from './jwt';
import { ACCESS_COOKIE_NAME } from './session.cookies';
import { TokenPayload } from '../types';

/**
 * Extrae y valida la sesión activa a partir de las cookies httpOnly
 */
export async function getAuthenticatedUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return await verifyAccessToken(token);
}

/**
 * Defensa en profundidad: Exige sesión activa obligatoria
 */
export async function requireAuth(): Promise<TokenPayload> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new UnauthorizedError('Debes iniciar sesión para acceder a este recurso.');
  }
  return user;
}

/**
 * Defensa en profundidad: Exige rol ADMIN
 */
export async function requireAdmin(): Promise<TokenPayload> {
  const user = await requireAuth();
  if (user.role !== 'ADMIN') {
    throw new ForbiddenError('Se requieren privilegios de Administrador para realizar esta operación.');
  }
  return user;
}
