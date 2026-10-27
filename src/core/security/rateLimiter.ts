import { TooManyRequestsError } from '../errors';

interface RateLimitRecord {
  count: number;
  resetAt: number; // Timestamp en ms
}

class MemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();

  /**
   * Extrae la dirección IP del cliente a partir de las cabeceras HTTP estándar
   */
  getClientIp(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
      return realIp.trim();
    }
    return '127.0.0.1';
  }

  /**
   * Verifica y consume un intento dentro de la ventana de tiempo.
   * Lanza TooManyRequestsError si se supera el umbral permitido.
   */
  check(req: Request, options: { maxRequests: number; windowSeconds: number; keyPrefix: string }): void {
    const ip = this.getClientIp(req);
    const key = `${options.keyPrefix}:${ip}`;
    const now = Date.now();
    const windowMs = options.windowSeconds * 1000;

    const record = this.store.get(key);

    if (!record || now > record.resetAt) {
      // Nueva ventana de tiempo
      this.store.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return;
    }

    if (record.count >= options.maxRequests) {
      const remainingSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      throw new TooManyRequestsError(
        `Has superado el límite de intentos permitidos (${options.maxRequests} por minuto). Por favor espera ${remainingSeconds} segundos.`,
        remainingSeconds
      );
    }

    record.count += 1;
  }

  /**
   * Limpieza periódica de claves expiradas para evitar fugas de memoria
   */
  cleanUp(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

export const rateLimiter = new MemoryRateLimiter();

// Limpieza periódica cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(() => rateLimiter.cleanUp(), 5 * 60 * 1000).unref?.();
}
