import Constants from 'expo-constants';
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

export type TournamentJoinedTeamEntry = {
  teamName: string;
  leaderUserId: string;
  slot?: number | null;
  playerCount?: number | null;
};

export type JoinedTeamSlotRow = {
  slotLabel: string;
  primaryText: string;
  secondaryText?: string;
};

export type TournamentUiItem = {
  id: string;
  name: string;
  /** Raw game label as returned by API (used for display + matching). */
  gameName: string;
  /** Normalized game key for matching against selected games. */
  gameKey: string;
  status: 'ongoing' | 'upcoming' | 'recent';
  /** Lowercase API status for badges (upcoming, live, completed, …). */
  apiStatus: string;
  startDate: string;
  prizePool: string;
  teamsCount: number;
  entryFee: number | null;
  isPaid: boolean | null;
  /** yyyy-mm-dd (or best-effort) for grouping like admin lobby records. */
  sortDateKey: string;
  lobbyName?: string;
  mode?: string;
  subMode?: string;
  /** Human-readable start time (e.g. "9:00 pm"). */
  startTimeDisplay?: string;
  maxTeams?: number | null;
  slotsAvailable?: number | null;
  joinedCount?: number | null;
  winnerPrizePool?: number | null;
  totalPrizePool?: number | null;
  totalFees?: number | null;
  /** Free-text lobby rules from API when present. */
  lobbyRulesText?: string;
  /** Raw `rules` object from API (subMode, point system, etc.). */
  rulesRecord?: Record<string, unknown> | null;
  /** Present when API includes `joinedTeamsList` (may be empty). */
  joinedTeamsList?: TournamentJoinedTeamEntry[];
  /** Custom room credentials when host has set them (`room` object or flat fields). */
  lobbyRoomId?: string | null;
  lobbyRoomPassword?: string | null;
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

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function normalizeJoinedTeamsListEntries(raw: unknown): TournamentJoinedTeamEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: TournamentJoinedTeamEntry[] = [];
  for (const row of raw) {
    const r = asRecord(row);
    if (!r) continue;
    const teamName = String(r.teamName ?? r.team_name ?? r.name ?? '').trim();
    const leaderUserId = String(
      r.leaderUserId ?? r.leader_user_id ?? r.userId ?? r.user_id ?? '',
    ).trim();
    if (!teamName && !leaderUserId) continue;
    out.push({
      teamName: teamName || 'Team',
      leaderUserId,
      slot: toNumberOrNull(r.slot ?? r.slotNumber ?? r.slotNo ?? r.index),
      playerCount: toNumberOrNull(r.playerCount ?? r.player_count ?? r.playersCount),
    });
  }
  return out;
}

