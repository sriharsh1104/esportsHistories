import { API_ENDPOINTS } from '@/constants/api';
import type { TopupHistoryPagination, Transaction, TransactionFilters } from '@/types/auth';
import type {
  CashfreeOrderResult,
  CashfreeVerifyBody,
  CashfreeVerifyResult,
  CreatePaymentQrResult,
} from '@/types/payment';
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

function unwrapDataRecord(res: unknown): Record<string, unknown> {
  if (res && typeof res === 'object') {
    const o = res as Record<string, unknown>;
    const inner = o.data;
    if (inner && typeof inner === 'object') {
      return inner as Record<string, unknown>;
    }
    return o;
  }
  return {};
}

function firstString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return undefined;
}

/** Wallet APIs often return `balanceINR`; older shapes use `balance` / `walletBalance`. */
function parseWalletBalanceFromRoot(root: Record<string, unknown> | null | undefined): number {
  if (!root || typeof root !== 'object') return 0;
  const raw =
    root.balanceINR ??
    root.balanceInr ??
    root.balance_inr ??
    root.walletBalance ??
    root.balance ??
    root.availableBalance ??
    0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Builds `Image` `uri` from base64 or URL returned by payment APIs. */
export function paymentQrToImageUri(result: CreatePaymentQrResult): string | undefined {
  const url = firstString(result.qrImageUrl);
  if (url && (url.startsWith('http') || url.startsWith('data:'))) return url;
  const raw = firstString(result.qrImage);
  if (!raw) return url;
  if (raw.startsWith('data:') || raw.startsWith('http')) return raw;
  return `data:image/png;base64,${raw}`;
}

function normalizeQrStatus(raw: string): string {
  const s = raw.toLowerCase();
  if (['success', 'completed', 'paid', 'captured'].includes(s)) return 'success';
  if (['failed', 'expired', 'cancelled', 'canceled', 'closed'].includes(s)) return 'failed';
  return 'pending';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCodeFromApiResponse(response: unknown): string | undefined {
  if (!response || typeof response !== 'object') return undefined;
  const o = response as Record<string, unknown>;
  const code = o.code ?? o.errorCode ?? o.error_code;
  return code != null && String(code).trim() ? String(code).trim() : undefined;
}

function normalizeCashfreeEnvironment(
  raw: string | undefined
): CashfreeOrderResult['environment'] | undefined {
  if (raw == null) return undefined;
  const s = String(raw).toLowerCase().trim();
  if (s === 'production' || s === 'prod' || s === 'live') return 'production';
  if (s === 'sandbox' || s === 'test') return 'sandbox';
  return undefined;
}

function normalizeCashfreeVerifyStatus(raw: string): CashfreeVerifyResult['status'] {
  const s = raw.toLowerCase();
  if (['success', 'successful', 'captured', 'paid', 'completed', 'complete'].includes(s)) {
    return 'success';
  }
  if (['failed', 'failure', 'cancelled', 'canceled', 'error'].includes(s)) return 'failed';
  return 'pending';
}

function rethrowAsCashfreeOrderError(error: unknown): never {
  if (error instanceof ApiError) {
    const code = parseCodeFromApiResponse(error.response);
    if (error.statusCode === 503 && code === 'CASHFREE_PG_NOT_CONFIGURED') {
      throw new ApiError('Wallet top-up is temporarily unavailable.', error.statusCode, error.response);
    }
    if (error.statusCode === 502 && code === 'CASHFREE_ORDER_FAILED') {
      throw new ApiError('Could not start payment. Try again shortly.', error.statusCode, error.response);
    }
  }
  rethrowAsApiError(error, 'Could not create payment order');
}

function mapCreateQrResponse(res: unknown): CreatePaymentQrResult {
  const root = unwrapDataRecord(res);
  const qrCodeId = firstString(
    root.qrCodeId,
    root.qrId,
    root._id,
    root.id,
    root.codeId
  );
  const qrImage = firstString(
    root.qrImage,
    root.qrCodeImage,
    root.image,
    root.qr,
    root.qrData,
    root.qrBase64
  );
  const qrImageUrl = firstString(
    root.qrImageUrl,
    root.imageUrl,
    root.qrUrl,
    root.url
  );
  const upiLink = firstString(root.upiLink, root.upiUri, root.intent);
  const paymentLink = firstString(root.paymentLink, root.deepLink, root.link);

  return {
    qrCodeId,
    qrImage,
    qrImageUrl,
    upiLink,
    paymentLink,
  };
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
    const walletBalance = parseWalletBalanceFromRoot(root);
    const withdrawalLimits =
      (root.withdrawalLimits ?? root.limits) as WalletBalanceResult['withdrawalLimits'];
    return {
      walletBalance,
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
  const statusSource = row.displayStatus ?? row.status ?? 'success';
  const statusRaw = String(statusSource).toLowerCase().trim();
  const status: Transaction['status'] =
    statusRaw === 'pending' || statusRaw === 'processing'
      ? 'pending'
      : statusRaw === 'failed' ||
          statusRaw === 'fail' ||
          statusRaw === 'failure' ||
          statusRaw === 'error' ||
          statusRaw === 'rejected'
        ? 'failed'
        : 'success';
  const created = row.createdAt ?? row.created_at ?? new Date().toISOString();
  const updated = row.updatedAt ?? row.updated_at ?? created;
  const rawAmount =
    row.amountINR ?? row.amountInr ?? row.amount_inr ?? row.amount ?? row.value ?? 0;
  const parsedAmount = Number(rawAmount);
  return {
    _id: id,
    type,
    amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
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

function parseTopupHistoryPagination(raw: unknown): TopupHistoryPagination | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const po = raw as Record<string, unknown>;
  const currentPage = Number(po.currentPage ?? po.page ?? 1) || 1;
  const totalPages = Number(po.totalPages ?? 1) || 1;
  const totalItems = Number(po.totalItems ?? po.total ?? 0) || 0;
  const itemsPerPage = Number(po.itemsPerPage ?? po.limit ?? 20) || 20;
  const hasNextPage = Boolean(
    po.hasNextPage ?? (totalPages > 0 ? currentPage < totalPages : false)
  );
  const hasPrevPage = Boolean(po.hasPrevPage ?? currentPage > 1);
  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage,
    hasPrevPage,
  };
}

/**
 * Normalizes `/wallet/topup-history` payload: either a bare array, or `{ history, pagination }` inside `data`.
 */
function parseTopupHistoryResponse(res: unknown): {
  history: Transaction[];
  pagination: TopupHistoryPagination | null;
} {
  if (Array.isArray(res)) {
    const history = (res as Record<string, unknown>[])
      .map(mapTopupHistoryRow)
      .filter((x): x is Transaction => x != null);
    return { history, pagination: null };
  }
  const root = res && typeof res === 'object' ? (res as Record<string, unknown>) : {};
  let rows: Record<string, unknown>[] = [];
  if (Array.isArray(root.history)) {
    rows = root.history as Record<string, unknown>[];
  } else if (Array.isArray(root.items)) {
    rows = root.items as Record<string, unknown>[];
  } else {
    rows = unwrapArray<Record<string, unknown>>(res);
  }
  const history = rows.map(mapTopupHistoryRow).filter((x): x is Transaction => x != null);
  const pagination = parseTopupHistoryPagination(root.pagination);
  return { history, pagination };
}

function topupHistoryQueryParams(
  filters: TransactionFilters
): Record<string, string | number | boolean | undefined> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (filters.type) params.type = filters.type;
  if (filters.status) params.status = filters.status;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.page != null && filters.page > 0) params.page = filters.page;
  if (filters.limit != null && filters.limit > 0) params.limit = filters.limit;
  return params;
}

/**
 * GET `/wallet/topup-history` — deposits + withdrawals only (not tournament ledger).
 */
export async function fetchWalletTopupHistory(
  filters: TransactionFilters = {}
): Promise<Transaction[]> {
  try {
    const res = await api.get<unknown>(
      API_ENDPOINTS.WALLET.TOPUP_HISTORY,
      topupHistoryQueryParams(filters)
    );
    return parseTopupHistoryResponse(res).history;
  } catch (error) {
    rethrowAsApiError(error, 'Failed to fetch top-up / withdrawal history');
  }
}

/** Same as `fetchWalletTopupHistory` but returns pagination for modals / lists. */
export async function fetchWalletTopupHistoryWithPagination(
  filters: TransactionFilters = {}
): Promise<{ history: Transaction[]; pagination: TopupHistoryPagination | null }> {
  try {
    const res = await api.get<unknown>(
      API_ENDPOINTS.WALLET.TOPUP_HISTORY,
      topupHistoryQueryParams(filters)
    );
    return parseTopupHistoryResponse(res);
  } catch (error) {
    rethrowAsApiError(error, 'Failed to fetch top-up / withdrawal history');
  }
}

export type WalletWithdrawResponse = {
  walletBalance: number;
};

/**
 * POST `/payment/withdraw` — body `{ amountINR, description, upiId? }`.
 * Omit `upiId` when empty so the server can use the UPI saved on the profile.
 */
export async function requestWalletWithdraw(
  amount: number,
  upiId?: string,
  description = 'UPI payout'
): Promise<WalletWithdrawResponse> {
  try {
    const body: Record<string, unknown> = {
      amountINR: amount,
      description: description.trim() || 'UPI payout',
    };
    const upi = upiId?.trim();
    if (upi) body.upiId = upi;
    const res = await api.post<Record<string, unknown>>(API_ENDPOINTS.WALLET.WITHDRAW, body);
    const root =
      res && typeof res === 'object' && 'data' in res && (res as { data?: unknown }).data != null
        ? ((res as { data: Record<string, unknown> }).data as Record<string, unknown>)
        : res;
    const walletBalance = parseWalletBalanceFromRoot(
      root && typeof root === 'object' ? (root as Record<string, unknown>) : undefined
    );
    return { walletBalance };
  } catch (error) {
    rethrowAsApiError(error, 'Withdrawal failed');
  }
}

/** POST `/payment/withdraw/:transactionId/cancel` */
export async function cancelWalletWithdrawal(transactionId: string): Promise<void> {
  try {
    const id = transactionId.trim();
    if (!id) throw new ApiError('transactionId is required', 400);
    await api.post(API_ENDPOINTS.WALLET.WITHDRAW_CANCEL(id), {});
  } catch (error) {
    rethrowAsApiError(error, 'Failed to cancel withdrawal');
  }
}

/**
 * POST `/payment/create-qr` — UPI QR for wallet top-up.
 * Sends `paymentUPI` as the payer VPA from profile (must be saved first).
 */
export async function createPaymentQr(
  amount: number,
  paymentUPI: string
): Promise<CreatePaymentQrResult> {
  try {
    const upi = paymentUPI.trim();
    if (!upi) throw new ApiError('UPI ID is required', 400);
    const res = await api.post<unknown>(API_ENDPOINTS.PAYMENT.CREATE_QR, {
      amountINR: amount,
      paymentUPI: upi,
    });
    const mapped = mapCreateQrResponse(res);
    if (
      !mapped.qrCodeId &&
      !mapped.qrImage &&
      !mapped.qrImageUrl &&
      !mapped.upiLink &&
      !mapped.paymentLink
    ) {
      throw new ApiError('Invalid QR response from server', 502, res);
    }
    return mapped;
  } catch (error) {
    rethrowAsApiError(error, 'Could not create payment QR');
  }
}

/** GET `/payment/qr-status/:qrCodeId` */
export async function getPaymentQrStatus(qrCodeId: string): Promise<{ status: string }> {
  try {
    const id = qrCodeId.trim();
    if (!id) throw new ApiError('qrCodeId is required', 400);
    const res = await api.get<unknown>(API_ENDPOINTS.PAYMENT.QR_STATUS(id));
    const root = unwrapDataRecord(res);
    const raw = firstString(root.status, root.state, root.paymentStatus) ?? 'pending';
    return { status: normalizeQrStatus(raw) };
  } catch (error) {
    rethrowAsApiError(error, 'Failed to check payment status');
  }
}

/** POST `/payment/close-qr/:qrCodeId` — cancel / expire pending QR. */
export async function closePaymentQr(qrCodeId: string): Promise<void> {
  try {
    const id = qrCodeId.trim();
    if (!id) return;
    await api.post(API_ENDPOINTS.PAYMENT.CLOSE_QR(id), {}, { toast: false });
  } catch (error) {
    rethrowAsApiError(error, 'Failed to close QR session');
  }
}

/** POST `/payment/cashfree/order` — create Cashfree session for wallet top-up. */
export async function createCashfreeOrder(amountINR: number): Promise<CashfreeOrderResult> {
  try {
    if (!Number.isFinite(amountINR) || amountINR < 1) {
      throw new ApiError('Amount must be at least ₹1', 400);
    }
    const res = await api.post<unknown>(
      API_ENDPOINTS.PAYMENT.CASHFREE_ORDER,
      { amountINR },
      { toast: false }
    );
    const root = unwrapDataRecord(res);
    const environment =
      normalizeCashfreeEnvironment(firstString(root.environment, root.env, root.mode)) ?? 'sandbox';
    const clientId = firstString(root.clientId, root.client_id, root.appId, root.app_id) ?? '';
    const paymentSessionId =
      firstString(root.paymentSessionId, root.payment_session_id, root.sessionId, root.session_id) ?? '';
    const orderId =
      firstString(root.orderId, root.order_id, root.merchantOrderId, root.merchant_order_id) ?? '';

    if (!paymentSessionId || !orderId) {
      throw new ApiError('Invalid Cashfree order response', 502, res);
    }

    const amountParsed = Number(root.amountINR ?? root.amountInr ?? root.amount_inr);
    return {
      environment,
      clientId,
      paymentSessionId,
      orderId,
      amountINR: Number.isFinite(amountParsed) ? amountParsed : undefined,
      walletTransactionId: firstString(root.walletTransactionId, root.wallet_transaction_id),
    };
  } catch (error) {
    rethrowAsCashfreeOrderError(error);
  }
}

/** POST `/payment/cashfree/verify` — finalize top-up when payment completes. */
export async function verifyCashfreePayment(body: CashfreeVerifyBody): Promise<CashfreeVerifyResult> {
  try {
    const orderId = body.orderId.trim();
    if (!orderId) throw new ApiError('orderId is required', 400);

    const res = await api.post<unknown>(
      API_ENDPOINTS.PAYMENT.CASHFREE_VERIFY,
      { orderId },
      { toast: false }
    );
    const root = unwrapDataRecord(res);
    const rawStatus =
      firstString(
        root.status,
        root.paymentStatus,
        root.payment_status,
        root.orderStatus,
        root.state
      ) ?? 'pending';
    const status = normalizeCashfreeVerifyStatus(rawStatus);
    const balanceRaw =
      root.balanceINR ?? root.balanceInr ?? root.balance_inr ?? root.walletBalance ?? root.balance;
    const balanceN = Number(balanceRaw);
    const message = firstString(root.message, root.msg);
    return {
      status,
      balanceINR: Number.isFinite(balanceN) ? balanceN : undefined,
      message,
      rawStatus,
    };
  } catch (error) {
    rethrowAsApiError(error, 'Failed to verify payment');
  }
}

/**
 * Poll verify until success/failure or timeout. Retries on transient 502s.
 */
export async function verifyCashfreePaymentWithPoll(
  orderId: string,
  options?: { intervalMs?: number; maxAttempts?: number }
): Promise<CashfreeVerifyResult> {
  const intervalMs = options?.intervalMs ?? 2500;
  const maxAttempts = options?.maxAttempts ?? 36;
  let last: CashfreeVerifyResult | undefined;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      last = await verifyCashfreePayment({ orderId });
    } catch (e) {
      const retry502 = e instanceof ApiError && e.statusCode === 502 && i < maxAttempts - 1;
      if (!retry502) throw e;
      await sleep(intervalMs);
      continue;
    }

    if (last.status === 'success' || last.status === 'failed') {
      return last;
    }

    if (i < maxAttempts - 1) {
      await sleep(intervalMs);
    }
  }

  return (
    last ?? {
      status: 'pending',
      message: 'Payment not confirmed yet. Check your balance or try verifying again.',
    }
  );
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
    const walletBalance = parseWalletBalanceFromRoot(
      root && typeof root === 'object' ? (root as Record<string, unknown>) : undefined
    );
    return { walletBalance };
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
