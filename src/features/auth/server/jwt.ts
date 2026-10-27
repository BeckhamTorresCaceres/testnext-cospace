import { SignJWT, jwtVerify } from 'jose';
import { TokenPayload } from '../types';

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'cospace_access_secret_default_min_32_characters_key!'
);

const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'cospace_refresh_secret_default_min_32_characters_key!'
);

export const ACCESS_TOKEN_EXPIRATION = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
export const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * Firma un access_token de corta duración (15 minutos)
 */
export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRATION)
    .sign(ACCESS_SECRET);
}

/**
 * Firma un refresh_token de larga duración (7 días)
 */
export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRATION)
    .sign(REFRESH_SECRET);
}

/**
 * Verifica la firma y vigencia del access_token
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as TokenPayload['role'],
    };
  } catch {
    return null;
  }
}

/**
 * Verifica la firma y vigencia del refresh_token
 */
export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as TokenPayload['role'],
    };
  } catch {
    return null;
  }
}
