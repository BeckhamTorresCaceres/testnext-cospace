import { prisma } from '@/core/db';
import { ConflictError, UnauthorizedError, NotFoundError } from '@/core/errors';
import { RegisterInput, LoginInput } from '../schemas';
import { hashPassword, comparePassword } from './password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './jwt';
import { TokenPayload, UserSummary } from '../types';

export interface AuthSessionResult {
  user: UserSummary;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Registro de nuevo usuario (RF-01)
   */
  async registerUser(data: RegisterInput): Promise<AuthSessionResult> {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictError('Ya existe una cuenta registrada con este correo electrónico.');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: 'USER',
      },
    });

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken(tokenPayload);
    const refreshTokenHash = await hashPassword(refreshToken);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Inicio de sesión (RF-02)
   */
  async authenticateUser(data: LoginInput): Promise<AuthSessionResult> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError('Credenciales inválidas. Verifica tu correo y contraseña.');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedError('Esta cuenta fue registrada mediante Google. Por favor, inicia sesión con Google.');
    }

    const isMatch = await comparePassword(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Credenciales inválidas. Verifica tu correo y contraseña.');
    }

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken(tokenPayload);
    const refreshTokenHash = await hashPassword(refreshToken);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rotación silenciosa de tokens (RF-05)
   */
  async rotateTokens(refreshToken: string): Promise<AuthSessionResult> {
    if (!refreshToken) {
      throw new UnauthorizedError('Token de renovación no proporcionado.');
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedError('Token de renovación inválido o expirado.');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedError('Sesión revocada o inexistente.');
    }

    // Comprobar que el token coincida con el hash almacenado
    const isValid = await comparePassword(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      // Re-uso detectado: revocar de inmediato
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: null },
      });
      throw new UnauthorizedError('Intento de reutilización de token detectado. Inicia sesión nuevamente.');
    }

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const newAccessToken = await signAccessToken(tokenPayload);
    const newRefreshToken = await signRefreshToken(tokenPayload);
    const newRefreshTokenHash = await hashPassword(newRefreshToken);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: newRefreshTokenHash },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Cierre de sesión (RF-04)
   */
  async revokeSession(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  /**
   * Autenticación / Registro mediante OAuth (Google)
   */
  async handleOAuthLogin(profile: {
    email: string;
    name?: string | null;
    image?: string | null;
    googleId?: string | null;
  }): Promise<AuthSessionResult> {
    let user = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: profile.name || profile.email.split('@')[0],
          email: profile.email,
          googleId: profile.googleId || null,
          image: profile.image || null,
          role: 'USER',
        },
      });
    } else {
      const updates: { googleId?: string; image?: string } = {};
      if (!user.googleId && profile.googleId) updates.googleId = profile.googleId;
      if (!user.image && profile.image) updates.image = profile.image;

      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
      }
    }

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken(tokenPayload);
    const refreshTokenHash = await hashPassword(refreshToken);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Obtiene el perfil actual
   */
  async getUserProfile(userId: string): Promise<UserSummary> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, image: true },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    return user;
  }
}

export const authService = new AuthService();
