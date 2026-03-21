import type { SelectedGame } from '@/types/auth';

/**
 * Backend often omits `selectedGames` on profile GET, or returns `[]` while DB still has games.
 * Prefer a non-empty server list; if server is empty/missing, keep optimistic update or cached user.
 */
export function mergeSelectedGamesForPersistence(
  fromServer: SelectedGame[] | undefined,
  fallback: SelectedGame[] | undefined
): SelectedGame[] | undefined {
  const server = Array.isArray(fromServer) ? fromServer : undefined;
  const local = Array.isArray(fallback) ? fallback : undefined;

  if (server && server.length > 0) return server;
  // Server empty/omitted but we still have a local selection (save echo / lazy GET).
  if (local && local.length > 0) return local;
  if (Array.isArray(fromServer) && fromServer.length === 0) return [];
  return local ?? server;
}

export type SelectedGameEntry = { id: string; name: string };

/** Same mapping as game-profiles — stable id + display name from profile `selectedGames`. */
export function selectedGamesToEntries(
  selectedGames: SelectedGame[] | undefined
): SelectedGameEntry[] {
  const raw = Array.isArray(selectedGames) ? selectedGames : [];
  const mapped = raw
    .map((g: any) => {
      if (typeof g !== 'object') {
        const value = String(g).trim();
        if (!value) return null;
        return { id: value.toLowerCase().replace(/\s+/g, '-'), name: value };
      }
      const name = String(g.name ?? g.game ?? '').trim();
      const idRaw = String(g._id ?? g.id ?? g.gameId ?? name).trim();
      if (!idRaw && !name) return null;
      return {
        id: (idRaw || name).toLowerCase().replace(/\s+/g, '-'),
        name: name || idRaw,
      };
    })
    .filter(Boolean) as SelectedGameEntry[];

  const seen = new Set<string>();
  return mapped.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/** Match catalog / profile strings (freefire vs free-fire vs "Garena Free Fire"). */
export function normGameKey(s: string): string {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** True if entry id or name normalizes to / contains any of the given normalized keys. */
export function selectedGameEntryMatchesKeys(
  entry: SelectedGameEntry,
  keys: readonly string[]
): boolean {
  const nid = normGameKey(entry.id);
  const nname = normGameKey(entry.name);
  return keys.some((k) => nid === k || nname === k || nid.includes(k) || nname.includes(k));
}

/** True if user has at least one saved game (IDs, names, or { platform, game } from API). */
export function userHasSelectedGames(games: unknown): boolean {
  if (!Array.isArray(games) || games.length === 0) return false;
  return games.some((g) => {
    if (g == null) return false;
    if (typeof g !== 'object') return String(g).trim().length > 0;
    const o = g as Record<string, unknown>;
    const raw =
      o._id ??
      o.id ??
      o.gameId ??
      o.slug ??
      o.name ??
      o.game ??
      o.title ??
      o.gameName;
    return String(raw ?? '').trim().length > 0;
  });
}