/** Slot 1..N: team name or empty string for free slots. */
export function buildJoinedTeamSlotRows(
  maxTeams: number | null | undefined,
  entries: TournamentJoinedTeamEntry[] | null | undefined,
): JoinedTeamSlotRow[] {
  const list = entries ?? [];
  const n =
    maxTeams != null && maxTeams > 0
      ? maxTeams
      : list.length > 0
        ? list.length
        : 0;
  if (n <= 0) return [];

  const assigned: (TournamentJoinedTeamEntry | null)[] = Array.from({ length: n }, () => null);
  const unslotted: TournamentJoinedTeamEntry[] = [];

  for (const e of list) {
    const s = e.slot;
    if (s != null && Number.isFinite(s)) {
      const idx = Math.floor(s) - 1;
      if (idx >= 0 && idx < n && !assigned[idx]) {
        assigned[idx] = e;
        continue;
      }
    }
    unslotted.push(e);
  }

  let u = 0;
  for (let i = 0; i < n; i++) {
    if (assigned[i]) continue;
    if (u < unslotted.length) {
      assigned[i] = unslotted[u++];
    }
  }

  return assigned.map((e, i) => ({
    slotLabel: `Slot ${i + 1}`,
    primaryText: e?.teamName?.trim() ? e.teamName.trim() : '',
    secondaryText:
      e && e.playerCount != null
        ? `${e.playerCount} player${e.playerCount === 1 ? '' : 's'}`
        : undefined,
  }));
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
  if (!id) return null;

  // Match host/admin list APIs: title fields vary; list items often omit `name`.
  const name =
    String(
      o.name ??
        o.title ??
        o.label ??
        o.tournamentName ??
        o.lobbyGroupName ??
        o.lobbyName ??
        '',
    ).trim() || 'Tournament';

  const gameName = String(
    o.game ?? o.gameName ?? o.game_title ?? o.gameType ?? o.game_name ?? '',
  ).trim();
  const gameKey = normKey(gameName || o.gameId || o.slug);

  const lobbyNameRaw = String(
    o.lobbyName ?? o.lobby_name ?? '',
  ).trim();
  const lobbyName = lobbyNameRaw || undefined;

  const rules = asRecord(o.rules);
  const lobbyRulesTextRaw = String(
    o.lobbyRule ?? o.lobbyRules ?? o.lobby_rule ?? o.lobby_rules ?? '',
  ).trim();
  const lobbyRulesText = lobbyRulesTextRaw || undefined;
  const rulesRecord =
    rules && Object.keys(rules).length > 0 ? rules : undefined;
  const subMode =
    rules?.subMode != null
      ? String(rules.subMode).trim()
      : o.subMode != null
        ? String(o.subMode).trim()
        : o.team_mode != null
          ? String(o.team_mode).trim()
          : o.sub_mode != null
            ? String(o.sub_mode).trim()
            : undefined;

  const mode =
    o.mode != null
      ? String(o.mode).trim()
      : o.match_type != null
        ? String(o.match_type).trim()
        : undefined;

  const potentialPrize = asRecord(o.potentialPrizePool);
  let winnerPrizePool =
    toNumberOrNull(
      potentialPrize?.winnerPrizePool ??
        potentialPrize?.winnerPool ??
        o.winnerPrizePool ??
        o.winner_pool,
    );
  let totalPrizePool = toNumberOrNull(
    potentialPrize?.totalPrizePool ?? o.totalPrizePool ?? o.total_pool,
  );
  let totalFees = toNumberOrNull(
    potentialPrize?.totalFees ?? o.totalFees ?? o.admin_fees ?? o.feesTotal,
  );

  const flatPrize = toNumberOrNull(o.prizePool ?? o.prize_pool ?? o.prize);
  if (totalPrizePool == null && winnerPrizePool == null && flatPrize != null) {
    totalPrizePool = flatPrize;
  }

  const prizePool =
    totalPrizePool != null
      ? String(totalPrizePool)
      : winnerPrizePool != null
        ? String(winnerPrizePool)
        : toMoneyString(o.prizePool ?? o.prize_pool ?? o.prize ?? o.winning ?? o.winnings) || '—';

  const maxTeams = toNumberOrNull(
    o.maxTeams ?? o.max_teams ?? o.totalSlot ?? o.totalSlots ?? o.total_slots,
  );
  const joinedArr = Array.isArray(o.joinedTeams) ? o.joinedTeams : null;
  const joinedCount =
    toNumberOrNull(
      o.joinedTeamsCount ?? o.joinedCount ?? o.joined ?? o.teamsJoined ?? o.joined_count,
    ) ?? (joinedArr ? joinedArr.length : null);
  const availableExplicit = toNumberOrNull(
    o.availableTeams ?? o.available_slots ?? o.slotsAvailable ?? o.availableSlots,
  );
  let slotsAvailable: number | null = availableExplicit;
  if (slotsAvailable == null && maxTeams != null) {
    slotsAvailable = Math.max(0, maxTeams - (joinedCount ?? 0));
  }

  const teamsCount =
    (maxTeams ??
      toNumberOrNull(o.teamsCount ?? o.teams_count ?? o.teams ?? o.totalTeams) ??
      joinedCount ??
      0) as number;

  const dateRaw = o.date ?? o.day ?? o.startDate ?? o.start_date;
  const dateStr = dateRaw != null ? String(dateRaw).trim() : '';
  const sortDateKey =
    dateStr.length >= 10 ? dateStr.slice(0, 10) : dateStr || 'Unknown date';

  const startTimeRaw =
    o.startTime ?? o.start_time ?? o.startsAt ?? o.scheduledAt;
  let startTimeDisplay: string | undefined;
  if (startTimeRaw != null) {
    const st = String(startTimeRaw).trim();
    if (st.includes('T')) {
      try {
        startTimeDisplay = new Date(st).toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        startTimeDisplay = st;
      }
    } else {
      startTimeDisplay = st;
    }
  }

  const startDate =
    formatMaybeDate(o.startDate ?? o.start_date ?? o.date ?? o.startsAt ?? o.startTime) || '—';

  const { entryFee, isPaid } = inferPaidFlags(o);

  const apiStatus = String(o.status ?? '')
    .trim()
    .toLowerCase();

  const hasJoinedListKey =
    Object.prototype.hasOwnProperty.call(o, 'joinedTeamsList') ||
    Object.prototype.hasOwnProperty.call(o, 'joined_teams_list');
  const joinedTeamsList = hasJoinedListKey
    ? normalizeJoinedTeamsListEntries(o.joinedTeamsList ?? o.joined_teams_list)
    : undefined;

  const roomNested = asRecord(o.room);
  let lobbyRoomId: string | null = null;
  let lobbyRoomPassword: string | null = null;
  if (roomNested) {
    const rid = String(roomNested.roomId ?? roomNested.room_id ?? '').trim();
    const pw = String(roomNested.password ?? roomNested.roomPassword ?? '').trim();
    if (rid) lobbyRoomId = rid;
    if (pw) lobbyRoomPassword = pw;
  }
  if (!lobbyRoomId) {
    const flat = String(o.roomId ?? o.customRoomId ?? o.inGameRoomId ?? '').trim();
    if (flat) lobbyRoomId = flat;
  }
  if (!lobbyRoomPassword) {
    const flatPw = String(
      o.roomPassword ?? o.customRoomPassword ?? o.password ?? '',
    ).trim();
    if (flatPw) lobbyRoomPassword = flatPw;
  }

  return {
    id,
    name,
    gameName: gameName || '—',
    gameKey,
    status: mapStatus(o.status),
    apiStatus,
    startDate,
    prizePool,
    teamsCount,
    entryFee,
    isPaid,
    sortDateKey,
    lobbyName,
    mode,
    subMode,
    startTimeDisplay,
    maxTeams,
    slotsAvailable,
    joinedCount,
    winnerPrizePool,
    totalPrizePool,
    totalFees,
    lobbyRulesText,
    rulesRecord: rulesRecord ?? null,
    joinedTeamsList,
    lobbyRoomId,
    lobbyRoomPassword,
  };
}

