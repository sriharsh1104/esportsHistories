import { API_ENDPOINTS } from "@/constants/api";
import Constants from "expo-constants";
import type {
  HostAssignedLobby,
  HostAvailableTournament,
  HostMyLobbiesGrouped,
  HostPagedResult,
} from "@/types/host";
import { ApiError, request } from "./api.service";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/** SSE: `GET /host/applications/stream?access_token=…` — events `ready`, `host_application`. */
export function buildHostApplicationsStreamUrl(accessToken: string): string {
  const base =
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)?.replace(
      /\/$/,
      "",
    ) || "";
  const path = API_ENDPOINTS.HOST.APPLICATIONS_STREAM.replace(/^\//, "");
  const t = encodeURIComponent(accessToken);
  return `${base}/${path}?access_token=${t}`;
}

function strId(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function extractItemsArray(root: unknown): unknown[] {
  const r = asRecord(root);
  if (r && Array.isArray(r.tournaments)) return r.tournaments as unknown[];
  const data = r?.data ?? root;
  if (Array.isArray(data)) return data;
  const d = asRecord(data);
  if (!d) return [];
  if (Array.isArray(d.items)) return d.items;
  if (Array.isArray(d.tournaments)) return d.tournaments;
  if (Array.isArray(d.lobbies)) return d.lobbies;
  /** e.g. `lobbies: { upcoming: [], live: [] }` (flat merge for history/paged lists). */
  if (
    d.lobbies != null &&
    typeof d.lobbies === "object" &&
    !Array.isArray(d.lobbies)
  ) {
    const lb = asRecord(d.lobbies);
    if (lb) {
      const merged: unknown[] = [];
      for (const v of Object.values(lb)) {
        if (Array.isArray(v)) merged.push(...v);
      }
      if (merged.length) return merged;
    }
  }
  if (Array.isArray(d.results)) return d.results;
  return [];
}

function hostLobbiesBucketLabel(key: string): string {
  const s = key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim() || key;
  if (!s) return key;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeHostAvailableRow(raw: unknown): HostAvailableTournament | null {
  const o = asRecord(raw);
  if (!o) return null;
  const lobbyName =
    o.lobbyName != null ? String(o.lobbyName).trim() : undefined;
  const applyTournamentId =
    strId(o.tournamentId) ||
    strId(o._id) ||
    strId(o.id) ||
    strId(o.lobbyGroupId);
  let id = applyTournamentId;
  if (!id && lobbyName) {
    const datePart =
      o.date != null ? String(o.date).trim().slice(0, 10) : "";
    id = `avail-${lobbyName.replace(/\s+/g, "-").slice(0, 80)}${
      datePart ? `-${datePart}` : ""
    }`;
  }
  if (!id) return null;

  const rules = asRecord(o.rules);
  const subMode =
    rules?.subMode != null
      ? String(rules.subMode).trim()
      : o.subMode != null
        ? String(o.subMode).trim()
        : undefined;
  const rulesTitle =
    rules?.title != null ? String(rules.title).trim() : undefined;

  const prize = asRecord(o.potentialPrizePool);
  const winnerPrizePool =
    num(prize?.winnerPrizePool) ?? num(prize?.winner_pool);
  const totalPrizePool = num(prize?.totalPrizePool);
  const hostFee = num(prize?.hostFee);

  const maxTeams = num(o.maxTeams);
  const availableTeams = num(o.availableTeams);
  let joinedCount = num(o.joinedCount);
  let slotsAvailable = num(o.slotsAvailable);
  if (maxTeams != null && availableTeams != null) {
    slotsAvailable = availableTeams;
    joinedCount = Math.max(0, maxTeams - availableTeams);
  }

  const title =
    lobbyName ||
    String(o.name ?? o.title ?? o.tournamentName ?? "Tournament").trim() ||
    id;

  const hasApplied =
    o.hasApplied === true ||
    o.hasApplied === "true" ||
    o.hasApplied === 1 ||
    String(o.hasApplied).toLowerCase() === "true";
  const applicationStatus =
    o.applicationStatus != null
      ? String(o.applicationStatus).trim()
      : o.application_status != null
        ? String(o.application_status).trim()
        : undefined;
  const game = o.game != null ? String(o.game).trim() : undefined;
  const mode = o.mode != null ? String(o.mode).trim() : undefined;
  const date =
    o.date != null
      ? String(o.date).trim()
      : o.day != null
        ? String(o.day).trim()
        : undefined;
  const startTimeRaw =
    o.startTime ?? o.start_time ?? o.startsAt ?? o.scheduledAt;
  const startTime =
    startTimeRaw != null ? String(startTimeRaw).trim() : undefined;
  const status = o.status != null ? String(o.status).trim() : undefined;

  return {
    id,
    applyTournamentId: applyTournamentId || id,
    lobbyName,
    title: title || id,
    game,
    mode,
    subMode,
    rulesTitle,
    date,
    startTime,
    status,
    hasApplied,
    applicationStatus,
    lobbyCount: num(o.lobbyCount),
    maxTeams,
    joinedCount,
    slotsAvailable,
    maxPlayers: num(o.maxPlayers),
    playersPerTeam: num(o.playersPerTeam),
    entryFee: num(o.entryFee),
    winnerPrizePool,
    totalPrizePool,
    hostFee,
  };
}

function normalizeHostLobbyRow(
  raw: unknown,
  sectionLabel?: string,
): HostAssignedLobby | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id =
    strId(o._id) ||
    strId(o.id) ||
    strId(o.lobbyId) ||
    strId(o.tournamentId) ||
    strId(o.lobbyGroupId);
  if (!id) return null;
  const title = String(
    o.name ?? o.title ?? o.lobbyName ?? o.tournamentName ?? id,
  ).trim();
  const game = o.game != null ? String(o.game).trim() : undefined;
  const mode = o.mode != null ? String(o.mode).trim() : undefined;
  const rules = asRecord(o.rules);
  const subMode =
    rules?.subMode != null
      ? String(rules.subMode).trim()
      : o.subMode != null
        ? String(o.subMode).trim()
        : o.sub_mode != null
          ? String(o.sub_mode).trim()
          : undefined;
  const rulesTitle =
    rules?.title != null
      ? String(rules.title).trim()
      : o.rulesTitle != null
        ? String(o.rulesTitle).trim()
        : undefined;
  const date =
    o.date != null
      ? String(o.date).trim()
      : o.lobbyDate != null
        ? String(o.lobbyDate).trim()
        : undefined;
  const startTimeRaw = o.startTime ?? o.start_time ?? o.startsAt;
  const startTime =
    startTimeRaw != null ? String(startTimeRaw).trim() : undefined;
  const status = o.status != null ? String(o.status).trim() : undefined;

  const joinedTeamsArr = Array.isArray(o.joinedTeams) ? o.joinedTeams : undefined;
  const joinedCount =
    num(o.joinedCount ?? o.joinedTeamsCount ?? o.joinedTeams) ??
    (joinedTeamsArr ? joinedTeamsArr.length : undefined);
  const maxTeams = num(o.maxTeams ?? o.max_teams ?? o.totalSlot ?? o.totalSlots);
  const slotsAvailable =
    maxTeams != null
      ? Math.max(0, maxTeams - (joinedCount ?? 0))
      : undefined;
  const entryFee = num(o.entryFee ?? o.entry_fee);
  const lobbyCount = num(o.lobbyCount ?? o.lobbiesCount);
  const maxPlayers = num(o.maxPlayers ?? o.max_players);
  const playersPerTeam = num(o.playersPerTeam ?? o.players_per_team);
  const prize =
    asRecord(o.potentialPrizePool) ??
    asRecord(o.prizePool) ??
    asRecord(o.potential_prize_pool);
  const winnerPrizePool =
    num(prize?.winnerPrizePool) ??
    num(prize?.winner_pool) ??
    num(prize?.winnerPool) ??
    num(o.winnerPrizePool ?? o.winner_pool ?? o.winnerPool);
  const totalPrizePool =
    num(prize?.totalPrizePool) ??
    num(prize?.total_pool) ??
    num(prize?.totalPrize) ??
    num(o.totalPrizePool ?? o.total_pool ?? o.totalPrize);
  const feesBlock = asRecord(o.fees);
  const hostFee =
    num(prize?.hostFee) ??
    num(prize?.host_fee) ??
    num(feesBlock?.hostFee ?? feesBlock?.host_fee) ??
    num(o.hostFee ?? o.host_fee ?? o.hostFeeINR ?? o.host_fee_inr);

  const roomObj = asRecord(o.room);
  let currentRoomId: string | undefined;
  let currentRoomPassword: string | undefined;
  if (roomObj) {
    if (roomObj.roomId != null) {
      const r = String(roomObj.roomId).trim();
      if (r) currentRoomId = r;
    }
    if (roomObj.password != null) {
      const p = String(roomObj.password).trim();
      if (p) currentRoomPassword = p;
    }
  }

  return {
    id,
    title: title || id,
    game,
    mode,
    subMode,
    rulesTitle,
    date,
    startTime,
    status,
    sectionLabel,
    maxTeams,
    joinedCount,
    slotsAvailable,
    entryFee,
    lobbyCount,
    maxPlayers,
    playersPerTeam,
    winnerPrizePool,
    totalPrizePool,
    hostFee,
    currentRoomId,
    currentRoomPassword,
  };
}

export type FetchHostAvailableTournamentsParams = {
  page?: number;
  limit?: number;
  /** Swagger: `upcoming` | `locked` */
  status?: "upcoming" | "locked";
};

export async function fetchHostAvailableTournaments(
  params?: FetchHostAvailableTournamentsParams,
): Promise<HostPagedResult<HostAvailableTournament>> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const query: Record<string, string | number> = { page, limit };
  if (params?.status) query.status = params.status;

  const raw = await request<unknown>(
    API_ENDPOINTS.HOST.TOURNAMENTS_AVAILABLE,
    {
      params: query,
      toast: false,
    },
  );

  const root = asRecord(raw);
  const data = root?.data ?? raw;
  const list = extractItemsArray(raw);
  const d = asRecord(data) ?? {};
  const pageOut =
    typeof d.page === "number"
      ? d.page
      : typeof d.currentPage === "number"
        ? d.currentPage
        : typeof root?.page === "number"
          ? root.page
          : page;
  const limitOut =
    typeof d.limit === "number"
      ? d.limit
      : typeof d.itemsPerPage === "number"
        ? d.itemsPerPage
        : typeof root?.limit === "number"
          ? root.limit
          : limit;
  const total =
    typeof d.total === "number"
      ? d.total
      : typeof d.totalItems === "number"
        ? d.totalItems
        : typeof root?.total === "number"
          ? root.total
          : undefined;
  const totalPages =
    typeof d.totalPages === "number"
      ? d.totalPages
      : typeof root?.totalPages === "number"
        ? root.totalPages
        : undefined;

  const items = list
    .map((row) => normalizeHostAvailableRow(row))
    .filter((x): x is HostAvailableTournament => x != null);

  return {
    items,
    page: pageOut,
    limit: limitOut,
    total,
    totalPages,
  };
}

