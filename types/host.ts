/** Host JWT — available tournaments to apply (`GET /host/tournaments/available`). */
export type HostAvailableTournament = {
  /** Stable list key (may be synthetic if API omits ids). */
  id: string;
  /** Prefer for POST `/host/tournaments/:id/apply` when backend provides it. */
  applyTournamentId: string;
  /** Same keys as admin list + host apply metadata. */
  lobbyName?: string;
  title: string;
  game?: string;
  mode?: string;
  subMode?: string;
  rulesTitle?: string;
  date?: string;
  startTime?: string;
  /** Tournament listing status, e.g. upcoming | locked. */
  status?: string;
  hasApplied: boolean;
  applicationStatus?: string;
  lobbyCount?: number;
  maxTeams?: number;
  joinedCount?: number;
  slotsAvailable?: number;
  maxPlayers?: number;
  playersPerTeam?: number;
  entryFee?: number;
  winnerPrizePool?: number;
  totalPrizePool?: number;
  /** From `potentialPrizePool.hostFee`. */
  hostFee?: number;
};

/** Host JWT — one assigned / historical lobby row (`GET /host/my-lobbies`). */
export type HostAssignedLobby = {
  id: string;
  title: string;
  game?: string;
  mode?: string;
  subMode?: string;
  /** e.g. rules.title — “Battle Royale Squad”. */
  rulesTitle?: string;
  date?: string;
  startTime?: string;
  status?: string;
  /** When API groups by bucket (e.g. upcoming / live). */
  sectionLabel?: string;
  maxTeams?: number;
  joinedCount?: number;
  slotsAvailable?: number;
  lobbyCount?: number;
  maxPlayers?: number;
  playersPerTeam?: number;
  entryFee?: number;
  winnerPrizePool?: number;
  totalPrizePool?: number;
  hostFee?: number;
  /** From `room` when backend returns current ids. */
  currentRoomId?: string;
  currentRoomPassword?: string;
};

export type HostPagedResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total?: number;
  totalPages?: number;
};

export type HostMyLobbiesGrouped = {
  sections: { label: string; items: HostAssignedLobby[] }[];
  flat: HostAssignedLobby[];
};
