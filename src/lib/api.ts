'use client';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let res = await fetch(input, init);

  if (res.status === 401) {
    // Intentar rotar tokens mediante el refresh token cookie
    const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
    if (refreshRes.ok) {
      res = await fetch(input, init);
    }
  }

  return res;
}

export async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (Array.isArray(data?.details) && data.details.length > 0 && data.details[0]?.message) {
      return data.details[0].message;
    }
    if (typeof data?.message === 'string' && data.message.trim().length > 0) {
      return data.message;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export const SPACE_TYPE_LABELS: Record<'DESK' | 'MEETING_ROOM' | 'BOOTH', string> = {
  DESK: 'Escritorio',
  MEETING_ROOM: 'Sala de reunión',
  BOOTH: 'Cabina',
};

