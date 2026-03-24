import { API_ENDPOINTS } from '@/constants/api';
import type { Transaction, TransactionFilters } from '@/types/auth';
import type {
  WalletAddBalanceBody,
  WalletAddBalanceBulkRow,
  WalletBalanceResult,
} from '@/types/wallet';
import { api, ApiError } from './api.service';

function rethrowAsApiError(error: unknown, fallbackMessage: string): never {
  if (error instanceof ApiError) throw error;
  const message = error instanceof Error && error.message ? error.message : fallbackMessage;
  throw new ApiError(message);
}

function unwrapArray<T = unknown>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as T[];
    if (Array.isArray(o.items)) return o.items as T[];
    if (Array.isArray(o.history)) return o.history as T[];
    if (Array.isArray(o.transactions)) return o.transactions as T[];
  }
  return [];
}

/**
 * GET `/wallet/balance` — balance + withdrawal limits (Swagger).
 */
export async function fetchWalletBalance(): Promise<WalletBalanceResult> {
  try {
    const res = await api.get<Record<string, unknown>>(API_ENDPOINTS.WALLET.BALANCE);
    const root =
      res && typeof res === 'object' && 'data' in res && (res as { data?: unknown }).data != null
        ? ((res as { data: Record<string, unknown> }).data as Record<string, unknown>)
        : (res as Record<string, unknown>);
    const walletBalance = Number(
      root.balance ?? root.walletBalance ?? root.availableBalance ?? 0
    );
    const withdrawalLimits =
      (root.withdrawalLimits ?? root.limits) as WalletBalanceResult['withdrawalLimits'];
    return {
      walletBalance: Number.isFinite(walletBalance) ? walletBalance : 0,
      withdrawalLimits:
        withdrawalLimits && typeof withdrawalLimits === 'object' ? withdrawalLimits : undefined,
    };
  } catch (error) {
    rethrowAsApiError(error, 'Failed to fetch wallet balance');
  }
}

/** GET `/wallet/history` — tournament-related ledger only. */
export async function fetchWalletTournamentHistory(): Promise<unknown[]> {
  try {
    const res = await api.get<unknown>(API_ENDPOINTS.WALLET.HISTORY);
    return unwrapArray(res);
  } catch (error) {
    rethrowAsApiError(error, 'Failed to fetch wallet history');
  }
}

function mapTopupHistoryRow(row: Record<string, unknown>): Transaction | null {
  const id = String(row._id ?? row.id ?? row.transactionId ?? '').trim();
  if (!id) return null;
  const typeRaw = String(row.type ?? row.kind ?? 'topup').toLowerCase();
  const type: Transaction['type'] =
    typeRaw === 'withdrawal' || typeRaw === 'withdraw' ? 'withdrawal' : 'topup';
  const statusRaw = String(row.status ?? 'success').toLowerCase();
  const status: Transaction['status'] =
    statusRaw === 'pending' ? 'pending' : statusRaw === 'failed' ? 'failed' : 'success';
  const created = row.createdAt ?? row.created_at ?? new Date().toISOString();
  const updated = row.updatedAt ?? row.updated_at ?? created;
  return {
    _id: id,
    type,
    amount: Number(row.amount ?? 0),
    status,
    upiId:
      row.upiId != null
        ? String(row.upiId)
        : row.paymentUPI != null
          ? String(row.paymentUPI)
          : row.upi != null
            ? String(row.upi)
            : undefined,
    transactionId: row.transactionId != null ? String(row.transactionId) : undefined,
    description: row.description != null ? String(row.description) : undefined,
    createdAt: String(created),
    updatedAt: String(updated),
  };
}

/**
 * GET `/wallet/topup-history` — deposits + withdrawals only (not tournament ledger).
 */
