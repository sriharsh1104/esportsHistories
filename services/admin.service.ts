import { API_ENDPOINTS } from "@/constants/api";
import type {
  AdminCatalogGame,
  AdminDashboardStats,
  AdminFinancePeriod,
  AdminFinancialSeries,
  AdminHostApplication,
  AdminOrganization,
  AdminOrganizationsPage,
  AdminTournamentRow,
  AdminUserRoleFilter,
  AdminUserRow,
  AdminUsersPage,
} from "@/types/admin";
import Constants from "expo-constants";
import { ApiError, request } from "./api.service";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function strId(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** ObjectId / populated ref: backend may send a string id or `{ _id, ... }`. */
function refId(v: unknown): string {
  const r = asRecord(v);
  if (r) {
    const id = strId(r._id) || strId(r.id);
    if (id) return id;
  }
  if (typeof v === "string" || typeof v === "number") return strId(v);
  return "";
}

function pickUserId(row: Record<string, unknown>): string {
  return (
    strId(row._id) || strId(row.id) || strId(row.userId) || strId(row.uid) || ""
  );
}

function normalizeUserRow(raw: unknown): AdminUserRow | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickUserId(row);
  const emailRaw = row.email ?? row.userEmail;
  const email = emailRaw != null ? String(emailRaw).trim() : "";
  if (!id || !email) return null;
  const name =
    row.name != null
      ? String(row.name)
      : row.fullName != null
        ? String(row.fullName)
        : row.displayName != null
          ? String(row.displayName)
          : undefined;
  const displayName = row.displayName != null ? String(row.displayName) : name;
  const fullName = row.fullName != null ? String(row.fullName) : name;
  return {
    id,
    email,
    displayName,
    fullName,
    name,
    role: row.role != null ? String(row.role) : undefined,
    status: row.status != null ? String(row.status) : undefined,
    isVerified:
      typeof row.isVerified === "boolean"
        ? row.isVerified
        : row.isEmailVerified === true || row.verified === true,
    isBlocked:
      typeof row.isBlocked === "boolean"
        ? row.isBlocked
        : row.blocked === true ||
          (typeof row.isActive === "boolean" ? !row.isActive : false),
  };
}

function normalizeFeesBreakdown(
  raw: unknown,
): AdminDashboardStats["feesBreakdown"] {
  const o = asRecord(raw);
  if (!o) return undefined;
  return {
    platformFeeINR: num(o.platformFeeINR ?? o.platformFeeGC),
    casterFeeINR: num(o.casterFeeINR ?? o.casterFeeGC),
    hostFeeINR: num(o.hostFeeINR ?? o.hostFeeGC),
    totalFeesINR: num(o.totalFeesINR ?? o.totalFeesGC),
    winnerPoolPaidINR: num(o.winnerPoolPaidINR ?? o.winnerPoolPaidGC),
    platformFeeGC: num(o.platformFeeGC),
    casterFeeGC: num(o.casterFeeGC),
    hostFeeGC: num(o.hostFeeGC),
    totalFeesGC: num(o.totalFeesGC),
    winnerPoolPaidGC: num(o.winnerPoolPaidGC),
  };
}

function normalizeLobbyStats(raw: unknown): AdminDashboardStats["lobbyStats"] {
  const o = asRecord(raw);
  if (!o) return undefined;
  return {
    totalCreated: num(o.totalCreated),
    finishedSuccessful: num(o.finishedSuccessful),
    cancelled: num(o.cancelled),
    running: num(o.running),
  };
}