export type HostApplyTournamentBody = {
  applicationDetails: {
    experience?: string;
    reason?: string;
    additionalInfo?: string;
  };
};

export async function applyHostTournament(
  tournamentId: string,
  body: HostApplyTournamentBody,
): Promise<void> {
  const id = String(tournamentId).trim();
  if (!id) throw new ApiError("Tournament is required");

  await request<unknown>(API_ENDPOINTS.HOST.TOURNAMENT_APPLY(id), {
    method: "POST",
    body,
    toast: false,
  });
}

export type UpdateHostRoomBody = {
  roomId: string;
  password: string;
};

/** `POST /host/tournaments/{tournamentId}/update-room` — update room id / password for a lobby. */
export async function updateHostTournamentRoom(
  tournamentId: string,
  body: UpdateHostRoomBody,
): Promise<void> {
  const id = String(tournamentId).trim();
  if (!id) throw new ApiError("Tournament is required");
  if (!body.roomId || !body.roomId.trim()) {
    throw new ApiError("Room ID is required");
  }
  if (!body.password || !body.password.trim()) {
    throw new ApiError("Password is required");
  }

  await request<unknown>(API_ENDPOINTS.HOST.TOURNAMENT_UPDATE_ROOM(id), {
    method: "POST",
    body: {
      roomId: body.roomId.trim(),
      password: body.password.trim(),
    },
    toast: false,
  });
}

