/**
 * API Endpoints - Centralized route paths for backend.
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    /** POST — complete login when 2FA enabled (Swagger: `/api/auth/2fa/verify-login`). */
    VERIFY_LOGIN_2FA: "/auth/2fa/verify-login",
    SIGNUP: "/auth/register",
    VERIFY_OTP: "/auth/verify-otp",
    RESEND_OTP: "/auth/resend-otp",
    /** POST — single session (Swagger: `/api/auth/logout` when base URL has no `/api` segment). */
    LOGOUT: "/auth/logout",
    /** GET — device sessions + login/logout history (Swagger: `/api/auth/device-history`). */
    DEVICE_HISTORY: "/auth/device-history",
    /** POST — logout a specific session by id (Swagger: `/api/auth/logout-device`). */
    LOGOUT_DEVICE: "/auth/logout-device",
    /** POST — invalidate all sessions (Swagger: `/api/auth/logout-all`). */
    LOGOUT_ALL: "/auth/logout-all",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
    CHANGE_PASSWORD: "/auth/change-password",
    REFRESH_TOKEN: "/auth/refresh-token",
    TWO_FA: {
      /** GET — returns whether TOTP 2FA is enabled for the current user. */
      STATUS: "/auth/2fa/status",
      /** POST — generate temporary secret + QR (call ENABLE to activate). */
      SETUP: "/auth/2fa/setup",
      /** POST — enable 2FA after verifying code from authenticator app. */
      ENABLE: "/auth/2fa/enable",
      /** POST — disable 2FA after verifying current code. */
      DISABLE: "/auth/2fa/disable",
    },
  },
  USER: {
    PROFILE: "/profile",
    UPADATE_PROFILE: "/profile",
    /** POST multipart/form-data — upload avatar image under `image`. */
    PROFILE_AVATAR: "/profile/avatar",
    /** POST — append one row; body = flat address fields (`addressLine1`, `city`, …) at root. */
    PROFILE_ADDRESS: "/profile/addresses",
    /** DELETE — body `{ gameId, action: 'removeGame', uid }`. */
    GAME_PROFILE: "/profile/game-profile",
    /**
     * Legacy top-up route — not in `/api/wallet` Swagger; keep until a gateway route replaces it.
     */
    LEGACY_WALLET_TOPUP: "/user/wallet/topup",
  },
  /** JWT — balance, history; admin: add-balance, add-balance-bulk. Withdraw POST is `/api/payment/withdraw` when base includes `/api`. */
  WALLET: {
    BALANCE: "/wallet/balance",
    HISTORY: "/wallet/history",
    TOPUP_HISTORY: "/wallet/topup-history",
    WITHDRAW: "/payment/withdraw",
    WITHDRAW_CANCEL: (transactionId: string) =>
      `/payment/withdraw/${encodeURIComponent(transactionId)}/cancel`,
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
    CASHFREE_ORDER: "/payment/cashfree/order",
    CASHFREE_VERIFY: "/payment/cashfree/verify",
  },
  /** Admin JWT — dashboard metrics, user listing, etc. */
  ADMIN: {
    DASHBOARD_STATS: '/admin/dashboard/stats',
    DASHBOARD_STREAM: '/admin/dashboard/stream',
    /** GET — financial time-series (`period`: daily | weekly | monthly). */
    ANALYTICS: '/admin/analytics',
    USERS: '/admin/users',
  },
  TOURNAMENT: {
    /**
     * GET — tournaments list (Swagger: `/api/tournament/list`).
     * Query: status, date, fromDate, toDate, subMode, mode (depends on backend).
     */
    LIST: "/tournament/list",
    /** GET (SSE) — stream tournaments; `game` query required by backend. */
    STREAM: "/tournament/list/stream",
  },
} as const;
