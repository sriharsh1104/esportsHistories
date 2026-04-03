import type { User } from '@/types/auth';

/** Backend `role` — admins skip consumer onboarding (profile + game selection). */
export function isAdminUser(user: User | null | undefined): boolean {
  const r = user?.role;
  if (r == null) return false;
  return String(r).toLowerCase() === 'admin';
}

/** Backend `role` — hosts behave like consumers but with game selection auto-unlocked. */
export function isHostUser(user: User | null | undefined): boolean {
  const r = user?.role;
  if (r == null) return false;
  return String(r).toLowerCase() === 'host';
}

/**
 * Lobby Records screen — admin + host (host APIs can diverge in services later).
 */
export function canAccessLobbyRecordsUI(user: User | null | undefined): boolean {
  return isAdminUser(user) || isHostUser(user);
}