function extractListPayload(source: any): any[] {
  if (Array.isArray(source)) return source;
  if (Array.isArray(source?.data)) return source.data;
  if (Array.isArray(source?.data?.data)) return source.data.data;
  if (Array.isArray(source?.data?.tournaments)) return source.data.tournaments;
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

export type TournamentResultRow = {
  rank: string;
  team: string;
  points: string;
  kills: string;
};

function extractSingleRecord(source: unknown): Record<string, unknown> | null {
  if (!source || typeof source !== 'object') return null;
  const root = source as Record<string, unknown>;
  const data = root.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  if (!Array.isArray(source)) return root;
  return null;
}

function extractArrayPayload(source: unknown): unknown[] {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== 'object') return [];
  const root = source as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data;
  const o = extractSingleRecord(source);
  if (o) {
    const candidates = [
      o.teams,
      o.joinedTeams,
      o.slots,
      o.rows,
      o.results,
      o.leaderboard,
      o.entries,
    ];
    for (const c of candidates) {
      if (Array.isArray(c)) return c;
    }
  }
  return [];
}

function asJoinedSlotRow(raw: unknown, index: number): JoinedTeamSlotRow {
  const r = asRecord(raw) ?? {};
  const slotRaw =
    r.slot ?? r.slotNumber ?? r.slotNo ?? r.position ?? r.index ?? index + 1;
  const slotLabel =
    typeof slotRaw === 'number' || /^\d+$/.test(String(slotRaw).trim())
      ? `Slot ${slotRaw}`
      : String(slotRaw).trim() || `Slot ${index + 1}`;
  const team = String(
    r.teamName ?? r.name ?? r.team ?? r.squadName ?? r.title ?? '',
  ).trim();
  const user = asRecord(r.user);
  const userName = String(
    user?.name ?? user?.username ?? user?.email ?? r.userName ?? r.username ?? '',
  ).trim();
  const primaryText = team || userName || 'Team';
  let secondaryText: string | undefined;
  if (Array.isArray(r.players)) {
    const names = r.players
      .map((p) => {
        const pr = asRecord(p);
        if (!pr) return String(p);
        return String(
          pr.name ?? pr.username ?? pr.ign ?? pr.playerName ?? '',
        ).trim();
      })
      .filter(Boolean);
    if (names.length) secondaryText = names.join(', ');
  } else if (userName && team) {
    secondaryText = userName;
  }
  return { slotLabel, primaryText, secondaryText };
}

function asResultRow(raw: unknown, index: number): TournamentResultRow {
  const r = asRecord(raw) ?? {};
  const rankVal =
    r.rank ?? r.position ?? r.pos ?? r.place ?? r.order ?? index + 1;
  const team = String(
    r.team ?? r.teamName ?? r.name ?? r.squad ?? r.player ?? '',
  ).trim();
  const pointsVal = r.points ?? r.totalPoints ?? r.score ?? r.pt ?? '—';
  const killsVal = r.kills ?? r.killCount ?? r.eliminations ?? '—';
  return {
    rank: String(rankVal),
    team: team || '—',
    points: String(pointsVal),
    kills: String(killsVal),
  };
}