export async function fetchWalletTopupHistory(
  filters: TransactionFilters = {}
): Promise<Transaction[]> {
  try {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    const res = await api.get<unknown>(API_ENDPOINTS.WALLET.TOPUP_HISTORY, params);
    const rows = unwrapArray<Record<string, unknown>>(res);
    return rows.map(mapTopupHistoryRow).filter((x): x is Transaction => x != null);
  } catch (error) {
    rethrowAsApiError(error, 'Failed to fetch top-up / withdrawal history');
  }
}

export type WalletWithdrawResponse = {
  walletBalance: number;
};

/**
 * POST `/wallet/withdraw` — cash-out; payout UPI usually comes from profile `paymentUPI`.
 */
export async function requestWalletWithdraw(
  amount: number,
  paymentUPI?: string
): Promise<WalletWithdrawResponse> {
  try {
    const body: Record<string, unknown> = { amount };
    const upi = paymentUPI?.trim();
    if (upi) body.paymentUPI = upi;
    const res = await api.post<Record<string, unknown>>(API_ENDPOINTS.WALLET.WITHDRAW, body);
    const root =
      res && typeof res === 'object' && 'data' in res && (res as { data?: unknown }).data != null
        ? ((res as { data: Record<string, unknown> }).data as Record<string, unknown>)
        : res;
    const walletBalance = Number(root?.walletBalance ?? root?.balance ?? 0);
    return { walletBalance: Number.isFinite(walletBalance) ? walletBalance : 0 };
  } catch (error) {
    rethrowAsApiError(error, 'Withdrawal failed');
  }
}

/** POST `/wallet/withdraw/:transactionId/cancel` */
export async function cancelWalletWithdrawal(transactionId: string): Promise<void> {
  try {
    const id = transactionId.trim();
    if (!id) throw new ApiError('transactionId is required', 400);
    await api.post(API_ENDPOINTS.WALLET.WITHDRAW_CANCEL(id), {});
  } catch (error) {
    rethrowAsApiError(error, 'Failed to cancel withdrawal');
  }
}

/** POST `/user/wallet/topup` — legacy until a public top-up route exists under `/wallet`. */
export async function legacyWalletTopUp(amount: number): Promise<WalletWithdrawResponse> {
  try {
    const res = await api.post<Record<string, unknown>>(
      API_ENDPOINTS.USER.LEGACY_WALLET_TOPUP,
      { amount }
    );
    const root =
      res && typeof res === 'object' && 'data' in res && (res as { data?: unknown }).data != null
        ? ((res as { data: Record<string, unknown> }).data as Record<string, unknown>)
        : res;
    const walletBalance = Number(root?.walletBalance ?? root?.balance ?? 0);
    return { walletBalance: Number.isFinite(walletBalance) ? walletBalance : 0 };
  } catch (error) {
    rethrowAsApiError(error, 'Top up failed');
  }
}

/** POST `/wallet/add-balance` — admin only. */
export async function adminWalletAddBalance(body: WalletAddBalanceBody): Promise<unknown> {
  try {
    return await api.post<unknown>(API_ENDPOINTS.WALLET.ADD_BALANCE, body, { toast: false });
  } catch (error) {
    rethrowAsApiError(error, 'Add balance failed');
  }
}

/**
 * POST `/wallet/add-balance-bulk` — admin only.
 * Send the exact JSON your server expects (e.g. `{ items: [...] }` or `{ users: [...] }`).
 */
export async function adminWalletAddBalanceBulk(body: Record<string, unknown>): Promise<unknown> {
  try {
    return await api.post<unknown>(API_ENDPOINTS.WALLET.ADD_BALANCE_BULK, body, { toast: false });
  } catch (error) {
    rethrowAsApiError(error, 'Bulk add balance failed');
  }
}

/** Convenience: `{ items: rows }` — change key if your API uses `users` / `bulk`. */
export function walletBulkPayloadFromRows(rows: WalletAddBalanceBulkRow[]): Record<string, unknown> {
  return { items: rows };
}
