import { API_ENDPOINTS } from '@/constants/api';
import { api } from './api.service';

export type GameCategory = 'mobile' | 'pc';

export interface Game {
  _id: string;
  name: string;
  slug: string;
  category: GameCategory;
  icon: string;
}

export interface GameDashboardItem {
  id: string;
  title: string;
  description?: string;
  game?: string;
  time?: string;
}

type GameOptionLike = {
  _id?: string;
  id?: string;
  gameId?: string;
  name?: string;
  title?: string;
  slug?: string;
  category?: GameCategory;
  icon?: string;
};

function normalizeGameOption(game: GameOptionLike): Game | null {
  const id = game._id ?? game.id ?? game.gameId;
  const name = game.name ?? game.title;
  if (!id || !name) return null;

  return {
    _id: String(id),
    name: String(name),
    slug: String(game.slug ?? String(name).toLowerCase().replace(/\s+/g, '-')),
    category: (game.category ?? 'mobile') as GameCategory,
    icon: String(game.icon ?? 'gamepad'),
  };
}

/** Single source of truth for parsing `/profile/game-options` (games section). */
export function parseGamesArrayFromOptionsPayload(source: any): Game[] {
  const objectOptions = source?.options ?? source;
  const mobileOptions = Array.isArray(objectOptions?.mobile) ? objectOptions.mobile : [];
  const pcOptions = Array.isArray(objectOptions?.pc) ? objectOptions.pc : [];

  if (mobileOptions.length > 0 || pcOptions.length > 0) {
    const mappedMobile = mobileOptions.map((name: string) => ({
      _id: String(name),
      name: String(name),
      category: 'mobile' as GameCategory,
    }));
    const mappedPc = pcOptions.map((name: string) => ({
      _id: String(name),
      name: String(name),
      category: 'pc' as GameCategory,
    }));

    return [...mappedMobile, ...mappedPc]
      .map((item: GameOptionLike) => normalizeGameOption(item))
      .filter(Boolean) as Game[];
  }

  const list = Array.isArray(source)
    ? source
    : Array.isArray(source?.options)
      ? source.options
      : Array.isArray(source?.games)
        ? source.games
        : [];

  return list
    .map((item: GameOptionLike) => normalizeGameOption(item))
    .filter(Boolean) as Game[];
}

export type FollowCatalogEntityType = 'game' | 'personality' | 'organization';

export type FollowCatalogItem = {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string;
  type: FollowCatalogEntityType;
  category?: GameCategory;
};

export type FollowCatalog = {
  games: FollowCatalogItem[];
  personalities: FollowCatalogItem[];
  organizations: FollowCatalogItem[];
};

function normalizeFollowCatalogItem(
  raw: any,
  type: FollowCatalogEntityType
): FollowCatalogItem | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return null;
    return { id: s, name: s, type };
  }
  if (typeof raw !== 'object') return null;

  const aka =
    raw.knownAs != null && String(raw.knownAs).trim() ? String(raw.knownAs).trim() : '';
  const legalName =
    raw.name != null && String(raw.name).trim() ? String(raw.name).trim() : '';

  const id =
    raw._id ??
    raw.id ??
    raw.gameId ??
    (aka || undefined) ??
    raw.slug ??
    raw.userId ??
    raw.playerId ??
    raw.teamId ??
    raw.orgId;
  const name =
    aka && legalName
      ? `${aka} (${legalName})`
      : (raw.name ??
        raw.displayName ??
        (aka || undefined) ??
        raw.title ??
        raw.fullName ??
        raw.teamName ??
        raw.orgName ??
        raw.label);
  const idStr = id != null ? String(id).trim() : '';
  const nameStr = name != null ? String(name).trim() : '';
  if (!nameStr && !idStr) return null;
  const finalId = idStr || nameStr;
  const finalName = nameStr || idStr;

  return {
    id: finalId,
    name: finalName,
    slug: raw.slug != null ? String(raw.slug) : undefined,
    imageUrl:
      raw.imageUrl ??
      raw.avatar ??
      raw.photo ??
      raw.logo ??
      raw.image ??
      raw.profilePic ??
      raw.thumbnail,
    type,
    category: raw.category === 'pc' || raw.category === 'mobile' ? raw.category : undefined,
  };
}

function normalizeFollowList(arr: unknown, type: FollowCatalogEntityType): FollowCatalogItem[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => normalizeFollowCatalogItem(item, type))
    .filter(Boolean) as FollowCatalogItem[];
}

const PERSONALITY_KEYS = [
  'indiaEsportsPersonalities',
  'personalities',
  'players',
  'creators',
  'famousPersonalities',
  'celebrities',
  'proPlayers',
  'streamers',
] as const;

