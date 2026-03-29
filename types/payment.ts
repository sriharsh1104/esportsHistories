/** Normalized result from POST `/payment/create-qr` (fields vary by gateway). */
export type CreatePaymentQrResult = {
  qrCodeId?: string;
  /** Shown if server returns PNG base64 or a data URL. */
  qrImage?: string;
  qrImageUrl?: string;
  upiLink?: string;
  paymentLink?: string;
};

export type CashfreePgEnvironment = 'sandbox' | 'production';

/** Payload from POST `/payment/cashfree/order` (`data` after API unwrap). */
export type CashfreeOrderResult = {
  environment: CashfreePgEnvironment;
  /** Cashfree app id for frontend — never the secret. */
  clientId: string;
  paymentSessionId: string;
  /** Merchant order id — use for verify and match return URL `order_id`. */
  orderId: string;
  amountINR?: number;
  walletTransactionId?: string;
};

export type CashfreeVerifyBody = {
  orderId: string;
};

/** Normalized state after POST `/payment/cashfree/verify`. */
export type CashfreeVerifyResult = {
  status: 'success' | 'pending' | 'failed';
  balanceINR?: number;
  message?: string;
  rawStatus?: string;
};
