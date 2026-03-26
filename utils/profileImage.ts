import { getApiBaseUrl } from '@/services/api.service';

/**
 * Normalizes a profile image path/url returned by the backend into an Image `uri`.
 * - Accepts absolute http(s) URLs as-is
 * - Accepts relative `/uploads/...` paths and prefixes them with the public base URL
 */
export function getProfileImageUrl(profileImage?: string): string | null {
  const raw = String(profileImage ?? '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;

  const apiBase = String(getApiBaseUrl() ?? '').trim();
  if (!apiBase) return raw;

  const trimmed = apiBase.replace(/\/$/, '');
  // Our API base often ends with `/api`; profile images are usually served from the public root.
  const publicBase = trimmed.replace(/\/api\/?$/i, '');
  return `${publicBase}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