/** Body for `POST /tournament/join` — team leader + optional teammate in-game names. */
export type JoinTournamentPayload = {
  tournamentId: string;
  teamName: string;
  /** Additional teammates (not including you); CS ≤4, BR/LW/squad ≤5 per API docs. */
  players: string[];
};

/** POST `/tournament/join` (authenticated). */
export async function joinUserTournament(payload: JoinTournamentPayload): Promise<void> {
  const tournamentId = String(payload.tournamentId ?? '').trim();
  const teamName = String(payload.teamName ?? '').trim();
  if (!tournamentId) throw new Error('Tournament id is required');
  if (!teamName) throw new Error('Team name is required');
  const players = (Array.isArray(payload.players) ? payload.players : [])
    .map((p) => String(p).trim())
    .filter(Boolean);
  await api.post(API_ENDPOINTS.TOURNAMENT.JOIN, {
    tournamentId,
    teamName,
    players,
  });
}

/** GET — slot-wise joined teams. */
export async function fetchTournamentJoinedTeams(
  tournamentId: string,
): Promise<JoinedTeamSlotRow[]> {
  const id = String(tournamentId ?? '').trim();
  if (!id) throw new Error('Tournament id is required');
  const res = await api.get<unknown>(API_ENDPOINTS.TOURNAMENT.JOINED_TEAMS(id));
  const payload = (res as { data?: unknown })?.data ?? res;
  const list = extractArrayPayload(payload);
  return list.map((row, idx) => asJoinedSlotRow(row, idx));
}

/** GET — refresh rules/metadata for modals when list payload is shallow. */
export async function fetchTournamentDetail(
  tournamentId: string,
): Promise<TournamentUiItem | null> {
  const id = String(tournamentId ?? '').trim();
  if (!id) throw new Error('Tournament id is required');
  const res = await api.get<unknown>(API_ENDPOINTS.TOURNAMENT.DETAIL(id));
  const payload = (res as { data?: unknown })?.data ?? res;
  const rec = extractSingleRecord(payload) ?? asRecord(payload);
  if (!rec) return null;
  return normalizeTournamentRow(rec, 0);
}

/** GET — point table / results snapshot. */
export async function fetchTournamentResults(
  tournamentId: string,
): Promise<TournamentResultRow[]> {
  const id = String(tournamentId ?? '').trim();
  if (!id) throw new Error('Tournament id is required');
  const res = await api.get<unknown>(API_ENDPOINTS.TOURNAMENT.RESULTS(id));
  const payload = (res as { data?: unknown })?.data ?? res;
  const list = extractArrayPayload(payload);
  return list.map((row, idx) => asResultRow(row, idx));
}

/** Row in aggregated standings from `GET .../live-results`. */
export type TournamentLiveStandingsRow = {
  position: number;
  teamName: string;
  totalPoint: number;
  kills: number;
  booyah: number;
  totalPositionPoints: number;
};

/** Per-match team line from `matchResults[].teams`. */
export type TournamentLiveMatchTeamRow = {
  teamName: string;
  position: number;
  kills: number;
  positionPoints: number;
  totalPoint: number;
  booyah: number;
};

export type TournamentLiveMatchResult = {
  matchIndex: number;
  teams: TournamentLiveMatchTeamRow[];
};

/** Parsed `data` from GET `/tournament/{id}/live-results` (envelope already unwrapped by `api.get`). */
export type TournamentLiveResultsPayload = {
  tournamentId?: string;
  game?: string;
  mode?: string;
  subMode?: string;
  date?: string;
  startTime?: string;
  status?: string;
  totalMatches?: number;
  standings: TournamentLiveStandingsRow[];
  matchResults: TournamentLiveMatchResult[];
};

