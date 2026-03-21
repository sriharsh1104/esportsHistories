/**
 * API Endpoints - Centralized route paths for backend.
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/register',
    VERIFY_OTP: '/auth/verify-otp',
    RESEND_OTP: '/auth/resend-otp',
    /** POST — single session (Swagger: `/api/auth/logout` when base URL has no `/api` segment). */
    LOGOUT: '/auth/logout',
    /** POST — invalidate all sessions (Swagger: `/api/auth/logout-all`). */
    LOGOUT_ALL: '/auth/logout-all',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
    REFRESH_TOKEN: '/auth/refresh-token',
  },
  USER: {
    PROFILE: '/profile',
    UPADATE_PROFILE: '/profile',
    /** POST — append one row; body = flat address fields (`addressLine1`, `city`, …) at root. */
    PROFILE_ADDRESS: '/profile/addresses',
    /** DELETE — body `{ gameId, action: 'removeGame', uid }`. */
    GAME_PROFILE: '/profile/game-profile',
    WALLET: '/user/wallet',
    WALLET_UPI: '/user/wallet/upi',
    WALLET_TOPUP: '/user/wallet/topup',
    WALLET_WITHDRAW: '/user/wallet/withdraw',
  },
  GAMES: {
    /**
     * Game selection / catalog — `options`, `gameSelectionConfig`, indiaEsportsPersonalities, etc.
     * Not user profile; use USER.PROFILE only for the signed-in user's picks (selectedGames, follows, …).
     */
    GAME_OPTIONS: '/profile/game-options',
    GAME_DASHBOARD: '/profile/dashboard',
    LIST: '/games',
    BY_CATEGORY: (category: string) => `/games/category/${category}`,
  },
  TRANSACTIONS: {
    LIST: '/transactions',
  },
  ANTIHACK: {
    CHECK: '/antihack/check',
  },
  /**
   * Reverse geocode — GET with Bearer. Full URL = `apiBaseUrl` + this path.
   * Use `/geocode/reverse` when `API_BASE_URL` already includes `/api` (e.g. `https://host/api`).
   */
  GEOCODE: {
    REVERSE: '/geocode/reverse',
  },
} as const;
