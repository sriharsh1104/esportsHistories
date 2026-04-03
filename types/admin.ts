export type AdminFeesBreakdown = {
  platformFeeINR?: number;
  casterFeeINR?: number;
  hostFeeINR?: number;
  totalFeesINR?: number;
  winnerPoolPaidINR?: number;
  /** legacy */
  platformFeeGC?: number;
  casterFeeGC?: number;
  hostFeeGC?: number;
  totalFeesGC?: number;
  winnerPoolPaidGC?: number;
};

export type AdminLobbyStats = {
  totalCreated?: number;
  finishedSuccessful?: number;
  cancelled?: number;
  running?: number;
};

/** GET `/admin/dashboard/stats` or SSE `{ type: "dashboard", data }`. */
export type AdminDashboardStats = {
  totalUsers?: number;
  /** Alias: wallet top-ups type topup, success, addedBy user (UPI / Cashfree). */
  totalDepositsINR?: number;
  /** Same aggregate as `totalDepositsINR` when API sends both. */
  userSelfTopupsINR?: number;
  /** Top-ups addedBy admin. */
  adminManualTopupsINR?: number;
  /** userSelf + admin manual only (no system / host-fee wallet lines). */
  totalTopupsINR?: number;
  /** @deprecated Legacy; prefer totalTopupsINR. */
  totalTopupGC?: number;
  /** Usually equals `lobbyStats.running`. */
  activeLobbyCount?: number;
  /** Full tournament collection stats (all time). */
  lobbyStats?: AdminLobbyStats;
  prizePoolDistributed?: number;
  totalHostFeePaid?: number;
  platformFeeCollected?: number;
  casterFeeCollected?: number;
  /** Platform + caster fee from finished lobbies (tournament se earn). */
  platformProfit?: number;
  tournamentFeeProfitINR?: number;
  /** Same as tournament fee profit (legacy / convenience). */
  netProfit?: number;
  /** User top-ups minus prizes — wallet flow, not platform fee profit. */
  walletNetFlowINR?: number;
  feesBreakdown?: AdminFeesBreakdown;
  [key: string]: unknown;
};

export type AdminUserRow = {
  id: string;
  email: string;
  displayName?: string;
  fullName?: string;
  name?: string;
  role?: string;
  status?: string;
  isVerified?: boolean;
  /** Account login block (admin list / block APIs). */
  isBlocked?: boolean;
};

export type AdminUsersPage = {
  items: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type AdminUserRoleFilter =
  | "ALL"
  | "ADMIN"
  | "HOST"
  | "USER"
  | "ORG_MANAGER";

export type AdminFinancePeriod = "daily" | "weekly" | "monthly";

export type AdminOrganization = {
  id: string;
  name: string;
  slug: string;
  managerEmail?: string;
  managerName?: string;
  managerId?: string;
  isBlocked?: boolean;
};

export type AdminOrganizationsPage = {
  items: AdminOrganization[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/** Normalized points for the admin revenue / profit chart. */
export type AdminFinancialSeries = {
  labels: string[];
  totalIncome: number[];
  netProfit: number[];
};

/** Item from `GET /admin/games/catalog` — use `slug` (or `title`) with `generate-lobbies`. */
export type AdminCatalogGame = {
  title: string;
  slug: string;
  platform?: string;
};

/** Normalized row for `GET /admin/tournaments` (admin-only tournament list). */
export type AdminTournamentRow = {
  /** Tournament or lobby collection id (stringified). */
  id: string;
  /** Primary game slug or title (if available). */
  game?: string;
  /** High-level mode, e.g. BR, CS, LW. */
  mode?: string;
  /** Sub-mode, e.g. solo, duo, squad, 1v1, 2v2, 4v4. */
  subMode?: string;
  /** Backend status: upcoming | live | completed | pendingResult | other. */
  status?: string;
  /** Lobby / tournament display name (e.g. "Lobby 1 10:30 PM"). */
  lobbyName?: string;
  /** Localized or ISO start time for the lobby. */
  startTime?: string;
  /** ISO or yyyy-mm-dd date for the lobby day. */
  date?: string;
  /** Optional explicit from / to dates when range queries are used. */
  fromDate?: string;
  toDate?: string;
  /** Human-friendly name / label if server sends it. */
  name?: string;
  /** Count of lobbies generated under this tournament, when backend exposes it. */
  lobbyCount?: number;
  /** Max teams / total slots. */
  maxTeams?: number;
  /** Winner prize pool amount in INR (or main currency). */
  winnerPrizePool?: number;
  /** Total platform+host+caster fees for this lobby/tournament. */
  totalFees?: number;
  /** Total prize pool (including winner + other positions). */
  totalPrizePool?: number;
  /** Entry fee per slot / team. */
  entryFee?: number;
  /** Number of teams/players already joined. */
  joinedCount?: number;
  /** Derived available slots when backend exposes max + joined. */
  slotsAvailable?: number;
  /** Set when a host is assigned to this tournament (admin list / assign-host). */
  assignedHostId?: string;
  assignedHostName?: string;
  assignedHostEmail?: string;
  /** Raw payload hook to surface additional fields if needed. */
  [key: string]: unknown;
};

/** Normalized row for `GET /admin/host-applications` (admin-only host applications). */
export type AdminHostApplication = {
  /** Application id (stringified). */
  id: string;
  /** Host user id if backend exposes it. */
  hostId?: string;
  /** Tournament / lobby-group id this application targets, when available. */
  tournamentId?: string;
  /** Applicant display name. */
  hostName?: string;
  /** Applicant email. */
  hostEmail?: string;
  /** Status: pending | approved | rejected. */
  status?: string;
  /** Optional admin notes / rejection reason. */
  adminNotes?: string;
  /** When the application was created (ISO or localized). */
  createdAt?: string;
  /** Any extra fields from backend. */
  [key: string]: unknown;
};