function toFiniteNum(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseLiveStandingsRow(raw: unknown, index: number): TournamentLiveStandingsRow {
  const r = asRecord(raw) ?? {};
  return {
    position: Math.floor(toFiniteNum(r.position ?? r.rank ?? index + 1, index + 1)),
    teamName: String(r.teamName ?? r.team ?? r.name ?? '').trim() || '—',
    totalPoint: toFiniteNum(r.totalPoint ?? r.totalPoints ?? r.points ?? r.score, 0),
    kills: toFiniteNum(r.kills ?? r.killCount ?? r.eliminations, 0),
    booyah: toFiniteNum(r.booyah ?? r.win ?? r.wins, 0),
    totalPositionPoints: toFiniteNum(
      r.totalPositionPoints ?? r.positionPoints ?? r.placementPoints,
      0,
    ),
  };
}

function parseLiveMatchTeamRow(raw: unknown): TournamentLiveMatchTeamRow {
  const r = asRecord(raw) ?? {};
  return {
    teamName: String(r.teamName ?? r.team ?? r.name ?? '').trim() || '—',
    position: Math.floor(toFiniteNum(r.position ?? r.rank ?? r.place, 0)),
    kills: toFiniteNum(r.kills ?? r.killCount, 0),
    positionPoints: toFiniteNum(r.positionPoints ?? r.placementPoints, 0),
    totalPoint: toFiniteNum(r.totalPoint ?? r.totalPoints ?? r.points, 0),
    booyah: toFiniteNum(r.booyah, 0),
  };
}

function parseLiveMatchResult(raw: unknown): TournamentLiveMatchResult | null {
  const r = asRecord(raw);
  if (!r) return null;
  const matchIndex = Math.floor(toFiniteNum(r.matchIndex ?? r.matchNo ?? r.index, 0));
  const teamsRaw = r.teams;
  const teams = Array.isArray(teamsRaw) ? teamsRaw.map(parseLiveMatchTeamRow) : [];
  return { matchIndex, teams };
}

/**
 * Normalize live-results API body (or SSE payload) into standings + per-match tables.
 * Accepts either the inner `data` object or a full envelope with nested `data`.
 */
export function normalizeTournamentLiveResultsPayload(root: unknown): TournamentLiveResultsPayload {
  let rec = extractSingleRecord(root) ?? asRecord(root);
  if (!rec) {
    return { standings: [], matchResults: [] };
  }
  // Envelope: { data: { standings, ... } }
  const nested = asRecord(rec.data);
  if (nested && (Array.isArray(nested.standings) || Array.isArray(nested.matchResults))) {
    rec = nested;
  }

  const standingsRaw = rec.standings;
  const standings: TournamentLiveStandingsRow[] = Array.isArray(standingsRaw)
    ? standingsRaw.map((row, i) => parseLiveStandingsRow(row, i))
    : [];
  standings.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return b.totalPoint - a.totalPoint;
  });

  const matchResultsRaw = rec.matchResults ?? rec.matches;
  const matchResults: TournamentLiveMatchResult[] = [];
  if (Array.isArray(matchResultsRaw)) {
    for (const m of matchResultsRaw) {
      const parsed = parseLiveMatchResult(m);
      if (parsed) matchResults.push(parsed);
    }
  }
  matchResults.sort((a, b) => a.matchIndex - b.matchIndex);
  for (const m of matchResults) {
    m.teams.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return b.totalPoint - a.totalPoint;
    });
  }

  const tmRaw = rec.totalMatches;
  let totalMatches: number | undefined;
  if (typeof tmRaw === 'number' && Number.isFinite(tmRaw)) {
    totalMatches = tmRaw;
  } else if (tmRaw != null && String(tmRaw).trim() !== '') {
    const n = Number(tmRaw);
    if (Number.isFinite(n)) totalMatches = Math.floor(n);
  }

  return {
    tournamentId: rec.tournamentId != null ? String(rec.tournamentId).trim() : undefined,
    game: rec.game != null ? String(rec.game).trim() : undefined,
    mode: rec.mode != null ? String(rec.mode).trim() : undefined,
    subMode: rec.subMode != null ? String(rec.subMode).trim() : undefined,
    date: rec.date != null ? String(rec.date).trim() : undefined,
    startTime: rec.startTime != null ? String(rec.startTime).trim() : undefined,
    status: rec.status != null ? String(rec.status).trim() : undefined,
    totalMatches,
    standings,
    matchResults,
  };
}

/** GET — live standings + partial match rows (host updates). */
export async function fetchTournamentLiveResults(
  tournamentId: string,
): Promise<TournamentLiveResultsPayload> {
  const id = String(tournamentId ?? '').trim();
  if (!id) throw new Error('Tournament id is required');
  const res = await api.get<unknown>(API_ENDPOINTS.TOURNAMENT.LIVE_RESULTS(id));
  const payload = (res as { data?: unknown })?.data ?? res;
  return normalizeTournamentLiveResultsPayload(payload);
}

/** Legacy SSE payloads that send a bare leaderboard array. */
export function livePayloadFromLegacyLeaderboardArray(arr: unknown[]): TournamentLiveResultsPayload {
  const standings = arr.map((raw, idx) => parseLiveStandingsRow(raw, idx));
  standings.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return b.totalPoint - a.totalPoint;
  });
  return { standings, matchResults: [] };
}