/** Merges common Swagger-style stats shape into a single view model. */
export function normalizeDashboardStats(raw: unknown): AdminDashboardStats {
  const root = asRecord(raw);
  const inner = root?.data != null ? asRecord(root.data) : root;
  const data = inner ?? {};
  const feesRaw = data.feesBreakdown ?? data.feeBreakdown;
  const userSelf = num(data.userSelfTopupsINR) ?? num(data.totalDepositsINR);
  const deposits = num(data.totalDepositsINR) ?? num(data.userSelfTopupsINR);
  const lobbyBase = normalizeLobbyStats(data.lobbyStats);
  const activeLobbies = num(data.activeLobbyCount);
  const lobbyStatsMerged =
    lobbyBase || activeLobbies != null
      ? {
          totalCreated: lobbyBase?.totalCreated,
          finishedSuccessful: lobbyBase?.finishedSuccessful,
          cancelled: lobbyBase?.cancelled,
          running: lobbyBase?.running ?? activeLobbies,
        }
      : undefined;
  return {
    totalUsers: num(data.totalUsers),
    totalDepositsINR: deposits,
    userSelfTopupsINR: userSelf,
    adminManualTopupsINR: num(data.adminManualTopupsINR),
    totalTopupsINR:
      num(data.totalTopupsINR) ??
      num(data.totalTopupGC) ??
      num(data.totalTopUpGC),
    totalTopupGC: num(data.totalTopupGC ?? data.totalTopUpGC),
    activeLobbyCount: activeLobbies ?? lobbyBase?.running,
    lobbyStats: lobbyStatsMerged,
    prizePoolDistributed: num(data.prizePoolDistributed),
    totalHostFeePaid: num(data.totalHostFeePaid),
    platformFeeCollected: num(data.platformFeeCollected),
    casterFeeCollected: num(data.casterFeeCollected),
    platformProfit: num(data.platformProfit ?? data.tournamentFeeProfitINR),
    tournamentFeeProfitINR: num(
      data.tournamentFeeProfitINR ?? data.platformProfit,
    ),
    netProfit: num(
      data.netProfit ?? data.platformProfit ?? data.tournamentFeeProfitINR,
    ),
    walletNetFlowINR: num(data.walletNetFlowINR),
    feesBreakdown: normalizeFeesBreakdown(feesRaw),
  };
}

/**
 * SSE / stream payloads: `{ type: "dashboard", data: { ... } }` or wrapped `{ data: stats }`.
 */
export function parseAdminDashboardStreamPayload(
  raw: unknown,
): AdminDashboardStats | null {
  try {
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    const o = asRecord(parsed);
    if (!o) return null;
    if (o.type === "dashboard" && o.data != null) {
      return normalizeDashboardStats({ data: o.data });
    }
    if (o.type === "stats" && o.data != null) {
      return normalizeDashboardStats({ data: o.data });
    }
    return normalizeDashboardStats(parsed);
  } catch {
    return null;
  }
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const raw = await request<unknown>(API_ENDPOINTS.ADMIN.DASHBOARD_STATS, {
    toast: false,
  });
  return normalizeDashboardStats(raw);
}

/** Full URL for SSE (browser EventSource cannot send Authorization header). */
export function buildAdminDashboardStreamUrl(accessToken: string): string {
  const base =
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)?.replace(
      /\/$/,
      "",
    ) || "";
  const path = API_ENDPOINTS.ADMIN.DASHBOARD_STREAM.replace(/^\//, "");
  const t = encodeURIComponent(accessToken);
  return `${base}/${path}?access_token=${t}`;
}

/** SSE: `GET /admin/host-applications/stream?access_token=…` — event `host_application`. */
export function buildAdminHostApplicationsStreamUrl(
  accessToken: string,
): string {
  const base =
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)?.replace(
      /\/$/,
      "",
    ) || "";
  const path = API_ENDPOINTS.ADMIN.HOST_APPLICATIONS_STREAM.replace(
    /^\//,
    "",
  );
  const t = encodeURIComponent(accessToken);
  return `${base}/${path}?access_token=${t}`;
}

function formatChartLabel(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const ts = Date.parse(s);
  if (!Number.isNaN(ts)) {
    try {
      return new Intl.DateTimeFormat("en", { weekday: "short" }).format(
        new Date(ts),
      );
    } catch {
      return s.length > 6 ? s.slice(0, 6) : s;
    }
  }
  return s.length > 10 ? s.slice(0, 10) : s;
}

function toNumArrayLoose(v: unknown): number[] | undefined {
  if (!Array.isArray(v) || v.length === 0) return undefined;
  const out: number[] = [];
  for (const x of v) {
    const n = typeof x === "number" ? x : Number(x);
    out.push(Number.isFinite(n) ? n : 0);
  }
  return out;
}

function toLabelArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v) || v.length === 0) return undefined;
  return v.map((x) => formatChartLabel(String(x)));
}

function pickNumberSeries(
  obj: Record<string, unknown>,
  keys: string[],
): number[] | undefined {
  for (const k of keys) {
    const arr = toNumArrayLoose(obj[k]);
    if (arr && arr.length) return arr;
  }
  return undefined;
}

function pickLabelSeries(
  obj: Record<string, unknown>,
  keys: string[],
): string[] | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v) && v.length) return toLabelArray(v);
  }
  return undefined;
}

