import type { User } from '@/types/auth';

/** Backend `role` — admins skip consumer onboarding (profile + game selection). */
export function isAdminUser(user: User | null | undefined): boolean {
  const r = user?.role;
  if (r == null) return false;
  return String(r).toLowerCase() === 'admin';
}
