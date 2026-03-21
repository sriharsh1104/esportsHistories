import type { FollowProfileEntry } from '@/types/auth';

/**
 * Backend may omit follow arrays on profile GET or echo empty while DB has data.
 * Same idea as mergeSelectedGamesForPersistence.
 */
export function mergeFollowEntryLists(
  fromServer: FollowProfileEntry[] | undefined,
  fallback: FollowProfileEntry[] | undefined
): FollowProfileEntry[] | undefined {
  const server = Array.isArray(fromServer) ? fromServer : undefined;
  const local = Array.isArray(fallback) ? fallback : undefined;

  if (server && server.length > 0) return server;
  if (local && local.length > 0) return local;
  if (Array.isArray(fromServer) && fromServer.length === 0) return [];
  return local ?? server;
}

export function normalizeFollowProfileEntry(raw: unknown): FollowProfileEntry | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const s = raw.trim();
    return s ? { id: s, name: s } : null;
  }
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = String(
    o._id ??
      o.id ??
      o.personalityId ??
      o.knownAs ??
      o.slug ??
      o.playerId ??
      o.orgId ??
      o.name ??
      ''
  ).trim();
  const name = String(
    o.name ?? o.displayName ?? o.knownAs ?? o.title ?? o.orgName ?? o.org_name ?? id
  ).trim();
  if (!id && !name) return null;
  return { id: id || name, name: name || id };
}

/**
 * Merge several API list fields (e.g. `followedOrganizations` + `organizationProfiles`),
 * normalize entries, dedupe by case-insensitive id.
 */
export function mergeFollowProfileSources(...sources: unknown[]): FollowProfileEntry[] | undefined {
  const flat: unknown[] = [];
  for (const s of sources) {
    if (Array.isArray(s)) flat.push(...s);
  }
  if (flat.length === 0) return undefined;
  const normalized = normalizeFollowProfileEntryArray(flat);
  if (!normalized?.length) return undefined;
  const seen = new Set<string>();
  const deduped: FollowProfileEntry[] = [];
  for (const e of normalized) {
    const key = e.id.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(e);
  }
  return deduped.length ? deduped : undefined;
}

export function normalizeFollowProfileEntryArray(src: unknown): FollowProfileEntry[] | undefined {
  if (!Array.isArray(src)) return undefined;
  const out = src
    .map((x) => normalizeFollowProfileEntry(x))
    .filter((x): x is FollowProfileEntry => x != null);
  return out;
}

export function sanitizeFollowProfilePayload(
  entries: FollowProfileEntry[] | undefined
): FollowProfileEntry[] | undefined {
  if (!Array.isArray(entries)) return undefined;
  return entries
    .map((e) => ({
      id: String(e.id ?? '').trim(),
      name: String(e.name ?? '').trim(),
    }))
    .filter((e) => e.id.length > 0 && e.name.length > 0);
}

/** Profile PUT expects `followedPersonalities` / `followedOrganizations` as string[] (not objects). */
export function followEntriesToApiStringArray(entries: FollowProfileEntry[]): string[] {
  const clean = sanitizeFollowProfilePayload(entries) ?? [];
  return clean
    .map((e) => (e.id.length ? e.id : e.name))
    .filter((s) => s.length > 0);
}
