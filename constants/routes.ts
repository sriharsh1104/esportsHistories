/**
 * Centralized route paths for the app.
 * Use these constants instead of string literals for type safety and maintainability.
 */
export const ROUTES = {
  // Auth
  LOGIN: '/(auth)/login',
  SIGNUP: '/(auth)/signup',
  VERIFY_OTP: '/(auth)/verify-otp' as any,
  FORGOT_PASSWORD: '/(auth)/forgot-password',
  CHANGE_PASSWORD: '/(auth)/change-password',

  // Main app
  HOME: '/(drawer)/(tabs)',
  NEWS: '/(drawer)/(tabs)',
  SHOP: '/(drawer)/(tabs)/shop',
  SHOP_ITEM: (id: string) => `/(drawer)/(tabs)/shop/${id}` as const,
  SHOP_CHECKOUT: '/(drawer)/(tabs)/shop/checkout',
  FOLLOW: '/(drawer)/(tabs)/follow',
  TOURNAMENT: '/(drawer)/(tabs)/tournament',
  GAME: '/(drawer)/(tabs)/game',
  GAME_SLUG: (slug: string) => `/(drawer)/(tabs)/game/${slug}` as const,

  // Drawer
  PROFILE: '/(drawer)/(tabs)/profile',
  WALLET: '/(drawer)/(tabs)/wallet',
  SETTINGS: '/(drawer)/(tabs)/settings',

  // Standalone
  SELECT_GAMES: '/select-games',
  SELECT_GAMES_SETTINGS: '/select-games?from=settings',
  SELECT_GAMES_ONBOARDING: '/select-games?from=onboarding',
  SELECT_GAMES_FOLLOW: '/select-games?from=follow',
  SELECT_GAMES_TOURNAMENT: '/select-games?from=tournament',

  EDIT_PROFILE: '/edit-profile',
  EDIT_PROFILE_SIGNUP: '/edit-profile?from=signup',
  GAME_PROFILES: '/game-profiles',

  ADDRESSES: '/addresses',
  PRIVACY_POLICY: '/privacy-policy',
  TERMS: '/terms',
  HELP_FAQ: '/help-faq',
} as const;

/** Typed route path for type-safe navigation */
export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES] extends infer R
  ? R extends (...args: any[]) => any
    ? ReturnType<R>
    : R
  : never;
