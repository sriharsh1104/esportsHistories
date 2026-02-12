/**
 * API Endpoints - Centralized route paths for backend.
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    CHANGE_PASSWORD: '/auth/change-password',
    REFRESH_TOKEN: '/auth/refresh',
    ME: '/auth/me',
  },
  USER: {
    PROFILE: '/user/profile',
    ADDRESSES: '/user/addresses',
    GAME_PROFILES: '/user/game-profiles',
  },
  NEWS: {
    LIST: '/news',
    BY_GAME: (gameId: string) => `/news?gameId=${gameId}`,
  },
  GAMES: {
    LIST: '/games',
    FOLLOW: '/games/follow',
  },
  TOURNAMENTS: {
    LIST: '/tournaments',
    FOLLOW: '/tournaments/follow',
  },
  PLAYERS: {
    LIST: '/players',
    FOLLOW: '/players/follow',
  },
  SHOP: {
    ITEMS: '/shop/items',
    ITEM: (id: string) => `/shop/items/${id}`,
    CHECKOUT: '/shop/checkout',
    ORDERS: '/shop/orders',
  },
  WALLET: {
    BALANCE: '/wallet/balance',
    TOP_UP: '/wallet/top-up',
    WITHDRAW: '/wallet/withdraw',
  },
} as const;
