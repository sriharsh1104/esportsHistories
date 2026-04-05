/**
 * Centralized route paths for the app.
 * Use these constants instead of string literals for type safety and maintainability.
 */

/** Public routes – accessible without login */
export const PUBLIC_ROUTES = [
  "/(auth)/login",
  "/(auth)/signup",
  "/(auth)/forgot-password",
  "/(auth)/verify-otp",
  "/(auth)/verify-2fa",
  "/privacy-policy",
  "/terms",
  "/help-faq",
  "/ban-check",
] as const;

/** Private routes – require login */
export const PRIVATE_ROUTES = [
  "/(drawer)",
  "/edit-profile",
  "/game-profiles",
  "/addresses",
  "/address-book",
  "/select-games",
  "/(auth)/change-password",
] as const;

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some((r) => path.startsWith(r) || path === r);
}

export function isPrivateRoute(path: string): boolean {
  if (path.startsWith("/(drawer)")) return true;
  if (path.startsWith("/edit-profile")) return true;
  if (path.startsWith("/game-profiles")) return true;
  if (path.startsWith("/addresses")) return true;
  if (path.startsWith("/address-book")) return true;
  if (path.startsWith("/select-games")) return true;
  if (path.startsWith("/follow-explore")) return true;
  if (path.includes("change-password")) return true;
  return false;
}

export const ROUTES = {
  // Auth
  LOGIN: "/(auth)/login",
  SIGNUP: "/(auth)/signup",
  VERIFY_OTP: "/(auth)/verify-otp" as any,
  VERIFY_2FA: "/(auth)/verify-2fa" as any,
  FORGOT_PASSWORD: "/(auth)/forgot-password",
  CHANGE_PASSWORD: "/(auth)/change-password",

  // Main app — use folder path only; trailing `/index` breaks web linking in Expo Router 6
  HOME: "/(drawer)/(tabs)",
  NEWS: "/(drawer)/(tabs)",
  SHOP: "/(drawer)/(tabs)/shop",
  SHOP_ITEM: (id: string) => `/(drawer)/(tabs)/shop/${id}` as const,
  SHOP_CHECKOUT: "/(drawer)/(tabs)/shop/checkout",
  FOLLOW: "/(drawer)/(tabs)/follow",
  TOURNAMENT: "/(drawer)/(tabs)/tournament",
  /** Host-only bottom tab — lobby records (separate from public Tournament list). */
  LOBBY_TAB: "/(drawer)/(tabs)/lobby",
  GAME: "/(drawer)/(tabs)/game",
  GAME_SLUG: (slug: string) => `/(drawer)/(tabs)/game/${slug}` as const,

  /** Admin console — stats + user management (role `admin` only). Bottom tab + header shield on `(tabs)` layout. */
  ADMIN: "/(drawer)/(tabs)/admin-dashboard",
  /** Admin — manual host / org manager signup forms. */
  ADMIN_CREATE_ACCOUNTS: "/(drawer)/admin-create-accounts",
  /** Admin — generate tournament lobbies (`POST /admin/generate-lobbies`). */
  ADMIN_TOURNAMENT: "/(drawer)/admin-tournament",
  /** Admin — view tournaments / lobbies generated via `/admin/tournaments`. */
  ADMIN_TOURNAMENT_RECORD: "/(drawer)/admin-tournament-record",

  // Drawer
  PROFILE: "/(drawer)/(tabs)/profile",
  WALLET: "/(drawer)/(tabs)/wallet",
  SETTINGS: "/(drawer)/(tabs)/settings",

  // Standalone
  SELECT_GAMES: "/select-games",
  SELECT_GAMES_SETTINGS: "/select-games?from=settings",
  SELECT_GAMES_ONBOARDING: "/select-games?from=onboarding",
  SELECT_GAMES_FOLLOW: "/select-games?from=follow",
  SELECT_GAMES_TOURNAMENT: "/select-games?from=tournament",

  /** Browse / follow — lists come from game-options API (`fetchFollowCatalog`). */
  FOLLOW_EXPLORE_GAMES: "/follow-explore?type=games",
  FOLLOW_EXPLORE_PERSON: "/follow-explore?type=personality",
  FOLLOW_EXPLORE_ORG: "/follow-explore?type=organization",

  EDIT_PROFILE: "/edit-profile",
  EDIT_PROFILE_SIGNUP: "/edit-profile?from=signup",
  GAME_PROFILES: "/game-profiles",

  ADDRESSES: "/addresses",
  /** Saved addresses — pick one for checkout or set default delivery. */
  ADDRESS_BOOK: "/address-book",
  ADDRESS_BOOK_CHECKOUT: (productId: string) =>
    `/address-book?from=checkout&productId=${encodeURIComponent(productId)}` as const,
  PRIVACY_POLICY: "/privacy-policy",
  TERMS: "/terms",
  HELP_FAQ: "/help-faq",
  BAN_CHECK: "/ban-check",

  /** Deep link / web: join a special-tournament team via leader invite (`?tournamentId=&invite=`). */
  SPECIAL_TEAM_INVITE: "/special-team-invite",
} as const;

/** Typed route path for type-safe navigation */
export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES] extends infer R
  ? R extends (...args: any[]) => any
    ? ReturnType<R>
    : R
  : never;
