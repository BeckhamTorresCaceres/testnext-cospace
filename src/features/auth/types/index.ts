import { Role } from '@prisma/client';

export interface TokenPayload {
  sub: string; // User ID
  email: string;
  name: string;
  role: Role;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  user: UserSummary;
  message?: string;
}
