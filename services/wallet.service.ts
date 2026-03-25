import { API_ENDPOINTS } from '@/constants/api';
import type { Transaction, TransactionFilters } from '@/types/auth';
import type {
  CreatePaymentQrResult,
  RazorpayOrderResult,
  RazorpayVerifyBody,
  RazorpayVerifyResult,
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

function normalizeRazorpayStatus(raw: string): RazorpayVerifyResult['status'] {
  const s = raw.toLowerCase();
  if (['success', 'successful', 'captured', 'paid', 'payment_captured'].includes(s)) return 'success';
  if (['failed', 'failure', 'cancelled', 'canceled'].includes(s)) return 'failed';
  return 'pending';
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

/** POST `/payment/razorpay/order` — create pending top-up + Razorpay order. */
export async function createRazorpayOrder(amountINR: number): Promise<RazorpayOrderResult> {
  try {
    if (!Number.isFinite(amountINR) || amountINR <= 0) {
      throw new ApiError('Valid amount is required', 400);
    }
    const res = await api.post<unknown>(API_ENDPOINTS.PAYMENT.RAZORPAY_ORDER, { amountINR });
    const root = unwrapDataRecord(res);
    const keyId = firstString(root.keyId, root.razorpayKeyId, root.key_id);
    const orderId = firstString(root.orderId, root.order_id, root.razorpayOrderId);
    const amountPaise = Number(root.amountPaise ?? root.amount_paise ?? root.amount);

    if (!keyId || !orderId || !Number.isFinite(amountPaise) || amountPaise <= 0) {
      throw new ApiError('Invalid Razorpay order response', 502, res);
    }

    return { keyId, orderId, amountPaise };
  } catch (error) {
    rethrowAsApiError(error, 'Could not create Razorpay order');
  }
}

/** POST `/payment/razorpay/verify` — verify signature + finalize wallet credit on success. */
export async function verifyRazorpayPayment(body: RazorpayVerifyBody): Promise<RazorpayVerifyResult> {
  try {
    const orderId = body.orderId.trim();
    const paymentId = body.paymentId.trim();
    const signature = body.signature.trim();
    if (!orderId) throw new ApiError('orderId is required', 400);
    if (!paymentId) throw new ApiError('paymentId is required', 400);
    if (!signature) throw new ApiError('signature is required', 400);

    const res = await api.post<unknown>(API_ENDPOINTS.PAYMENT.RAZORPAY_VERIFY, {
      orderId,
      paymentId,
      signature,
    });
    const root = unwrapDataRecord(res);
    const rawStatus = firstString(
      root.status,
      root.paymentStatus,
      root.orderStatus,
      root.resultStatus,
      root.state
    );
    return {
      status: normalizeRazorpayStatus(rawStatus ?? 'pending'),
      rawStatus,
    };
  } catch (error) {
    rethrowAsApiError(error, 'Failed to verify Razorpay payment');
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