function seriesFromPointRows(rows: unknown[]): AdminFinancialSeries | null {
  const labels: string[] = [];
  const totalIncome: number[] = [];
  const netProfit: number[] = [];
  let idx = 0;
  for (const r of rows) {
    const o = asRecord(r);
    if (!o) continue;
    const rawLabel =
      o.label ?? o.date ?? o.period ?? o.week ?? o.month ?? o.day ?? o.name;
    const label =
      rawLabel != null && String(rawLabel).trim()
        ? formatChartLabel(String(rawLabel))
        : String(idx + 1);
    const inc = num(
      o.totalIncome ?? o.income ?? o.totalIncomeINR ?? o.deposits ?? o.deposit,
    );
    const pr = num(
      o.netProfit ?? o.profit ?? o.netProfitINR ?? o.platformProfit,
    );
    if (inc == null && pr == null) continue;
    labels.push(label);
    totalIncome.push(inc ?? 0);
    netProfit.push(pr ?? 0);
    idx += 1;
  }
  return labels.length ? { labels, totalIncome, netProfit } : null;
}

/** When only one series exists, pad the other with zeros; allow mismatched lengths. */
function mergeFlexibleSeries(
  labels: string[] | undefined,
  income: number[] | undefined,
  profit: number[] | undefined,
): AdminFinancialSeries | null {
  const ni = income?.length ?? 0;
  const np = profit?.length ?? 0;
  if (ni === 0 && np === 0) return null;
  const n = Math.max(ni, np, labels?.length ?? 0, 1);
  const inc = Array.from({ length: n }, (_, i) =>
    i < ni && income ? income[i]! : 0,
  );
  const pr = Array.from({ length: n }, (_, i) =>
    i < np && profit ? profit[i]! : 0,
  );
  let L: string[];
  if (labels && labels.length >= n) L = labels.slice(0, n);
  else if (labels && labels.length > 0) {
    L = [
      ...labels,
      ...Array.from({ length: n - labels.length }, (_, i) =>
        String(labels.length + i + 1),
      ),
    ];
  } else {
    L = Array.from({ length: n }, (_, i) => String(i + 1));
  }
  return { labels: L, totalIncome: inc, netProfit: pr };
}

function seriesHasPoints(s: AdminFinancialSeries): boolean {
  return s.totalIncome.length > 0 || s.netProfit.length > 0;
}

function extractFinancialSeriesFromData(
  data: Record<string, unknown>,
): AdminFinancialSeries | null {
  const nestedKeys = [
    "financialAnalytics",
    "analytics",
    "financial",
    "chart",
    "timeSeries",
    "timeseries",
  ];
  for (const nk of nestedKeys) {
    const inner = asRecord(data[nk]);
    if (inner) {
      const got = extractFinancialSeriesFromData(inner);
      if (got != null && seriesHasPoints(got)) return got;
    }
  }

  const rows = data.series ?? data.points ?? data.buckets ?? data.records;
  if (Array.isArray(rows) && rows.length && typeof rows[0] === "object") {
    const fromRows = seriesFromPointRows(rows);
    if (fromRows) return fromRows;
  }

  const income = pickNumberSeries(data, [
    "totalIncome",
    "totalIncomeINR",
    "income",
    "totalDeposits",
    "totalDepositsINR",
    "deposits",
    "rewards",
    "totalRewards",
    "totalIncomeSeries",
    "incomes",
    "depositSeries",
    "depositTrend",
  ]);
  const profit = pickNumberSeries(data, [
    "netProfit",
    "netProfitINR",
    "profit",
    "profits",
    "platformProfit",
    "profitSeries",
    "netProfits",
    "profitTrend",
  ]);
  const labels = pickLabelSeries(data, [
    "labels",
    "categories",
    "dates",
    "periods",
    "xLabels",
    "axisLabels",
  ]);

  return mergeFlexibleSeries(labels, income, profit);
}

/** Normalize admin financial chart data from `/admin/analytics` or `/admin/dashboard/stats?period=`. */
export function normalizeFinancialSeries(raw: unknown): AdminFinancialSeries {
  const root = asRecord(raw);
  const data = asRecord(root?.data) ?? root ?? {};
  const got = extractFinancialSeriesFromData(data);
  return got ?? { labels: [], totalIncome: [], netProfit: [] };
}

/**
 * One analytics request (lowercase `period`, Swagger-style), then one stats fallback — no casing retries.
 */
