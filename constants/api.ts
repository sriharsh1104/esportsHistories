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
    DASHBOARD_STATS: "/admin/dashboard/stats",
    DASHBOARD_STREAM: "/admin/dashboard/stream",
    /** GET — financial time-series (`period`: daily | weekly | monthly). */
    ANALYTICS: "/admin/analytics",
    USERS: "/admin/users",
    /** POST `{ userIds: string[] }` — set isBlocked true. */
    USERS_BLOCK: "/admin/users/block",
    /** POST `{ userIds: string[] }` — set isBlocked false. */
    USERS_UNBLOCK: "/admin/users/unblock",
    /** POST `{ email, name, password }` — create verified host (admin only). */
    HOSTS_CREATE: "/admin/hosts/create",
    /** POST `{ email, name, password }` — create org manager (admin only; Swagger path may vary). */
    ORG_MANAGERS_CREATE: "/org-managers/create",
    /** POST `{ name, slug, manager: { email, name, password } }` — create organization + dedicated manager. */
    ORGANIZATIONS: "/admin/organizations",
    /** PATCH `{ email, name, password }` — replace org manager. */
    ORGANIZATIONS_UPDATE_MANAGER: (orgId: string) =>
      `/admin/organizations/${encodeURIComponent(orgId)}/manager`,
    /** PATCH — block an organization. */
    ORGANIZATIONS_BLOCK: (orgId: string) =>
      `/admin/organizations/${encodeURIComponent(orgId)}/block`,
    /** PATCH — unblock an organization. */
    ORGANIZATIONS_UNBLOCK: (orgId: string) =>
      `/admin/organizations/${encodeURIComponent(orgId)}/unblock`,
    /** POST — generate lobbies (admin only; Swagger: `/api/admin/generate-lobbies`). */
    GENERATE_LOBBIES: "/admin/generate-lobbies",
    /** GET — game catalog for lobby creation (admin only; Swagger: `/api/admin/games/catalog`). */
    GAMES_CATALOG: "/admin/games/catalog",
    /**
     * GET — tournaments list for admin (Swagger: `/api/admin/tournaments`).
     * Query: status, date, fromDate, toDate, subMode, mode (backend may treat some as optional).
     */
    TOURNAMENTS: "/admin/tournaments",
    /**
     * Host applications for tournaments (admin only).
     *
     * Swagger:
     * - `GET /api/admin/host-applications` — query: page, limit, status (`pending` | `approved` | `rejected`).
     * - `POST /api/admin/host-applications/{applicationId}/approve`
     * - `POST /api/admin/host-applications/{applicationId}/reject`
     */
    HOST_APPLICATIONS: "/admin/host-applications",
    HOST_APPLICATION_APPROVE: (applicationId: string) =>
      `/admin/host-applications/${encodeURIComponent(applicationId)}/approve`,
    HOST_APPLICATION_REJECT: (applicationId: string) =>
      `/admin/host-applications/${encodeURIComponent(applicationId)}/reject`,
    /**
     * GET (SSE) — host application lifecycle; event `host_application`, e.g. `{ type: "submitted" }`.
     * Query: `access_token` (EventSource cannot send Authorization header).
     */
    HOST_APPLICATIONS_STREAM: "/admin/host-applications/stream",
    /** POST `{ tournamentId, hostId, forceAssign? }` — manual host assign (admin only). */
    ASSIGN_HOST: "/admin/assign-host",
    /** POST — create sponsored / special multi-round tournament (draft; admin only). */
    SPECIAL_TOURNAMENT_CREATE: "/special-tournament/create",
    SPECIAL_TOURNAMENT_OPEN_REGISTRATION: (id: string) =>
      `/special-tournament/${encodeURIComponent(id)}/open-registration`,
    SPECIAL_TOURNAMENT_CANCEL: (id: string) =>
      `/special-tournament/${encodeURIComponent(id)}/cancel`,
  },
  TOURNAMENT: {
    /**
     * GET — tournaments list (Swagger: `/api/tournament/list`).
     * Query: status, date, fromDate, toDate, subMode, mode (depends on backend).
     */
    LIST: "/tournament/list",
    /** GET (SSE) — stream tournaments; `game` query required by backend. */
    STREAM: "/tournament/list/stream",
    /** GET — lobby chat history for a tournament (Swagger: `/api/tournament/{tournamentId}/chat`). */
    CHAT: (tournamentId: string) =>
      `/tournament/${encodeURIComponent(tournamentId)}/chat`,
    /** POST — join as team leader `{ tournamentId, teamName, players }` (Swagger: `/api/tournament/join`). */
    JOIN: "/tournament/join",
    /** POST — special (sponsored) lobby leader join `{ teamName, players? }` (Swagger: `/api/special-tournament/{id}/join`). */
    SPECIAL_JOIN: (id: string) =>
      `/special-tournament/${encodeURIComponent(id)}/join`,
    /**
     * POST — accept leader invite as teammate `{ inviteCode }` or `{ code }` (path may match your Swagger).
     * Adjust if backend uses a different route (e.g. `/join-member`).
     */
    SPECIAL_JOIN_TEAM: (id: string) =>
      `/special-tournament/${encodeURIComponent(id)}/join-team`,
    /** GET — user-scoped special tournament detail (`tournament.myTeam`, counts, bracket, `userSlotInfo`). */
    SPECIAL_DETAIL: (id: string) =>
      `/special-tournament/${encodeURIComponent(id)}`,
    /**
     * GET (SSE) — `joinedTeams` / status updates; `access_token` query (same pattern as other streams).
     * Socket `tournament:status-updated` / `subscribe:tournament` is server-side; client uses this SSE on web.
     */
    SPECIAL_STREAM: (id: string) =>
      `/special-tournament/${encodeURIComponent(id)}/stream`,
    /** PATCH — roster update; refetch GET `SPECIAL_DETAIL` after success. */
    SPECIAL_PATCH_TEAM: (id: string) =>
      `/special-tournament/${encodeURIComponent(id)}/team`,
    /** GET — joined teams / slot assignment for a tournament. */
    JOINED_TEAMS: (tournamentId: string) =>
      `/tournament/${encodeURIComponent(tournamentId)}/joined-teams`,
    /** GET — single tournament / lobby detail (rules, metadata). */
    DETAIL: (tournamentId: string) =>
      `/tournament/${encodeURIComponent(tournamentId)}`,
    /** GET — leaderboard / point table snapshot. */
    RESULTS: (tournamentId: string) =>
      `/tournament/${encodeURIComponent(tournamentId)}/results`,
    /** GET — live aggregated standings + per-match rows (host updates). */
    LIVE_RESULTS: (tournamentId: string) =>
      `/tournament/${encodeURIComponent(tournamentId)}/live-results`,
    /**
     * GET (SSE) — live results / point table updates; `access_token` query (same pattern as other streams).
     * Optional: use polling via RESULTS on native if stream is unavailable.
     */
    RESULTS_STREAM: (tournamentId: string) =>
      `/tournament/${encodeURIComponent(tournamentId)}/results/stream`,
  },
  /** Host JWT — apply to tournaments, list assigned lobbies. */
  HOST: {
    TOURNAMENTS_AVAILABLE: "/host/tournaments/available",
    TOURNAMENT_APPLY: (tournamentId: string) =>
      `/host/tournaments/${encodeURIComponent(tournamentId)}/apply`,
    MY_LOBBIES: "/host/my-lobbies",
    /**
     * GET (SSE) — events `ready`, `host_application` (e.g. `type`: approved | rejected | assigned).
     * Query: `access_token`.
     */
    APPLICATIONS_STREAM: "/host/applications/stream",
    /** POST — host updates room id / password for a tournament lobby. */
    TOURNAMENT_UPDATE_ROOM: (tournamentId: string) =>
      `/host/tournaments/${encodeURIComponent(tournamentId)}/update-room`,
  },
} as const;
