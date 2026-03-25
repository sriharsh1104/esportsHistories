/** Normalized result from POST `/payment/create-qr` (fields vary by gateway). */
export type CreatePaymentQrResult = {
  qrCodeId?: string;
  /** Shown if server returns PNG base64 or a data URL. */
  qrImage?: string;
  qrImageUrl?: string;
  upiLink?: string;
  paymentLink?: string;
};

/** Payload returned by POST `/payment/razorpay/order` to start Razorpay Checkout. */
export type RazorpayOrderResult = {
  keyId: string;
  orderId: string;
  amountPaise: number;
};

export type RazorpayVerifyBody = {
  orderId: string;
  paymentId: string;
  signature: string;
};

/** Normalized state after server-side `/payment/razorpay/verify` check. */
export type RazorpayVerifyResult = {
  status: 'success' | 'pending' | 'failed';
  rawStatus?: string;
};