export async function fetchAdminFinancialSeries(
  period: AdminFinancePeriod,
): Promise<AdminFinancialSeries> {
  const p = String(period).toLowerCase() as AdminFinancePeriod;
  try {
    const raw = await request<unknown>(API_ENDPOINTS.ADMIN.ANALYTICS, {
      params: { period: p },
      toast: false,
    });
    const s = normalizeFinancialSeries(raw);
    if (seriesHasPoints(s)) return s;
  } catch {
    /* fall through to stats */
  }
  try {
    const raw = await request<unknown>(API_ENDPOINTS.ADMIN.DASHBOARD_STATS, {
      params: { period: p },
      toast: false,
    });
    const s = normalizeFinancialSeries(raw);
    if (seriesHasPoints(s)) return s;
  } catch {
    /* empty */
  }
  return { labels: [], totalIncome: [], netProfit: [] };
}

/** True if SSE / envelope includes plottable series (same rules as API normalize). */
export function adminFinancialChartHasData(s: AdminFinancialSeries): boolean {
  return seriesHasPoints(s);
}

export type FetchAdminUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminUserRoleFilter;
};

function normalizeUsersPage(
  raw: unknown,
  page: number,
  limit: number,
): AdminUsersPage {
  const root = asRecord(raw);
  const data = root?.data != null ? asRecord(root.data) : root;
  const d = data ?? {};
  const listRaw: unknown =
    d.users ??
    d.items ??
    d.data ??
    (Array.isArray(d.results) ? d.results : undefined) ??
    root?.users;
  const list = Array.isArray(listRaw) ? listRaw : [];
  const items = list
    .map((row) => normalizeUserRow(row))
    .filter((x): x is AdminUserRow => x != null);

  const total =
    num(d.total) ??
    num(d.totalCount) ??
    num(root?.total) ??
    num((root as { totalCount?: unknown })?.totalCount) ??
    items.length;
  const totalPagesRaw = num(d.totalPages) ?? num(d.pages);
  const totalPages =
    totalPagesRaw ?? (limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);

  return {
    items,
    total,
    page: num(d.page) ?? num(d.currentPage) ?? page,
    limit: num(d.limit) ?? num(d.pageSize) ?? limit,
    totalPages,
  };
}

/** Query `role` — align with backend `UserRole` / typical Swagger enums. */
function adminRoleFilterToApiParam(
  role: AdminUserRoleFilter,
): string | undefined {
  if (role === "ALL") return undefined;
  const map: Record<Exclude<AdminUserRoleFilter, "ALL">, string> = {
    ADMIN: "admin",
    HOST: "host",
    USER: "user",
    ORG_MANAGER: "org_manager",
  };
  return map[role];
}

export async function fetchAdminUsers(
  params: FetchAdminUsersParams,
): Promise<AdminUsersPage> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const query: Record<string, string | number | undefined> = { page, limit };
  const q = params.search?.trim();
  if (q) query.search = q;
  const roleParam = params.role
    ? adminRoleFilterToApiParam(params.role)
    : undefined;
  if (roleParam) query.role = roleParam;

  const raw = await request<unknown>(API_ENDPOINTS.ADMIN.USERS, {
    params: query,
    toast: false,
  });
  return normalizeUsersPage(raw, page, limit);
}

export async function blockAdminUsers(userIds: string[]): Promise<void> {
  const ids = [
    ...new Set(userIds.map((x) => String(x).trim()).filter(Boolean)),
  ];
  if (ids.length === 0) return;
  await request<unknown>(API_ENDPOINTS.ADMIN.USERS_BLOCK, {
    method: "POST",
    body: { userIds: ids },
    toast: false,
  });
}

export async function unblockAdminUsers(userIds: string[]): Promise<void> {
  const ids = [
    ...new Set(userIds.map((x) => String(x).trim()).filter(Boolean)),
  ];
  if (ids.length === 0) return;
  await request<unknown>(API_ENDPOINTS.ADMIN.USERS_UNBLOCK, {
    method: "POST",
    body: { userIds: ids },
    toast: false,
  });
}

/** Body for admin manual host / org manager creation (matches `/admin/hosts/create`). */
export type AdminManualAccountCreateBody = {
  email: string;
  name: string;
  password: string;
};

export async function createAdminHost(
  body: AdminManualAccountCreateBody,
): Promise<unknown> {
  return request<unknown>(API_ENDPOINTS.ADMIN.HOSTS_CREATE, {
    method: "POST",
    body,
    toast: false,
  });
}

export async function createAdminOrgManager(
  body: AdminManualAccountCreateBody,
): Promise<unknown> {
  return request<unknown>(API_ENDPOINTS.ADMIN.ORG_MANAGERS_CREATE, {
    method: "POST",
    body,
    toast: false,
  });
}

