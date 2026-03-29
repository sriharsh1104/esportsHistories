import Constants from 'expo-constants';
import { API_ENDPOINTS } from '@/constants/api';
import type {
  AdminDashboardStats,
  AdminUserRow,
  AdminUsersPage,
  AdminUserRoleFilter,
} from '@/types/admin';
import { request } from './api.service';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function strId(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function pickUserId(row: Record<string, unknown>): string {
  return (
    strId(row._id) ||
    strId(row.id) ||
    strId(row.userId) ||
    strId(row.uid) ||
    ''
  );
}

function normalizeUserRow(raw: unknown): AdminUserRow | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickUserId(row);
  const emailRaw = row.email ?? row.userEmail;
  const email = emailRaw != null ? String(emailRaw).trim() : '';
  if (!id || !email) return null;
  const name =
    row.name != null
      ? String(row.name)
      : row.fullName != null
        ? String(row.fullName)
        : row.displayName != null
          ? String(row.displayName)
          : undefined;
  const displayName =
    row.displayName != null ? String(row.displayName) : name;
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
      typeof row.isVerified === 'boolean'
        ? row.isVerified
        : row.verified === true,
  };
}

function normalizeFeesBreakdown(raw: unknown): AdminDashboardStats['feesBreakdown'] {
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

function normalizeLobbyStats(raw: unknown): AdminDashboardStats['lobbyStats'] {
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
  const userSelf =
    num(data.userSelfTopupsINR) ?? num(data.totalDepositsINR);
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
    activeLobbyCount:
      activeLobbies ?? lobbyBase?.running,
    lobbyStats: lobbyStatsMerged,
    prizePoolDistributed: num(data.prizePoolDistributed),
    totalHostFeePaid: num(data.totalHostFeePaid),
    platformFeeCollected: num(data.platformFeeCollected),
    casterFeeCollected: num(data.casterFeeCollected),
    platformProfit: num(data.platformProfit),
    feesBreakdown: normalizeFeesBreakdown(feesRaw),
  };
}

/**
 * SSE / stream payloads: `{ type: "dashboard", data: { ... } }` or wrapped `{ data: stats }`.
 */
export function parseAdminDashboardStreamPayload(raw: unknown): AdminDashboardStats | null {
  try {
    const parsed =
      typeof raw === 'string'
        ? (JSON.parse(raw) as unknown)
        : raw;
    const o = asRecord(parsed);
    if (!o) return null;
    if (o.type === 'dashboard' && o.data != null) {
      return normalizeDashboardStats({ data: o.data });
    }
    if (o.type === 'stats' && o.data != null) {
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
  const base = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)?.replace(/\/$/, '') || '';
  const path = API_ENDPOINTS.ADMIN.DASHBOARD_STREAM.replace(/^\//, '');
  const t = encodeURIComponent(accessToken);
  return `${base}/${path}?access_token=${t}`;
}

export type FetchAdminUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminUserRoleFilter;
};

function normalizeUsersPage(raw: unknown, page: number, limit: number): AdminUsersPage {
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
    totalPagesRaw ??
    (limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);

  return {
    items,
    total,
    page: num(d.page) ?? num(d.currentPage) ?? page,
    limit: num(d.limit) ?? num(d.pageSize) ?? limit,
    totalPages,
  };
}

/** Query `role` — align with backend `UserRole` / typical Swagger enums. */
function adminRoleFilterToApiParam(role: AdminUserRoleFilter): string | undefined {
  if (role === 'ALL') return undefined;
  const map: Record<Exclude<AdminUserRoleFilter, 'ALL'>, string> = {
    ADMIN: 'admin',
    HOST: 'host',
    USER: 'user',
    ORG_MANAGER: 'org_manager',
  };
  return map[role];
}

export async function fetchAdminUsers(params: FetchAdminUsersParams): Promise<AdminUsersPage> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const query: Record<string, string | number | undefined> = { page, limit };
  const q = params.search?.trim();
  if (q) query.search = q;
  const roleParam = params.role ? adminRoleFilterToApiParam(params.role) : undefined;
  if (roleParam) query.role = roleParam;

  const raw = await request<unknown>(API_ENDPOINTS.ADMIN.USERS, {
    params: query,
    toast: false,
  });
  return normalizeUsersPage(raw, page, limit);
}
