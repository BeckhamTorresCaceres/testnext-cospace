export class AppError extends Error {
  public readonly statusCode: number;
  public readonly error: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 500, error: string = 'InternalServerError', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.error = error;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Solicitud incorrecta', details?: unknown) {
    super(message, 400, 'BadRequest', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'No autorizado o sesión expirada') {
    super(message, 401, 'Unauthorized');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'No tienes permisos suficientes para realizar esta acción') {
    super(message, 403, 'Forbidden');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'El recurso solicitado no fue encontrado') {
    super(message, 404, 'NotFound');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflicto con el estado actual del recurso') {
    super(message, 409, 'Conflict');
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message: string = 'Demasiadas solicitudes. Por favor, inténtalo más tarde.',
    public readonly retryAfterSeconds: number = 60
  ) {
    super(message, 429, 'TooManyRequests', { retryAfterSeconds });
  }
}

