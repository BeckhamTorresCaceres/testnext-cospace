import { BadRequestError } from '../errors';

export const OPERATING_TIMEZONE = 'America/Bogota';

export interface BogotaDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Obtiene los componentes de fecha y hora proyectados en America/Bogota (UTC-5)
 */
export function getBogotaParts(date: Date): BogotaDateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: OPERATING_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, number> = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = parseInt(part.value, 10);
    }
  }

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour === 24 ? 0 : map.hour,
    minute: map.minute,
    second: map.second,
  };
}

/**
 * Valida las reglas de negocio RN-01, RN-02 y RN-03 para reservas
 */
export function validateBookingTimeRules(startTime: Date, endTime: Date): { totalHours: number } {
  const now = new Date();

  // 1. RN-03: No reservas en el pasado (t_inicio > t_actual)
  if (startTime.getTime() <= now.getTime()) {
    throw new BadRequestError('La fecha de inicio de la reserva debe ser en el futuro.');
  }

  // 2. RN-03: Máximo 30 días calendario de anticipación
  const maxAnticipation = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (startTime.getTime() > maxAnticipation.getTime()) {
    throw new BadRequestError('No se permiten reservas con más de 30 días de anticipación.');
  }

  // 3. Coherencia cronológica: inicio antes de fin
  if (startTime.getTime() >= endTime.getTime()) {
    throw new BadRequestError('La hora de inicio debe ser anterior a la hora de fin.');
  }

  // 4. RN-01: Minutos y segundos deben ser estrictamente :00
  const startParts = getBogotaParts(startTime);
  const endParts = getBogotaParts(endTime);

  if (startParts.minute !== 0 || startParts.second !== 0) {
    throw new BadRequestError('La hora de inicio debe comenzar exactamente en punto (minutos y segundos en :00).');
  }

  if (endParts.minute !== 0 || endParts.second !== 0) {
    throw new BadRequestError('La hora de finalización debe terminar exactamente en punto (minutos y segundos en :00).');
  }

  // 5. RN-01: Duración entre 1 y 4 horas continuas completas
  const diffMs = endTime.getTime() - startTime.getTime();
  const totalHours = diffMs / (1000 * 60 * 60);

  if (!Number.isInteger(totalHours) || totalHours < 1 || totalHours > 4) {
    throw new BadRequestError('La reserva debe durar entre 1 y 4 horas continuas en bloques de horas completas.');
  }

  // 6. RN-02: La reserva debe operar dentro del mismo día físico de 07:00 a 21:00
  if (
    startParts.year !== endParts.year ||
    startParts.month !== endParts.month ||
    startParts.day !== endParts.day
  ) {
    throw new BadRequestError('La reserva no puede extenderse entre días diferentes.');
  }

  if (startParts.hour < 7 || endParts.hour > 21) {
    throw new BadRequestError('El horario del coworking opera exclusivamente de 07:00 a 21:00 (hora local America/Bogota).');
  }

  return { totalHours };
}

/**
 * Valida la regla RN-10: Usuario USER solo puede cancelar con >= 2 horas (7200s) de antelación
 */
export function canUserCancelBooking(startTime: Date, isAdmin: boolean = false): boolean {
  if (isAdmin) {
    return true; // Administrador exento de límite de 2h
  }

  const now = new Date();
  const diffSeconds = (startTime.getTime() - now.getTime()) / 1000;
  return diffSeconds >= 7200;
}
