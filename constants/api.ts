/**
 * API Endpoints - Centralized route paths for backend.
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/register",
    VERIFY_OTP: "/auth/verify-otp",
    RESEND_OTP: "/auth/resend-otp",
    /** POST — single session (Swagger: `/api/auth/logout` when base URL has no `/api` segment). */
    LOGOUT: "/auth/logout",
    /** POST — invalidate all sessions (Swagger: `/api/auth/logout-all`). */
    LOGOUT_ALL: "/auth/logout-all",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
    CHANGE_PASSWORD: "/auth/change-password",
    REFRESH_TOKEN: "/auth/refresh-token",
  },
  USER: {
    PROFILE: "/profile",
    UPADATE_PROFILE: "/profile",
    /** POST — append one row; body = flat address fields (`addressLine1`, `city`, …) at root. */
    PROFILE_ADDRESS: "/profile/addresses",
    /** DELETE — body `{ gameId, action: 'removeGame', uid }`. */
    GAME_PROFILE: "/profile/game-profile",
    /**
     * Legacy top-up route — not in `/api/wallet` Swagger; keep until a gateway route replaces it.
     */
    LEGACY_WALLET_TOPUP: "/user/wallet/topup",
  },
  /** JWT — balance, history, withdraw, cancel; admin: add-balance, add-balance-bulk. */
  WALLET: {
    BALANCE: "/wallet/balance",
    HISTORY: "/wallet/history",
    TOPUP_HISTORY: "/wallet/topup-history",
    WITHDRAW: "/wallet/withdraw",
    WITHDRAW_CANCEL: (transactionId: string) =>
      `/wallet/withdraw/${encodeURIComponent(transactionId)}/cancel`,
    ADD_BALANCE: "/wallet/add-balance",
    ADD_BALANCE_BULK: "/wallet/add-balance-bulk",
  },
  GAMES: {
    /**
     * Game selection / catalog — `options`, `gameSelectionConfig`, indiaEsportsPersonalities, etc.
     * Not user profile; use USER.PROFILE only for the signed-in user's picks (selectedGames, follows, …).
     */
    GAME_OPTIONS: "/profile/game-options",
    GAME_DASHBOARD: "/profile/dashboard",
    LIST: "/games",
    BY_CATEGORY: (category: string) => `/games/category/${category}`,
  },
  TRANSACTIONS: {
    LIST: "/transactions",
  },
  ANTIHACK: {
    /** GET — query `uid` (required). Backend adds `lang=en`; FF proxy per Swagger. Optional `game` for other titles if server supports it. */
    CHECK_BANNED: "/antihack/check-banned",
  },
  /**
   * Reverse geocode — GET with Bearer. Full URL = `apiBaseUrl` + this path.
   * Use `/geocode/reverse` when `API_BASE_URL` already includes `/api` (e.g. `https://host/api`).
   */
  GEOCODE: {
    REVERSE: "/geocode/reverse",
  },
  /** UPI QR top-up — authenticated (see Swagger `/api/payment/...` when base URL includes `/api`). */
  PAYMENT: {
    CREATE_QR: "/payment/create-qr",
    QR_STATUS: (qrCodeId: string) =>
      `/payment/qr-status/${encodeURIComponent(qrCodeId)}`,
    CLOSE_QR: (qrCodeId: string) =>
      `/payment/close-qr/${encodeURIComponent(qrCodeId)}`,
    RAZORPAY_ORDER: "/payment/razorpay/order",
    RAZORPAY_VERIFY: "/payment/razorpay/verify",
  },
} as const;
