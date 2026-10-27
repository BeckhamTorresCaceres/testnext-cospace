'use server';

import { signIn, signOut } from '@/auth';

export async function loginWithGoogleAction(redirectTo?: string) {
  const syncDestination = `/api/auth/oauth-sync?redirect=${encodeURIComponent(redirectTo || '/dashboard')}`;
  await signIn('google', { redirectTo: syncDestination });
}

export async function signOutAction() {
  await signOut({ redirectTo: '/' });
}
