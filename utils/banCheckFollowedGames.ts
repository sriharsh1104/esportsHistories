import type { GameProfile, SelectedGame } from '@/types/auth';
import {
  normGameKey,
  selectedGameEntryMatchesKeys,
  selectedGamesToEntries,
  type SelectedGameEntry,
} from '@/utils/gameSelection';

function gameProfilesToEntries(profiles: GameProfile[] | undefined): SelectedGameEntry[] {
  if (!Array.isArray(profiles) || profiles.length === 0) return [];
  const mapped = profiles
    .map((p) => {
      const id = String(p.gameId ?? p.id ?? '').trim();
      const name = String(p.gameName ?? '').trim();
      if (!id && !name) return null;
      const idSlug = (id || name).toLowerCase().replace(/\s+/g, '-');
      return { id: idSlug, name: name || id };
    })
    .filter(Boolean) as SelectedGameEntry[];

  const seen = new Set<string>();
  return mapped.filter((item) => {
    const k = normGameKey(item.id);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function mergeGameEntriesForBanCheck(
  selectedGames: SelectedGame[] | undefined,
  gameProfiles: GameProfile[] | undefined
): SelectedGameEntry[] {
  const byNorm = new Map<string, SelectedGameEntry>();
  for (const e of selectedGamesToEntries(selectedGames)) {
    byNorm.set(normGameKey(e.id), e);
  }
  for (const e of gameProfilesToEntries(gameProfiles)) {
    const k = normGameKey(e.id);
    if (!byNorm.has(k)) byNorm.set(k, e);
  }
  return [...byNorm.values()];
}

export type BanCheckOption = { label: string; apiGame: string };

/**
 * Antihack `game` param + normalized keys to match profile `selectedGames` rows.
 * Order matters: more specific keys / games first (e.g. freefire before short ids).
 */
const BAN_CHECK_SUPPORTED: readonly {
  apiGame: string;
  defaultLabel: string;
  keys: readonly string[];
}[] = [
  {
    apiGame: 'freefire',
    defaultLabel: 'Free Fire',
    keys: ['freefire', 'garenafreefire', 'freemax'],
  },
  {
    apiGame: 'bgmi',
    defaultLabel: 'BGMI',
    keys: [
      'battlegroundsmobileindia',
      'pubgmobileindia',
      'battlegroundsmobile',
      'bgmi',
    ],
  },
  {
    apiGame: 'mlbb',
    defaultLabel: 'Mobile Legends',
    keys: ['mobilelegends', 'mlbb', 'bangbang'],
  },
  {
    apiGame: 'codm',
    defaultLabel: 'Call of Duty: Mobile',
    keys: ['callofdutymobile', 'codmobile', 'codm'],
  },
  {
    apiGame: 'wildrift',
    defaultLabel: 'Wild Rift',
    keys: ['wildrift', 'leagueoflegendswildrift'],
  },
  {
    apiGame: 'valorant',
    defaultLabel: 'Valorant',
    keys: ['valorant'],
  },
  {
    apiGame: 'coc',
    defaultLabel: 'Clash of Clans',
    keys: ['clashofclans', 'coc'],
  },
  {
    apiGame: 'cr',
    defaultLabel: 'Clash Royale',
    keys: ['clashroyale'],
  },
  {
    apiGame: 'lol',
    defaultLabel: 'League of Legends',
    keys: ['leagueoflegends'],
  },
  {
    apiGame: 'dota2',
    defaultLabel: 'Dota 2',
    keys: ['dota2', 'defenseoftheancients'],
  },
  {
    apiGame: 'cs2',
    defaultLabel: 'Counter-Strike 2',
    keys: ['counterstrike2', 'cs2'],
  },
  {
    apiGame: 'r6',
    defaultLabel: 'Rainbow Six Siege',
    keys: ['rainbowsix', 'rainbowsixsiege', 'r6siege'],
  },
  {
    apiGame: 'pes',
    defaultLabel: 'eFootball / PES',
    keys: ['efootball', 'pes', 'proevolutionsoccer'],
  },
  {
    apiGame: 'tekken',
    defaultLabel: 'Tekken',
    keys: ['tekken8', 'tekken'],
  },
  {
    apiGame: 'fc',
    defaultLabel: 'EA Sports FC',
    keys: [
      'eafcmobile',
      'easportsfc',
      'easportsfcmobile',
      'eafifa',
      'easportsfifa',
      'fifamobile',
    ],
  },
] as const;

/** Followed games that map to a supported ban-check title, deduped by `apiGame`. */
export function getBanCheckOptionsForFollowedGames(
  selectedGames: SelectedGame[] | undefined,
  gameProfiles?: GameProfile[] | undefined
): BanCheckOption[] {
  const entries = mergeGameEntriesForBanCheck(selectedGames, gameProfiles);
  const seenApi = new Set<string>();
  const out: BanCheckOption[] = [];

  for (const def of BAN_CHECK_SUPPORTED) {
    const hit = entries.find((e) => selectedGameEntryMatchesKeys(e, def.keys));
    if (!hit) continue;
    if (seenApi.has(def.apiGame)) continue;
    seenApi.add(def.apiGame);
    const label = String(hit.name ?? '').trim() || def.defaultLabel;
    out.push({ label, apiGame: def.apiGame });
  }

  return out;
}