/** SSE URL for live results (web); pass Bearer via `access_token` query. */
export function buildTournamentResultsStreamUrl(
  tournamentId: string,
  accessToken: string,
): string {
  const id = String(tournamentId ?? '').trim();
  if (!id) throw new Error('Tournament id is required');
  const base =
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)?.replace(
      /\/$/,
      '',
    ) || '';
  const path = API_ENDPOINTS.TOURNAMENT.RESULTS_STREAM(id).replace(/^\//, '');
  const t = encodeURIComponent(accessToken);
  return `${base}/${path}?access_token=${t}`;
}

export type ParsedUserTournamentRules = {
  matchTitle?: string;
  matchSubtitle?: string;
  /** Lobby / format rules (team size, room, timings, rewards flow, etc.). */
  lobbyBullets: string[];
  /** Cheating, conduct, bans, disqualification warnings. */
  fairPlayBullets: string[];
  killPointsLine?: string;
  positionRows: { label: string; points: string }[];
};

function normalizeRuleLine(s: string): string {
  return String(s)
    .trim()
    .replace(/^["']|["'],?$/g, '')
    .replace(/",$/, '')
    .replace(/^[\d]+[\.)]\s*/, '')
    .replace(/^[-*•]\s*/, '')
    .trim();
}

/**
 * Turn `rules` + lobby text into structured data for a friendly UI (bullets + point table).
 */
export function parseUserTournamentRules(
  lobbyRulesText: string | undefined,
  rules: Record<string, unknown> | null | undefined,
): ParsedUserTournamentRules {
  const bullets: string[] = [];
  const positionRows: { label: string; points: string }[] = [];
  let matchTitle: string | undefined;
  let matchSubtitle: string | undefined;
  let killPointsLine: string | undefined;
  let fairPlayFromApi: string[] = [];

  if (rules && Object.keys(rules).length) {
    fairPlayFromApi = collectFairPlayRulesFromRecord(rules);
    const t = rules.title != null ? String(rules.title).trim() : '';
    if (t) matchTitle = t;
    const mode = rules.mode != null ? String(rules.mode).trim() : '';
    const sub = rules.subMode != null ? String(rules.subMode).trim() : '';
    if (mode || sub) matchSubtitle = [mode, sub].filter(Boolean).join(' · ');

    const arrayKeys = [
      'rules',
      'ruleLines',
      'lobbyRules',
      'generalRules',
      'guidelines',
      'bulletPoints',
      'list',
    ];
    for (const k of arrayKeys) {
      const v = rules[k];
      if (
        Array.isArray(v) &&
        v.length &&
        v.every((x) => typeof x === 'string' || typeof x === 'number')
      ) {
        for (const line of v) {
          const n = normalizeRuleLine(String(line));
          if (n) bullets.push(n);
        }
        break;
      }
    }
    if (!bullets.length) {
      for (const v of Object.values(rules)) {
        if (
          Array.isArray(v) &&
          v.length &&
          (typeof v[0] === 'string' || typeof v[0] === 'number')
        ) {
          for (const line of v) {
            const n = normalizeRuleLine(String(line));
            if (n) bullets.push(n);
          }
          break;
        }
      }
    }

    const pointRoot =
      rules.pointSystem != null && typeof rules.pointSystem === 'object'
        ? (rules.pointSystem as Record<string, unknown>)
        : rules.points != null &&
            typeof rules.points === 'object' &&
            !Array.isArray(rules.points)
          ? (rules.points as Record<string, unknown>)
          : rules.scoring != null && typeof rules.scoring === 'object'
            ? (rules.scoring as Record<string, unknown>)
            : null;

    if (pointRoot) {
      const kill =
        pointRoot.killPoints ??
        pointRoot.kill ??
        pointRoot.perKill ??
        pointRoot.killPoint;
      if (kill != null && String(kill).trim()) {
        const ks = String(kill).trim();
        killPointsLine = ks.toLowerCase().includes('kill')
          ? ks
          : `${ks} point(s) per kill (team)`;
      }
      const posMap =
        pointRoot.positionPoints ??
        pointRoot.placementPoints ??
        pointRoot.positions ??
        pointRoot.placement;
      if (typeof posMap === 'string' && posMap.trim()) {
        positionRows.push(...parsePositionPointsFromFreeText(posMap));
      } else if (posMap && typeof posMap === 'object' && !Array.isArray(posMap)) {
        const ent = Object.entries(posMap as Record<string, unknown>);
        ent.sort((a, b) => {
          const na = Number(a[0]);
          const nb = Number(b[0]);
          if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
          return String(a[0]).localeCompare(String(b[0]));
        });
        for (const [k, v] of ent) {
          const kn = String(k).trim();
          const label = /^\d+$/.test(kn) ? placeOrdinalShort(Number(kn)) : kn;
          positionRows.push({
            label,
            points: formatPositionPointsCell(String(v)),
          });
        }
      }
    }

    const topPos = rules.positionPoints ?? rules.placementPoints ?? rules.placement;
    if (
      !positionRows.length &&
      topPos != null &&
      typeof topPos === 'string' &&
      String(topPos).trim()
    ) {
      positionRows.push(...parsePositionPointsFromFreeText(String(topPos)));
    } else if (
      !positionRows.length &&
      topPos &&
      typeof topPos === 'object' &&
      !Array.isArray(topPos)
    ) {
      const ent = Object.entries(topPos as Record<string, unknown>);
      ent.sort((a, b) => {
        const na = Number(a[0]);
        const nb = Number(b[0]);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return String(a[0]).localeCompare(String(b[0]));
      });
      for (const [k, v] of ent) {
        const kn = String(k).trim();
        const label = /^\d+$/.test(kn) ? placeOrdinalShort(Number(kn)) : kn;
        positionRows.push({
          label,
          points: formatPositionPointsCell(String(v)),
        });
      }
    }

    if (!killPointsLine) {
      const k = rules.killPoints ?? rules.killPoint;
      if (k != null && String(k).trim()) {
        killPointsLine = `${String(k).trim()} point(s) per kill (team)`;
      }
    }
  }

  if (lobbyRulesText?.trim() && !bullets.length) {
    const lines = lobbyRulesText
      .split(/\n+/)
      .map((x) => normalizeRuleLine(x))
      .filter(Boolean);
    bullets.push(...lines);
  }

  const seen = new Set<string>();
  let uniq = bullets.filter((b) => {
    if (seen.has(b)) return false;
    seen.add(b);
    return true;
  });

  const peeled = peelPositionRowsFromBullets(uniq);
  uniq = peeled.bullets;
  if (peeled.rows.length && !positionRows.length) {
    positionRows.push(...peeled.rows);
  }

  const killPeel = peelKillPointsLineFromBullets(uniq, killPointsLine);
  uniq = killPeel.bullets;
  if (killPeel.killLine && !killPointsLine) {
    killPointsLine = killPeel.killLine;
  }

  const { lobby, fairPlay } = splitLobbyAndFairPlayBullets(uniq);
  const fairSeen = new Set(fairPlay.map((x) => x.toLowerCase()));
  const fairMerged = [...fairPlay];
  for (const line of fairPlayFromApi) {
    const k = line.toLowerCase();
    if (fairSeen.has(k)) continue;
    fairSeen.add(k);
    fairMerged.push(line);
  }

  return {
    matchTitle,
    matchSubtitle,
    lobbyBullets: lobby,
    fairPlayBullets: fairMerged,
    killPointsLine,
    positionRows,
  };
}

/** Table column label: `1st`, `2nd`, `12th` (no word "place"). */
function placeOrdinalShort(n: number): string {
  const j = n % 10;
  const k = n % 100;
  let suf: string;
  if (k >= 11 && k <= 13) suf = 'th';
  else if (j === 1) suf = 'st';
  else if (j === 2) suf = 'nd';
  else if (j === 3) suf = 'rd';
  else suf = 'th';
  return `${n}${suf}`;
}

/**
 * Strip trailing "points" / "point" and return a clean numeric display (or best-effort).
 */
export function formatPositionPointsCell(raw: string): string {
  let s = String(raw).trim();
  s = s.replace(/\s*points?\s*$/i, '').trim();
  if (/^-?\d+(?:\.\d+)?$/.test(s)) return s;
  const tail = s.match(/(-?\d+(?:\.\d+)?)\s*$/);
  return tail ? tail[1] : s;
}

/**
 * Parse strings like "1st place - 12 points, 2nd place - 9 points, ..." into table rows.
 */
export function parsePositionPointsFromFreeText(s: string): { label: string; points: string }[] {
  const rows: { label: string; points: string }[] = [];
  const str = String(s).trim();
  if (!str) return rows;

  const re =
    /(\d+)(st|nd|rd|th)\s+place\s*[-–:]\s*(\d+)\s*(?:points?)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    rows.push({
      label: `${m[1]}${m[2].toLowerCase()}`,
      points: formatPositionPointsCell(m[3]),
    });
  }
  if (rows.length) return rows;

  const re2 = /(\d+)(st|nd|rd|th)\s*[-–:]\s*(\d+)\s*(?:points?)?/gi;
  while ((m = re2.exec(str)) !== null) {
    rows.push({
      label: `${m[1]}${m[2].toLowerCase()}`,
      points: formatPositionPointsCell(m[3]),
    });
  }
  return rows;
}

/**
 * Split mixed rule lines into lobby vs fair-play using keyword heuristics.
 */
export function splitLobbyAndFairPlayBullets(bullets: string[]): {
  lobby: string[];
  fairPlay: string[];
} {
  const fairRe =
    /\b(hack|hacking|cheat|cheating|aimbot|wallhack|inject|mod menu|third[-\s]?party|unauthorized\s+app|exploit|ghosting|smurf|account\s+sharing|share\s+your\s+account|vpn\s*hack|anti[-\s]?cheat|ban|banned|blacklist|disqualif|forfeit|forbidden\s+behav|violation|penalt|sanction|toxic|harass|abuse|disrespect|respectful\s+behav|fair\s*play|unsporting)\b/i;
  const lobby: string[] = [];
  const fairPlay: string[] = [];
  for (const b of bullets) {
    const s = String(b).trim();
    if (!s) continue;
    if (fairRe.test(s)) fairPlay.push(s);
    else lobby.push(s);
  }
  return { lobby, fairPlay };
}

function collectFairPlayRulesFromRecord(
  rules: Record<string, unknown>,
): string[] {
  const keys = [
    'fairPlayRules',
    'fair_play_rules',
    'antiCheatRules',
    'conductRules',
    'violationRules',
    'warnings',
    'banWarnings',
  ];
  const out: string[] = [];
  for (const fk of keys) {
    const v = rules[fk];
    if (!Array.isArray(v)) continue;
    for (const x of v) {
      const n = normalizeRuleLine(String(x));
      if (n) out.push(n);
    }
  }
  return out;
}

/** Lines like `Kill points: 1 per kill` → point tab; removed from lobby list. */
function peelKillPointsLineFromBullets(
  bullets: string[],
  existingKill?: string,
): { bullets: string[]; killLine?: string } {
  if (String(existingKill ?? '').trim()) {
    return { bullets };
  }
  let killLine: string | undefined;
  const out: string[] = [];
  for (const b of bullets) {
    const m = String(b).match(/^kill\s*points?\s*:\s*(.+)$/i);
    if (m) {
      const rest = m[1].trim();
      if (rest) killLine = rest;
      continue;
    }
    out.push(b);
  }
  return { bullets: out, killLine };
}

/** Pull position table out of rule bullets; drop consumed lines from the list. */
function peelPositionRowsFromBullets(
  bullets: string[],
): { bullets: string[]; rows: { label: string; points: string }[] } {
  const rows: { label: string; points: string }[] = [];
  const out: string[] = [];
  for (const b of bullets) {
    let text = b;
    const prefix = text.match(/^position\s*points\s*:\s*(.+)$/i);
    if (prefix) text = prefix[1].trim();
    const parsed = parsePositionPointsFromFreeText(text);
    if (parsed.length >= 2) {
      rows.push(...parsed);
      continue;
    }
    if (prefix) {
      out.push(b);
      continue;
    }
    const fullParsed = parsePositionPointsFromFreeText(b);
    if (fullParsed.length >= 2) {
      rows.push(...fullParsed);
      continue;
    }
    out.push(b);
  }
  return { bullets: out, rows };
}

/**
 * Human-readable point system / rules supplement from structured `rules` object.
 */
export function formatRulesRecordForDisplay(
  rules: Record<string, unknown> | null | undefined,
): string {
  if (!rules || !Object.keys(rules).length) return '';
  const skip = new Set(['subMode', 'sub_mode', 'mode']);
  const lines: string[] = [];
  const pointBlock =
    rules.pointSystem ??
    rules.points ??
    rules.scoring ??
    rules.pointTable ??
    rules.pointsTable;
  if (pointBlock != null && typeof pointBlock === 'object') {
    lines.push('Point system', JSON.stringify(pointBlock, null, 2), '');
  } else if (typeof pointBlock === 'string' && pointBlock.trim()) {
    lines.push('Point system', pointBlock.trim(), '');
  }
  const desc = rules.description ?? rules.instructions ?? rules.details;
  if (typeof desc === 'string' && desc.trim()) {
    lines.push('Details', desc.trim(), '');
  }
  const rest: Record<string, unknown> = {};
  Object.entries(rules).forEach(([k, v]) => {
    if (skip.has(k)) return;
    if (
      v === pointBlock ||
      k === 'pointSystem' ||
      k === 'points' ||
      k === 'scoring' ||
      k === 'pointTable' ||
      k === 'pointsTable'
    ) {
      return;
    }
    rest[k] = v;
  });
  if (Object.keys(rest).length) {
    lines.push('Rules (JSON)', JSON.stringify(rest, null, 2));
  }
  return lines.join('\n').trim();
}