/** Active lobbies — call without `status` (Swagger). */
export async function fetchHostMyLobbiesActive(): Promise<HostMyLobbiesGrouped> {
  const raw = await request<unknown>(API_ENDPOINTS.HOST.MY_LOBBIES, {
    toast: false,
  });
  return normalizeHostMyLobbiesBody(raw);
}

export type FetchHostMyLobbiesHistoryParams = {
  status: "completed" | "cancelled" | "result_pending";
  date?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
};

export async function fetchHostMyLobbiesHistory(
  params: FetchHostMyLobbiesHistoryParams,
): Promise<HostPagedResult<HostAssignedLobby>> {
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 20, 100);
  const query: Record<string, string | number> = {
    status: params.status,
    page,
    limit,
  };
  if (params.date) query.date = params.date;
  if (params.fromDate) query.fromDate = params.fromDate;
  if (params.toDate) query.toDate = params.toDate;

  const raw = await request<unknown>(API_ENDPOINTS.HOST.MY_LOBBIES, {
    params: query,
    toast: false,
  });

  const root = asRecord(raw);
  const data = root?.data ?? raw;
  const list = extractItemsArray(data);
  const d = asRecord(data);
  const pageOut =
    typeof d?.page === "number"
      ? d.page
      : typeof d?.currentPage === "number"
        ? d.currentPage
        : page;
  const limitOut =
    typeof d?.limit === "number"
      ? d.limit
      : typeof d?.itemsPerPage === "number"
        ? d.itemsPerPage
        : limit;
  const total =
    typeof d?.total === "number"
      ? d.total
      : typeof d?.totalItems === "number"
        ? d.totalItems
        : undefined;
  const totalPages =
    typeof d?.totalPages === "number" ? d.totalPages : undefined;

  const items = list
    .map((row) => normalizeHostLobbyRow(row))
    .filter((x): x is HostAssignedLobby => x != null);

  return {
    items,
    page: pageOut,
    limit: limitOut,
    total,
    totalPages,
  };
}