const ORGANIZATION_KEYS = [
  'indiaEsportsOrganizations',
  'organizations',
  'teams',
  'orgs',
  'organisations',
  'clubs',
  'esportsOrgs',
  'teamsAndOrgs',
] as const;

function collectRoots(source: any): any[] {
  return [source, source?.options, source?.data, source?.data?.options].filter(
    (x) => x && typeof x === 'object'
  );
}

function firstArrayByKeys(roots: any[], keys: readonly string[]): any[] {
  for (const root of roots) {
    for (const k of keys) {
      if (Array.isArray(root[k])) return root[k];
    }
  }
  return [];
}

function extractEntities(source: any, type: FollowCatalogEntityType, keys: readonly string[]): FollowCatalogItem[] {
  return normalizeFollowList(firstArrayByKeys(collectRoots(source), keys), type);
}

function gameToCatalogItem(g: Game): FollowCatalogItem {
  return {
    id: g._id,
    name: g.name,
    slug: g.slug,
    type: 'game',
    category: g.category,
    imageUrl: undefined,
  };
}

/**
 * Game selection API (`/profile/game-options`) only — catalog: `options`, `gameSelectionConfig`,
 * `indiaEsportsPersonalities`, `indiaEsportsOrganizations`, etc. User-specific picks stay on profile API.
 * Supports shapes like:
 * - `followCatalog: { games, personalities, organizations }`
 * - `options: { mobile: [], pc: [], indiaEsportsPersonalities: [], indiaEsportsOrganizations: [] }`
 * - `options: { mobile: [], pc: [], personalities: [], organizations: [] }`
 * - top-level `personalities` / `organizations` arrays
 */
export async function fetchFollowCatalog(): Promise<FollowCatalog> {
  try {
    const res = await api.get<any>(API_ENDPOINTS.GAMES.GAME_OPTIONS);
    const source = res?.data ?? res;

    const fc = source?.followCatalog;
    if (fc && typeof fc === 'object') {
      const gamesFromFc = normalizeFollowList(fc.games, 'game');
      const personalities = normalizeFollowList(
        fc.personalities ?? fc.players ?? fc.creators,
        'personality'
      );
      const organizations = normalizeFollowList(
        fc.organizations ?? fc.teams ?? fc.orgs,
        'organization'
      );
      const gamesMerged =
        gamesFromFc.length > 0
          ? gamesFromFc
          : parseGamesArrayFromOptionsPayload(source).map(gameToCatalogItem);
      if (gamesMerged.length + personalities.length + organizations.length > 0) {
        return { games: gamesMerged, personalities, organizations };
      }
    }

    const games = parseGamesArrayFromOptionsPayload(source).map(gameToCatalogItem);
    const personalities = extractEntities(source, 'personality', PERSONALITY_KEYS);
    const organizations = extractEntities(source, 'organization', ORGANIZATION_KEYS);

    return { games, personalities, organizations };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch follow catalog');
  }
}

export async function fetchGameOptions(): Promise<Game[]> {
  try {
    const res = await api.get<any>(API_ENDPOINTS.GAMES.GAME_OPTIONS);
    const source = res?.data ?? res;
    return parseGamesArrayFromOptionsPayload(source);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch game options');
  }
}

export async function fetchAllGames(): Promise<Game[]> {
  try {
    return await api.get<Game[]>(API_ENDPOINTS.GAMES.LIST);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch games');
  }
}

export async function fetchGamesByCategory(category: GameCategory): Promise<Game[]> {
  try {
    return await api.get<Game[]>(API_ENDPOINTS.GAMES.BY_CATEGORY(category));
  } catch (error: any) {
    throw new Error(error.message || `Failed to fetch ${category} games`);
  }
}

function normalizeDashboardItem(item: any, index: number): GameDashboardItem | null {
  if (!item || typeof item !== 'object') return null;
  const id = item.id ?? item._id ?? item.newsId ?? `${index}`;
  const title = item.title ?? item.headline ?? item.name;
  if (!title) return null;

  return {
    id: String(id),
    title: String(title),
    description: item.description ?? item.excerpt ?? item.summary,
    game: item.game ?? item.gameName,
    time: item.time ?? item.timeAgo ?? item.createdAt,
  };
}

export async function fetchGameDashboardData(): Promise<GameDashboardItem[]> {
  try {
    const res = await api.get<any>(API_ENDPOINTS.GAMES.GAME_DASHBOARD);
    const source = res?.data ?? res;
    const list = Array.isArray(source)
      ? source
      : Array.isArray(source?.items)
      ? source.items
      : Array.isArray(source?.results)
      ? source.results
      : Array.isArray(source?.news)
      ? source.news
      : [];

    return list
      .map((item: any, index: number) => normalizeDashboardItem(item, index))
      .filter(Boolean) as GameDashboardItem[];
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch game dashboard data');
  }
}
