import { NextResponse } from 'next/server';
import { ZodError, type ZodIssue } from 'zod';
import { AppError, TooManyRequestsError } from './AppError';

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  details?: unknown;
}

export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  const timestamp = new Date().toISOString();

  // 1. Error de validación con Zod
  if (error instanceof ZodError) {
    const formattedErrors = error.issues.map((issue: ZodIssue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return NextResponse.json(
      {
        statusCode: 400,
        error: 'BadRequest',
        message: 'Error de validación en los datos enviados.',
        timestamp,
        details: formattedErrors,
      },
      { status: 400 }
    );
  }

  // 2. Errores de dominio conocidos (AppError y subclases)
  if (error instanceof AppError) {
    const headers: Record<string, string> = {};
    if (error instanceof TooManyRequestsError) {
      headers['Retry-After'] = String(error.retryAfterSeconds);
    }

    return NextResponse.json(
      {
        statusCode: error.statusCode,
        error: error.error,
        message: error.message,
        timestamp,
        details: error.details,
      },
      { status: error.statusCode, headers }
    );
  }

  // 3. Errores no controlados
  console.error('[Unhandled API Error]:', error);

  return NextResponse.json(
    {
      statusCode: 500,
      error: 'InternalServerError',
      message: 'Ocurrió un error inesperado en el servidor.',
      timestamp,
    },
    { status: 500 }
  );
}