export type AdminCreateOrgBody = {
  name: string;
  slug: string;
  manager: {
    email: string;
    name: string;
    password: string;
  };
};

export async function createAdminOrganization(
  body: AdminCreateOrgBody,
): Promise<unknown> {
  return request<unknown>(API_ENDPOINTS.ADMIN.ORGANIZATIONS, {
    method: "POST",
    body,
    toast: false,
  });
}

export type FetchAdminOrgsParams = {
  page?: number;
  limit?: number;
  search?: string;
};

function normalizeOrgRow(raw: unknown): AdminOrganization | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = strId(row._id) || strId(row.id) || strId(row.orgId) || "";
  const name = row.name != null ? String(row.name).trim() : "";
  if (!id || !name) return null;
  const manager = asRecord(row.manager);
  return {
    id,
    name,
    slug: row.slug != null ? String(row.slug).trim() : "",
    managerEmail: manager?.email != null ? String(manager.email) : undefined,
    managerName: manager?.name != null ? String(manager.name) : undefined,
    managerId:
      manager?._id != null
        ? String(manager._id)
        : manager?.id != null
          ? String(manager.id)
          : undefined,
    isBlocked:
      typeof row.isBlocked === "boolean"
        ? row.isBlocked
        : row.blocked === true ||
          (typeof row.isActive === "boolean" ? !row.isActive : false),
  };
}

function normalizeOrgsPage(
  raw: unknown,
  page: number,
  limit: number,
): AdminOrganizationsPage {
  const root = asRecord(raw);
  const data = root?.data != null ? asRecord(root.data) : root;
  const d = data ?? {};
  const listRaw: unknown =
    d.organizations ??
    d.items ??
    d.data ??
    (Array.isArray(d.results) ? d.results : undefined) ??
    root?.organizations;
  const list = Array.isArray(listRaw) ? listRaw : [];
  const items = list
    .map((r) => normalizeOrgRow(r))
    .filter((x): x is AdminOrganization => x != null);

  const total =
    num(d.total) ?? num(d.totalCount) ?? num(root?.total) ?? items.length;
  const totalPagesRaw = num(d.totalPages) ?? num(d.pages);
  const totalPages =
    totalPagesRaw ?? (limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);

  return {
    items,
    total,
    page: num(d.page) ?? num(d.currentPage) ?? page,
    limit: num(d.limit) ?? num(d.pageSize) ?? limit,
    totalPages,
  };
}

export async function fetchAdminOrganizations(
  params: FetchAdminOrgsParams,
): Promise<AdminOrganizationsPage> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const query: Record<string, string | number | undefined> = { page, limit };
  const q = params.search?.trim();
  if (q) query.search = q;

  const raw = await request<unknown>(API_ENDPOINTS.ADMIN.ORGANIZATIONS, {
    params: query,
    toast: false,
  });
  return normalizeOrgsPage(raw, page, limit);
}

export type AdminUpdateOrgManagerBody = {
  email: string;
  name: string;
  password: string;
};

export async function updateAdminOrgManager(
  orgId: string,
  body: AdminUpdateOrgManagerBody,
): Promise<unknown> {
  return request<unknown>(
    API_ENDPOINTS.ADMIN.ORGANIZATIONS_UPDATE_MANAGER(orgId),
    {
      method: "PATCH",
      body,
      toast: false,
    },
  );
}

export async function blockAdminOrganization(orgId: string): Promise<unknown> {
  return request<unknown>(API_ENDPOINTS.ADMIN.ORGANIZATIONS_BLOCK(orgId), {
    method: "PATCH",
    toast: false,
  });
}

export async function unblockAdminOrganization(
  orgId: string,
): Promise<unknown> {
  return request<unknown>(API_ENDPOINTS.ADMIN.ORGANIZATIONS_UNBLOCK(orgId), {
    method: "PATCH",
    toast: false,
  });
}

/** Body for `POST /admin/generate-lobbies` (admin only). */
export type AdminGenerateLobbiesBody = {
  date: string;
  timeSlots: string[];
  mode: string;
  subModes: string[];
  price: number;
  entryFees: number[];
  totalMatches: number;
  game: string;
  games: string[];
  /** Empty = server can derive labels from lobby index + time (fees/prize pool still server-side). */
  lobbyName?: string;
};

export async function generateAdminLobbies(
  body: AdminGenerateLobbiesBody,
): Promise<unknown> {
  return request<unknown>(API_ENDPOINTS.ADMIN.GENERATE_LOBBIES, {
    method: "POST",
    body,
  });
}

