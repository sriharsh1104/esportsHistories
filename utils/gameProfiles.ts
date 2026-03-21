import type { GameProfile } from '@/types/auth';

/**
 * Merge cached game profiles with a fresh GET/PUT user.
 * If the server sends an array (including `[]`), that list wins — never keep stale cached rows over it.
 * When `fromServer` is `undefined` (field omitted / unknown), fall back to `fallback` if it is an array.
 */
export function mergeGameProfilesForPersistence(
  fromServer: GameProfile[] | undefined,
  fallback: GameProfile[] | undefined
): GameProfile[] | undefined {
  if (Array.isArray(fromServer)) {
    return fromServer;
  }
  if (Array.isArray(fallback)) {
    return fallback;
  }
  return fromServer;
}

export function normGameProfileKey(s: string): string {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Combine `gameProfiles` + `followedGames` UIDs. If both inputs are missing, return `undefined` (unknown).
 * If either input is an array (even `[]`), return a concrete array so `[]` from the API is not confused
 * with “omit”.
 */
export function mergeGameProfileListsPreferUid(
  a: GameProfile[] | undefined,
  b: GameProfile[] | undefined
): GameProfile[] | undefined {
  if (a === undefined && b === undefined) return undefined;
  const map = new Map<string, GameProfile>();
  for (const list of [a, b]) {
    if (!list) continue;
    for (const gp of list) {
      const key =
        normGameProfileKey(gp.gameId) ||
        normGameProfileKey(gp.gameName) ||
        gp.id;
      const cur = map.get(key);
      const gpUid = String(gp.gameUid ?? '').trim();
      const curUid = cur ? String(cur.gameUid ?? '').trim() : '';
      if (!cur || (curUid.length === 0 && gpUid.length > 0)) {
        map.set(key, gp);
      }
    }
  }
  return [...map.values()];
}
