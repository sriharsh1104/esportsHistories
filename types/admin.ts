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
};

export type AdminUsersPage = {
  items: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type AdminUserRoleFilter = 'ALL' | 'ADMIN' | 'HOST' | 'USER' | 'ORG_MANAGER';

export type AdminFinancePeriod = 'daily' | 'weekly' | 'monthly';

/** Normalized points for the admin revenue / profit chart. */
export type AdminFinancialSeries = {
  labels: string[];
  totalIncome: number[];
  netProfit: number[];
};
