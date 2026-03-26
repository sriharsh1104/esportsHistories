import { API_ENDPOINTS } from '@/constants/api';
import { api } from './api.service';

export type TournamentStatusApi = 'upcoming' | 'live' | 'completed' | 'pendingResult' | 'cancelled';

export type TournamentListParams = {
  /** Backend now requires game query, e.g. "Free Fire". */
  game: string;
  status?: TournamentStatusApi;
  date?: string; // YYYY-MM-DD
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  subMode?: 'solo' | 'duo' | 'squad' | 'br' | 'lw' | '1v1' | '2v2' | '4v4';
  mode?: 'CS' | 'BR' | 'LW' | string;
};

export type TournamentUiItem = {
  id: string;
  name: string;
  /** Raw game label as returned by API (used for display + matching). */
  gameName: string;
  /** Normalized game key for matching against selected games. */
  gameKey: string;
  status: 'ongoing' | 'upcoming' | 'recent';
  startDate: string;
  prizePool: string;
  teamsCount: number;
  entryFee: number | null;
  isPaid: boolean | null;
};

function normKey(input: unknown): string {
  return String(input ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

function formatMaybeDate(input: unknown): string {
  const s = String(input ?? '').trim();
  if (!s) return '';
  // Keep server formatting if provided; otherwise show ISO-ish.
  return s;
}

function toNumberOrNull(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  const s = String(input ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toMoneyString(input: unknown): string {
  const s = String(input ?? '').trim();
  if (!s) return '';
  return s;
}

function mapStatus(raw: unknown): TournamentUiItem['status'] {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'live' || s === 'ongoing') return 'ongoing';
  if (s === 'upcoming') return 'upcoming';
  return 'recent';
}

function inferPaidFlags(raw: Record<string, unknown>): { entryFee: number | null; isPaid: boolean | null } {
  const fee =
    toNumberOrNull(raw.entryFee) ??
    toNumberOrNull(raw.entry_fee) ??
    toNumberOrNull(raw.joinFee) ??
    toNumberOrNull(raw.join_fee) ??
    toNumberOrNull(raw.fee);

  const paidBool =
    typeof raw.isPaid === 'boolean'
      ? raw.isPaid
      : typeof raw.paid === 'boolean'
        ? raw.paid
        : typeof raw.is_paid === 'boolean'
          ? raw.is_paid
          : null;

  if (paidBool != null) return { entryFee: fee, isPaid: paidBool };
  if (fee != null) return { entryFee: fee, isPaid: fee > 0 };

  // Some APIs expose "lobbyRule"/"lobbyRules" where "FreeFire paid lobby rules" exists.
  const lobby =
    String(raw.lobbyRule ?? raw.lobbyRules ?? raw.lobby_rule ?? raw.lobby_rules ?? '')
      .toLowerCase()
      .trim();
  if (lobby.includes('paid')) return { entryFee: fee, isPaid: true };
  if (lobby.includes('free') || lobby.includes('sponsor')) return { entryFee: fee, isPaid: false };

  return { entryFee: fee, isPaid: null };
}

function normalizeTournamentRow(raw: unknown, index: number): TournamentUiItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const id = String(o._id ?? o.id ?? o.tournamentId ?? `${index}`).trim();
  const name = String(o.name ?? o.title ?? o.tournamentName ?? '').trim();
  if (!name) return null;

  const gameName = String(o.game ?? o.gameName ?? o.game_title ?? o.gameType ?? '').trim();
  const gameKey = normKey(gameName || o.gameId || o.slug);

  const prizePool =
    toMoneyString(o.prizePool ?? o.prize_pool ?? o.prize ?? o.winning ?? o.winnings) || '—';
  const teamsCount =
    (toNumberOrNull(o.teamsCount ?? o.teams_count ?? o.teams ?? o.totalTeams) ?? 0) as number;
  const startDate =
    formatMaybeDate(o.startDate ?? o.start_date ?? o.date ?? o.startsAt ?? o.startTime) || '—';

  const { entryFee, isPaid } = inferPaidFlags(o);

  return {
    id,
    name,
    gameName: gameName || '—',
    gameKey,
    status: mapStatus(o.status),
    startDate,
    prizePool,
    teamsCount,
    entryFee,
    isPaid,
  };
}

function extractListPayload(source: any): any[] {
  if (Array.isArray(source)) return source;
  if (Array.isArray(source?.data)) return source.data;
  if (Array.isArray(source?.data?.data)) return source.data.data;
  if (Array.isArray(source?.results)) return source.results;
  if (Array.isArray(source?.items)) return source.items;
  if (Array.isArray(source?.tournaments)) return source.tournaments;
  return [];
}

export async function fetchTournamentList(params: TournamentListParams): Promise<TournamentUiItem[]> {
  const game = String(params?.game ?? '').trim();
  if (!game) {
    throw new Error('Tournament game query is required');
  }
  const res = await api.get<any>(API_ENDPOINTS.TOURNAMENT.LIST, params);
  const source = res?.data ?? res;
  const list = extractListPayload(source);
  return list.map((row, idx) => normalizeTournamentRow(row, idx)).filter(Boolean) as TournamentUiItem[];
}

export function getTournamentStreamUrl(game: string): string {
  const trimmed = String(game ?? '').trim();
  if (!trimmed) {
    throw new Error('Tournament stream game query is required');
  }
  return `${API_ENDPOINTS.TOURNAMENT.STREAM}?game=${encodeURIComponent(trimmed)}`;
}