function normalizeCatalogGame(raw: unknown): AdminCatalogGame | null {
  const o = asRecord(raw);
  if (!o) return null;
  const title = o.title != null ? String(o.title).trim() : "";
  const slug = o.slug != null ? String(o.slug).trim() : "";
  if (!title || !slug) return null;
  const platform = o.platform != null ? String(o.platform).trim() : undefined;
  return { title, slug, platform: platform || undefined };
}

/** `GET /admin/games/catalog` — admin JWT required. */
export async function fetchAdminGamesCatalog(): Promise<AdminCatalogGame[]> {
  const raw = await request<unknown>(API_ENDPOINTS.ADMIN.GAMES_CATALOG, {
    toast: false,
  });
  const root = asRecord(raw);
  const data = root?.data != null ? asRecord(root.data) : root;
  const gamesRaw = data?.games;
  if (!Array.isArray(gamesRaw)) return [];
  const items = gamesRaw
    .map((row) => normalizeCatalogGame(row))
    .filter((x): x is AdminCatalogGame => x != null);
  const bySlug = new Map<string, AdminCatalogGame>();
  for (const g of items) {
    const key = g.slug.toLowerCase();
    if (!bySlug.has(key)) bySlug.set(key, g);
  }
  return Array.from(bySlug.values()).sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );
}

function normalizeAdminTournamentRow(raw: unknown): AdminTournamentRow | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id =
    strId(o._id) ||
    strId(o.id) ||
    strId(o.tournamentId) ||
    strId(o.lobbyGroupId) ||
    "";
  if (!id) return null;
  const status =
    o.status != null ? String(o.status).trim() : undefined;
  const mode =
    o.mode != null ? String(o.mode).trim() : undefined;
  const subMode =
    (o.subMode ?? o.submode ?? o.sub_mode) != null
      ? String(o.subMode ?? o.subMode ?? o.sub_mode).trim()
      : undefined;
  const gameRaw = o.game ?? o.gameSlug ?? o.gameTitle ?? o.title;
  const game =
    gameRaw != null ? String(gameRaw).trim() : undefined;
  const dateRaw = o.date ?? o.day ?? o.lobbyDate;
  const date =
    dateRaw != null ? String(dateRaw).trim() : undefined;
  const fromDateRaw = o.fromDate ?? o.startDate;
  const toDateRaw = o.toDate ?? o.endDate;
  const fromDate =
    fromDateRaw != null ? String(fromDateRaw).trim() : undefined;
  const toDate =
    toDateRaw != null ? String(toDateRaw).trim() : undefined;
  const nameRaw =
    o.name ?? o.label ?? o.tournamentName ?? o.lobbyGroupName ?? o.lobbyName;
  const name = nameRaw != null ? String(nameRaw).trim() : undefined;
  const lobbyName =
    o.lobbyName != null ? String(o.lobbyName).trim() : name;
  const lobbyCount =
    num(o.lobbyCount ?? o.lobbiesCount ?? o.totalLobbies ?? o.lobbyTotal);

  const startTimeRaw =
    o.startTime ??
    o.startTimeIST ??
    o.startTimeLocal ??
    o.start_time ??
    o.startAt;
  const startTime =
    startTimeRaw != null ? String(startTimeRaw).trim() : undefined;

  const maxTeams =
    num(
      o.maxTeams ??
        o.max_teams ??
        o.maxPlayers ??
        o.maxSlots ??
        o.totalSlot ??
        o.totalSlots ??
        o.totalTeams,
    ) ?? undefined;

  const potentialPrize = asRecord(o.potentialPrizePool);
  const winnerPrizePool =
    num(
      (potentialPrize as { winnerPool?: unknown })?.winnerPool ??
        (potentialPrize as { winnerPrizePool?: unknown })?.winnerPrizePool ??
        o.winnerPrizePool ??
        o.winner_pool,
    ) ?? undefined;
  const totalFees =
    num(
      (potentialPrize as { totalFees?: unknown })?.totalFees ??
        o.totalFees ??
        o.feesTotal,
    ) ?? undefined;
  const totalPrizePool =
    num(
      (potentialPrize as { totalPrizePool?: unknown })?.totalPrizePool ??
        o.totalPrizePool,
    ) ?? undefined;

  const entryFee =
    num(o.entryFee ?? o.entry_fee) ??
    (Array.isArray(o.entryFees) && o.entryFees.length
      ? num(o.entryFees[0])
      : undefined);

  const joinedTeams: unknown[] | undefined = Array.isArray(o.joinedTeams)
    ? o.joinedTeams
    : Array.isArray(o.joinedTeamsIds)
      ? o.joinedTeamsIds
      : undefined;
  const joinedCount =
    num(
      o.joinedTeamsCount ??
        o.joinedCount ??
        o.joined ??
        o.teamsJoined,
    ) ??
    (joinedTeams ? joinedTeams.length : undefined);
  const slotsAvailableExplicit = num(
    o.slotsAvailable ??
      o.availableSlots ??
      o.availableTeams ??
      o.openSlots,
  );
  const slotsAvailable =
    slotsAvailableExplicit ??
    (maxTeams != null
      ? Math.max(0, maxTeams - (joinedCount ?? 0))
      : undefined);

  const hostRef =
    asRecord(o.assignedHost) ??
    asRecord(o.assignedUser) ??
    asRecord(o.hostUser) ??
    asRecord(o.host);
  const assignedHostId =
    strId(o.assignedHostId) ||
    strId(o.assignedUserId) ||
    refId(o.hostId) ||
    refId(o.assignedHost) ||
    refId(o.host) ||
    refId(hostRef);
  const nameFrom = (r: Record<string, unknown> | null): string | undefined => {
    if (!r) return undefined;
    const n =
      r.name ?? r.fullName ?? r.displayName ?? r.username ?? r.email;
    const s = n != null ? String(n).trim() : "";
    return s || undefined;
  };
  const assignedHostName =
    o.assignedHostName != null
      ? String(o.assignedHostName).trim() || undefined
      : o.hostName != null
        ? String(o.hostName).trim() || undefined
        : nameFrom(hostRef);
  const assignedHostEmail =
    o.assignedHostEmail != null
      ? String(o.assignedHostEmail).trim() || undefined
      : o.hostEmail != null
        ? String(o.hostEmail).trim() || undefined
        : hostRef?.email != null
          ? String(hostRef.email).trim() || undefined
          : undefined;

  const hasAssigned =
    (assignedHostId && assignedHostId.length > 0) ||
    (assignedHostName && assignedHostName.length > 0);

  return {
    id,
    status,
    mode,
    subMode,
    game,
    date,
    fromDate,
    toDate,
    name,
    lobbyName,
    lobbyCount,
    startTime,
    maxTeams,
    winnerPrizePool,
    totalFees,
    totalPrizePool,
    entryFee,
    joinedCount,
    slotsAvailable,
    ...(hasAssigned
      ? {
          assignedHostId: assignedHostId || undefined,
          assignedHostName,
          assignedHostEmail,
        }
      : {}),
  };
}

