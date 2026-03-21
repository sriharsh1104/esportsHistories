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