function normalizeHostMyLobbiesBody(raw: unknown): HostMyLobbiesGrouped {
  const root = asRecord(raw);
  const data = root?.data ?? raw;

  if (Array.isArray(data)) {
    const items = data
      .map((row) => normalizeHostLobbyRow(row))
      .filter((x): x is HostAssignedLobby => x != null);
    return {
      sections: items.length
        ? [{ label: "Lobbies", items }]
        : [],
      flat: items,
    };
  }

  const r = asRecord(data);
  if (!r) {
    return { sections: [], flat: [] };
  }

  const sections: { label: string; items: HostAssignedLobby[] }[] = [];
  const flat: HostAssignedLobby[] = [];

  for (const [key, val] of Object.entries(r)) {
    if (
      key === "page" ||
      key === "limit" ||
      key === "total" ||
      key === "totalPages" ||
      key === "success" ||
      key === "message"
    ) {
      continue;
    }
    /** Swagger: `data.lobbies: { upcoming: [...], live: [...] }` */
    if (
      key === "lobbies" &&
      val != null &&
      typeof val === "object" &&
      !Array.isArray(val)
    ) {
      const buckets = asRecord(val);
      if (buckets) {
        for (const [bucketKey, bucketVal] of Object.entries(buckets)) {
          if (!Array.isArray(bucketVal)) continue;
          const items = bucketVal
            .map((row) => normalizeHostLobbyRow(row, bucketKey))
            .filter((x): x is HostAssignedLobby => x != null);
          if (items.length) {
            sections.push({
              label: hostLobbiesBucketLabel(bucketKey),
              items,
            });
            flat.push(...items);
          }
        }
      }
      continue;
    }
    if (!Array.isArray(val)) continue;
    const items = val
      .map((row) => normalizeHostLobbyRow(row, key))
      .filter((x): x is HostAssignedLobby => x != null);
    if (items.length) {
      const label = key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
      sections.push({
        label: label || key,
        items,
      });
      flat.push(...items);
    }
  }

  if (sections.length === 0 && Array.isArray(r.items)) {
    const items = (r.items as unknown[])
      .map((row) => normalizeHostLobbyRow(row))
      .filter((x): x is HostAssignedLobby => x != null);
    return {
      sections: items.length ? [{ label: "Lobbies", items }] : [],
      flat: items,
    };
  }

  return { sections, flat };
}