export type FetchAdminTournamentsParams = {
  status?: "upcoming" | "live" | "completed" | "pendingResult" | "cancelled";
  /** Exclusive specific-day filter (yyyy-mm-dd). */
  date?: string;
  /** Range start (yyyy-mm-dd) for upcoming or history views. */
  fromDate?: string;
  /** Range end (yyyy-mm-dd). */
  toDate?: string;
  /** solo, duo, squad, 1v1, 2v2, 4v4, depending on backend. */
  subMode?: string;
  /** BR, CS, LW etc. */
  mode?: string;
  /** Optional game slug or name, e.g. `freefire`, `bgmi`. */
  game?: string;
};

export async function fetchAdminTournaments(
  params: FetchAdminTournamentsParams,
): Promise<AdminTournamentRow[]> {
  const query: Record<string, string> = {};
  if (params.status) query.status = params.status;
  if (params.date) query.date = params.date;
  if (params.fromDate) query.fromDate = params.fromDate;
  if (params.toDate) query.toDate = params.toDate;
  if (params.subMode) query.subMode = params.subMode;
  if (params.mode) query.mode = params.mode;
  if (params.game) query.game = params.game;

  const raw = await request<unknown>(API_ENDPOINTS.ADMIN.TOURNAMENTS, {
    params: query,
    toast: false,
  });
  const root = asRecord(raw);
  const data = root?.data ?? raw;
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown[] })?.items)
      ? (data as { items: unknown[] }).items
      : Array.isArray((data as { tournaments?: unknown[] })?.tournaments)
        ? (data as { tournaments: unknown[] }).tournaments
        : [];
  return list
    .map((row) => normalizeAdminTournamentRow(row))
    .filter((x): x is AdminTournamentRow => x != null);
}

function normalizeAdminHostApplication(raw: unknown): AdminHostApplication | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id =
    strId(o._id) ||
    strId(o.id) ||
    strId(o.applicationId) ||
    strId(o.hostApplicationId) ||
    "";
  if (!id) return null;

  const hostRef = asRecord(o.hostId);

  const hostId =
    refId(o.hostId) ||
    refId(o.userId) ||
    refId(o.uid) ||
    undefined;
  const tournamentId =
    refId((o as { tournamentId?: unknown }).tournamentId) ||
    refId((o as { lobbyGroupId?: unknown }).lobbyGroupId) ||
    undefined;

  const hostNameRaw =
    (o as { hostName?: unknown }).hostName ??
    (o as { name?: unknown }).name ??
    (o as { fullName?: unknown }).fullName ??
    (o as { displayName?: unknown }).displayName ??
    (hostRef?.hostName ?? hostRef?.name ?? hostRef?.fullName ?? hostRef?.displayName);
  const hostEmailRaw =
    (o as { hostEmail?: unknown }).hostEmail ??
    (o as { email?: unknown }).email ??
    hostRef?.email;

  const status =
    (o as { status?: unknown }).status != null
      ? String((o as { status?: unknown }).status).trim()
      : undefined;
  const adminNotes =
    (o as { adminNotes?: unknown }).adminNotes != null
      ? String((o as { adminNotes?: unknown }).adminNotes)
      : undefined;
  const createdAtRaw =
    (o as { createdAt?: unknown }).createdAt ??
    (o as { created_at?: unknown }).created_at ??
    (o as { appliedAt?: unknown }).appliedAt;
  const createdAt =
    createdAtRaw != null ? String(createdAtRaw).trim() : undefined;

  return {
    id,
    hostId: hostId || undefined,
    tournamentId: tournamentId || undefined,
    hostName:
      hostNameRaw != null && String(hostNameRaw).trim()
        ? String(hostNameRaw).trim()
        : undefined,
    hostEmail:
      hostEmailRaw != null && String(hostEmailRaw).trim()
        ? String(hostEmailRaw).trim()
        : undefined,
    status,
    adminNotes,
    createdAt,
  };
}

export type FetchAdminHostApplicationsParams = {
  page?: number;
  limit?: number;
  /** Filter by application status (backend: pending | approved | rejected). */
  status?: "pending" | "approved" | "rejected";
};

export async function fetchAdminHostApplications(
  params: FetchAdminHostApplicationsParams,
): Promise<AdminHostApplication[]> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const query: Record<string, string | number> = { page, limit };
  if (params.status) query.status = params.status;

  const raw = await request<unknown>(API_ENDPOINTS.ADMIN.HOST_APPLICATIONS, {
    params: query,
    toast: false,
  });
  const root = asRecord(raw);
  const data = root?.data ?? raw;
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown[] })?.items)
      ? (data as { items: unknown[] }).items
      : Array.isArray((data as { applications?: unknown[] })?.applications)
        ? (data as { applications: unknown[] }).applications
        : [];
  return list
    .map((row) => normalizeAdminHostApplication(row))
    .filter((x): x is AdminHostApplication => x != null);
}

export async function approveAdminHostApplication(
  applicationId: string,
): Promise<void> {
  const id = String(applicationId).trim();
  if (!id) return;
  await request<unknown>(
    API_ENDPOINTS.ADMIN.HOST_APPLICATION_APPROVE(id),
    {
      method: "POST",
      toast: false,
    },
  );
}

export type RejectAdminHostApplicationBody = {
  adminNotes?: string;
};

export async function rejectAdminHostApplication(
  applicationId: string,
  body?: RejectAdminHostApplicationBody,
): Promise<void> {
  const id = String(applicationId).trim();
  if (!id) return;
  await request<unknown>(
    API_ENDPOINTS.ADMIN.HOST_APPLICATION_REJECT(id),
    {
      method: "POST",
      body: body && body.adminNotes ? body : undefined,
      toast: false,
    },
  );
}

export type AssignAdminTournamentHostBody = {
  tournamentId: string;
  hostId: string;
  forceAssign?: boolean;
};

/** POST `/admin/assign-host` — assign a host to a tournament manually (admin JWT). */
export async function assignAdminTournamentHost(
  body: AssignAdminTournamentHostBody,
): Promise<void> {
  const tournamentId = String(body.tournamentId).trim();
  const hostId = String(body.hostId).trim();
  if (!tournamentId || !hostId) {
    throw new ApiError("Tournament and host are required");
  }
  await request<unknown>(API_ENDPOINTS.ADMIN.ASSIGN_HOST, {
    method: "POST",
    body: {
      tournamentId,
      hostId,
      forceAssign: body.forceAssign === true,
    },
    toast: false,
  });
}
