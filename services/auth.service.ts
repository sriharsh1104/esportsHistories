import type {
  DeleteGameProfileInput,
  GameProfile,
  LoginCredentials,
  SignupCredentials,
  Transaction,
  TransactionFilters,
  UpdateProfileData,
  User,
  UserAddress,
} from '@/types/auth';
import { API_ENDPOINTS } from '@/constants/api';
import {
  mergeGameProfileListsPreferUid,
  mergeGameProfilesForPersistence,
} from '@/utils/gameProfiles';
import { mergeSelectedGamesForPersistence } from '@/utils/gameSelection';
import {
  followEntriesToApiStringArray,
  mergeFollowEntryLists,
  normalizeFollowProfileEntryArray,
  sanitizeFollowProfilePayload,
} from '@/utils/followProfile';
import { api, ApiError } from './api.service';
import { clearToken, commonService, setRefreshToken, setToken } from './common.service';

const TOKEN_KEY = '@esports_auth_token';
const REFRESH_TOKEN_KEY = '@esports_refresh_token';
const USER_KEY = '@esports_user';
const TOKEN_EXPIRY_BUFFER_SECONDS = 45;

function normalizeGameProfilesFromApi(raw: unknown): GameProfile[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: GameProfile[] = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object') continue;
    const o = p as Record<string, unknown>;
    const id = String(o._id ?? o.id ?? '').trim();
    const gameId = String(o.gameId ?? o.game ?? '').trim();
    const gameName = String(o.gameName ?? o.name ?? o.game ?? '').trim();
    const gameUid = String(o.gameUid ?? o.uid ?? o.playerId ?? '').trim();
    if (!gameUid) continue;
    const safeId = id || (gameId && gameUid ? `${gameId}:${gameUid}` : gameId);
    if (!safeId && !gameId) continue;
    out.push({
      id: safeId || gameId,
      gameId: gameId || safeId,
      gameName: gameName || gameId || safeId,
      gameUid,
    });
  }
  return out;
}

/** `followedGames[]` on profile: `{ game, platform, selected, uid }` — some backends store UID only here. */
function normalizeGameProfilesFromFollowedGames(raw: unknown): GameProfile[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: GameProfile[] = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object') continue;
    const o = p as Record<string, unknown>;
    const uid = String(o.uid ?? o.gameUid ?? '').trim();
    if (!uid) continue;
    const gameName = String(o.game ?? o.gameName ?? '').trim();
    const gameIdFromApi = String(o.gameId ?? '').trim();
    const slug =
      gameIdFromApi ||
      (gameName ? gameName.toLowerCase().replace(/\s+/g, '-') : '');
    if (!slug && !gameName) continue;
    const id = String(o._id ?? o.id ?? '').trim() || `${slug}:${uid}`;
    out.push({
      id,
      gameId: slug || gameName.toLowerCase().replace(/\s+/g, '-'),
      gameName: gameName || slug,
      gameUid: uid,
    });
  }
  return out;
}

/**
 * Some APIs store in-game UID under `followedGames[].uid` on profile GET; mirror that on PUT so the
 * server can persist UIDs even when `gameProfiles` is ignored.
 */
function buildFollowedGamesWithUidsPayload(
  selectedGames: User['selectedGames'] | undefined,
  gameProfiles: GameProfile[]
): unknown[] | undefined {
  if (!Array.isArray(selectedGames) || selectedGames.length === 0) return undefined;
  const norm = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const rows: unknown[] = [];
  for (const g of selectedGames) {
    const gameName =
      typeof g === 'object' && g != null
        ? String((g as { game?: string; name?: string }).game ?? (g as { name?: string }).name ?? '').trim()
        : String(g).trim();
    if (!gameName) continue;
    const platform =
      typeof g === 'object' &&
      g != null &&
      ((g as { platform?: string }).platform === 'pc' || (g as { platform?: string }).platform === 'mobile')
        ? (g as { platform: 'pc' | 'mobile' }).platform
        : 'mobile';
    const slug = gameName.toLowerCase().replace(/\s+/g, '-');
    const match =
      gameProfiles.find((p) => norm(p.gameName) === norm(gameName)) ||
      gameProfiles.find((p) => norm(p.gameId) === norm(slug));
    const uid = match?.gameUid?.trim() || null;
    rows.push({
      game: gameName,
      platform,
      selected: true,
      uid,
    });
  }
  return rows.length ? rows : undefined;
}

/** Profile PUT — API expects `uid` (and often `gameUid`); skip client draft `id` for new rows. */
function mapGameProfilesForProfilePut(profiles: GameProfile[]): unknown[] {
  return profiles.map((p) => {
    const uid = String(p.gameUid ?? '').trim();
    const draftId = /^\d{10,16}$/.test(String(p.id).trim());
    const row: Record<string, unknown> = {
      gameId: p.gameId,
      gameName: p.gameName,
      gameUid: uid,
      uid,
    };
    if (!draftId && String(p.id).trim()) {
      row.id = p.id;
      row._id = p.id;
    }
    return row;
  });
}

function rethrowAsApiError(error: unknown, fallbackMessage: string): never {
  if (error instanceof ApiError) throw error;
  const message = error instanceof Error && error.message ? error.message : fallbackMessage;
  throw new ApiError(message);
}

/** Login + verify OTP: persist tokens and merge selected games with any cached user. */
async function persistAuthSession(data: any): Promise<{ user: User; token: string }> {
  const previousUser = await commonService.getItem<User>(USER_KEY);
  const user = migrateUserFromAuthData(data);
  const mergedUser: User = {
    ...user,
    gameProfiles: mergeGameProfilesForPersistence(
      user.gameProfiles,
      previousUser?.id === user.id ? previousUser.gameProfiles : undefined
    ),
    selectedGames: mergeSelectedGamesForPersistence(
      user.selectedGames,
      previousUser?.id === user.id ? previousUser.selectedGames : undefined
    ),
    followedPersonalities: mergeFollowEntryLists(
      user.followedPersonalities,
      previousUser?.id === user.id ? previousUser.followedPersonalities : undefined
    ),
    followedOrganizations: mergeFollowEntryLists(
      user.followedOrganizations,
      previousUser?.id === user.id ? previousUser.followedOrganizations : undefined
    ),
  };
  const { token, refreshToken } = getTokenFields(data);

  await commonService.setItem(TOKEN_KEY, token);
  await commonService.setItem(REFRESH_TOKEN_KEY, refreshToken);
  await commonService.setItem(USER_KEY, mergedUser);
  setToken(token);
  setRefreshToken(refreshToken);

  return { user: mergedUser, token };
}

export type MergeUserFromApiOptions = {
  selectedGamesBaseline?: User['selectedGames'];
  followedPersonalitiesBaseline?: User['followedPersonalities'];
  followedOrganizationsBaseline?: User['followedOrganizations'];
  /** After PUT with `gameProfiles`, use this when GET body omits or clears them. */
  gameProfilesBaseline?: User['gameProfiles'];
};

/** Profile GET/PUT: merge API user with stored user, preserving UPI and merging game / follow picks. */
function mergeUserFromApiResponse(
  migratedUser: User,
  previousUser: User | null | undefined,
  options?: MergeUserFromApiOptions
): User {
  const gamesBaseline =
    options?.selectedGamesBaseline !== undefined
      ? options.selectedGamesBaseline
      : previousUser?.selectedGames;
  const personalitiesBaseline =
    options?.followedPersonalitiesBaseline !== undefined
      ? options.followedPersonalitiesBaseline
      : previousUser?.followedPersonalities;
  const organizationsBaseline =
    options?.followedOrganizationsBaseline !== undefined
      ? options.followedOrganizationsBaseline
      : previousUser?.followedOrganizations;
  const gameProfilesFallback =
    options?.gameProfilesBaseline !== undefined
      ? options.gameProfilesBaseline
      : previousUser?.gameProfiles;

  return {
    ...(previousUser ?? migratedUser),
    ...migratedUser,
    upiIds: migratedUser.upiIds ?? previousUser?.upiIds,
    selectedGames: mergeSelectedGamesForPersistence(migratedUser.selectedGames, gamesBaseline),
    followedPersonalities: mergeFollowEntryLists(
      migratedUser.followedPersonalities,
      personalitiesBaseline
    ),
    followedOrganizations: mergeFollowEntryLists(
      migratedUser.followedOrganizations,
      organizationsBaseline
    ),
    gameProfiles: mergeGameProfilesForPersistence(migratedUser.gameProfiles, gameProfilesFallback),
  };
}

function normalizeSelectedGamesForUpdate(data: UpdateProfileData): User['selectedGames'] | undefined {
  return data.selectedGames?.map((g: any) => {
    if (typeof g !== 'object') return String(g);
    return { platform: g.platform, game: g.game };
  });
}

export async function saveUserData(user: User): Promise<void> {
  await commonService.setItem(USER_KEY, user);
}

/** Backend field names for "games user follows" (often not the same as `selectedGames`). */
const USER_GAME_LIST_KEYS = [
  'selectedGames',
  'followedGames',
  'followGames',
  'followingGames',
  'gamesToFollow',
  'followed_games',
  'selected_games',
] as const;

/**
 * Same object may have `selectedGames: []` while real picks live under another key (e.g. followGames).
 * Prefer any non-empty list; only then fall back to the first empty array (explicit clear).
 */
function coalesceSelectedGamesField(obj: any): any[] | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of USER_GAME_LIST_KEYS) {
    const arr = obj[key];
    if (Array.isArray(arr) && arr.length > 0) return arr;
  }
  for (const key of USER_GAME_LIST_KEYS) {
    const arr = obj[key];
    if (Array.isArray(arr)) return arr;
  }
  return undefined;
}

/** Only return a list if it has items — avoids treating `[]` from one path as final while another path has games. */
function firstNonEmptyGameList(...candidates: (any[] | undefined)[]): any[] | undefined {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c;
  }
  return undefined;
}

function migrateUserFromAuthData(data: any): User {
  // Supports both:
  // - backend: { _id, username, email, fullName, phone, upiIds, bio, ... }
  // - older shape: { user: { userId, name, isEmailVerified, ... }, accessToken, refreshToken }
  const direct = data?.user ? data.user : data;

  const id = direct?._id ?? data?._id ?? direct?.id ?? direct?.userId ?? '';
  const email = direct?.email ?? data?.email ?? '';

  const username =
    direct?.username ??
    direct?.name ??
    data?.username ??
    data?.name ??
    direct?.displayName ??
    '';

  const fullNameValue =
    direct?.fullName ??
    data?.fullName ??
    direct?.name ??
    data?.name ??
    username;
  const fullName = fullNameValue ? fullNameValue : undefined;

  const phone =
    direct?.phone ??
    data?.phone ??
    direct?.phoneNumber ??
    data?.phoneNumber ??
    undefined;
  const onboardingStep = direct?.onboardingStep ?? data?.onboardingStep ?? undefined;

  // User's game picks only from profile fields (selectedGames, followGames, etc.).
  // Catalog / `options` / `gameSelectionConfig` / indiaEsports* live on GET `/profile/game-options` — not parsed here.
  // `unknown` so the `{ mobile: string[]; pc: string[] }` shape is a valid non-array branch (return type of
  // firstNonEmptyGameList is only `any[] | undefined`, which would otherwise narrow this branch to `never`).
  const rawSelectedSource: unknown = firstNonEmptyGameList(
    coalesceSelectedGamesField(direct),
    coalesceSelectedGamesField(data),
    coalesceSelectedGamesField(direct?.profile),
    coalesceSelectedGamesField(data?.profile),
    coalesceSelectedGamesField(direct?.userPreference),
    coalesceSelectedGamesField(data?.userPreference),
    coalesceSelectedGamesField(direct?.preferences),
    coalesceSelectedGamesField(data?.preferences)
  );

  const selectedGames = Array.isArray(rawSelectedSource)
    ? rawSelectedSource
    : rawSelectedSource && typeof rawSelectedSource === 'object'
      ? (() => {
          const byPlatform = rawSelectedSource as { mobile?: unknown; pc?: unknown };
          return [
            ...(Array.isArray(byPlatform.mobile)
              ? byPlatform.mobile.map((game: string) => ({ platform: 'mobile' as const, game }))
              : []),
            ...(Array.isArray(byPlatform.pc)
              ? byPlatform.pc.map((game: string) => ({ platform: 'pc' as const, game }))
              : []),
          ];
        })()
      : undefined;

  const addresses = direct?.addresses ?? data?.addresses;
  const rawGameProfiles = direct?.gameProfiles ?? data?.gameProfiles;
  const fromGameProfiles = normalizeGameProfilesFromApi(rawGameProfiles);
  const fromFollowedGames = normalizeGameProfilesFromFollowedGames(
    direct?.followedGames ?? data?.followedGames
  );
  const gameProfiles = mergeGameProfileListsPreferUid(fromGameProfiles, fromFollowedGames);

  const rawUpiIds = direct?.upiIds ?? data?.upiIds;
  const paymentUpi = direct?.paymentUPI ?? data?.paymentUPI;
  const upiIds =
    rawUpiIds ??
    (paymentUpi
      ? [String(paymentUpi)]
      : undefined);

  const rawBio = direct?.bio ?? data?.bio;
  const gender = direct?.gender ?? data?.gender;
  const dateOfBirth = direct?.dateOfBirth ?? data?.dateOfBirth;
  const bio =
    rawBio ??
    (gender || dateOfBirth
      ? {
          gender: gender ? String(gender) : undefined,
          dateOfBirth: dateOfBirth ? String(dateOfBirth) : undefined,
        }
      : undefined);
  const avatarUrl = direct?.profilePic ?? data?.profilePic ?? direct?.avatarUrl ?? data?.avatarUrl;

  const followedPersonalities = normalizeFollowProfileEntryArray(
    direct?.followedPersonalities ??
      data?.followedPersonalities ??
      direct?.followed_personalities ??
      data?.followed_personalities
  );
  const followedOrganizations = normalizeFollowProfileEntryArray(
    direct?.followedOrganizations ??
      data?.followedOrganizations ??
      direct?.followed_organizations ??
      data?.followed_organizations
  );

  return {
    id: String(id),
    email: String(email),
    displayName: String(username),
    fullName: fullName ? String(fullName) : undefined,
    phone,
    role: direct?.role,
    isVerified: direct?.isVerified ?? direct?.isEmailVerified,
    upiIds,
    bio,
    avatarUrl,
    addresses,
    gameProfiles,
    onboardingStep,
    selectedGames,
    followedPersonalities,
    followedOrganizations,
  };
}

function getTokenFields(data: any): { token: string; refreshToken: string } {
  const token = data?.accessToken ?? data?.token ?? data?.access_token ?? '';
  const refreshToken = data?.refreshToken ?? data?.refresh_token ?? '';
  return { token: String(token), refreshToken: String(refreshToken) };
}

function decodeJwtExp(token?: string | null): number | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decodeFn = typeof atob === 'function' ? atob : null;
    if (!decodeFn) return null;
    const payload = JSON.parse(decodeFn(padded)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function isTokenExpiringSoon(token?: string | null, bufferSeconds = TOKEN_EXPIRY_BUFFER_SECONDS): boolean {
  const exp = decodeJwtExp(token);
  if (!exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return exp - now <= bufferSeconds;
}

async function tryRefreshSession(refreshToken: string): Promise<{ token: string; refreshToken: string } | null> {
  try {
    const res = await api.post<any>(
      API_ENDPOINTS.AUTH.REFRESH_TOKEN,
      {
        refreshToken,
        refresh_token: refreshToken,
        token: refreshToken,
      },
      { skipAuth: true, toast: false }
    );
    const tokenFields = getTokenFields(res);
    if (!tokenFields.token) return null;
    return {
      token: tokenFields.token,
      refreshToken: tokenFields.refreshToken || refreshToken,
    };
  } catch {
    return null;
  }
}

export async function login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
  try {
    const data = await api.post<any>(API_ENDPOINTS.AUTH.LOGIN, credentials, { skipAuth: true });
    return await persistAuthSession(data);
  } catch (error) {
    rethrowAsApiError(error, 'Login failed');
  }
}

export async function signup(
  credentials: SignupCredentials
): Promise<{ email: string; message: string }> {
  try {
    const trimmedName = credentials.displayName.trim().replace(/\s+/g, ' ');
    const res = await api.post<{ email: string }>(
      API_ENDPOINTS.AUTH.SIGNUP,
      {
        email: credentials.email,
        password: credentials.password,
        // Backend validation expects "name". Keep "username" for compatibility.
        name: trimmedName || credentials.email.split('@')[0],
        username: trimmedName || credentials.email.split('@')[0],
      }
    );
    return { email: res.email, message: 'Registration successful. OTP has been sent to your email.' };
  } catch (error) {
    rethrowAsApiError(error, 'Signup failed');
  }
}

export async function verifyOtp(
  email: string,
  otp: string
): Promise<{ user: User; token: string }> {
  try {
    const data = await api.post<any>(API_ENDPOINTS.AUTH.VERIFY_OTP, {
      email,
      otp,
    });
    return await persistAuthSession(data);
  } catch (error) {
    rethrowAsApiError(error, 'Verification failed');
  }
}

export async function resendOtp(email: string): Promise<void> {
  try {
    await api.post(API_ENDPOINTS.AUTH.RESEND_OTP, { email });
  } catch (error) {
    rethrowAsApiError(error, 'Resend failed');
  }
}

export async function logout(options?: { allDevices?: boolean }): Promise<void> {
  const refreshToken = await commonService.getItemString(REFRESH_TOKEN_KEY);
  const allDevices = options?.allDevices === true;

  try {
    if (allDevices) {
      await api.post(API_ENDPOINTS.AUTH.LOGOUT_ALL, undefined);
    } else {
      // Backend expects `Authorization: Bearer <accessToken>`; do not use skipAuth here.
      await api.post(API_ENDPOINTS.AUTH.LOGOUT, refreshToken ? { refreshToken } : {});
    }
  } catch {
    // Local cleanup still runs even if remote logout fails.
  } finally {
    await commonService.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
    clearToken();
  }
}

export async function getStoredAuth(): Promise<{ user: User; token: string } | null> {
  let t = await commonService.getItemString(TOKEN_KEY);
  let rt = await commonService.getItemString(REFRESH_TOKEN_KEY);
  const u = await commonService.getItem<User>(USER_KEY);
  
  if (u && rt && (!t || isTokenExpiringSoon(t))) {
    const refreshed = await tryRefreshSession(rt);
    if (!refreshed) {
      await logout();
      return null;
    }
    t = refreshed.token;
    rt = refreshed.refreshToken;
    await commonService.setItem(TOKEN_KEY, refreshed.token);
    await commonService.setItem(REFRESH_TOKEN_KEY, refreshed.refreshToken);
    setRefreshToken(refreshed.refreshToken);
  }

  if (t && u) {
    try {
      setToken(t);
      if (rt) setRefreshToken(rt);
      return { token: t, user: u };
    } catch {
      await logout();
    }
  }
  return null;
}

export async function getProfile(mergeOptions?: MergeUserFromApiOptions): Promise<User> {
  try {
    const res = await api.get<any>(API_ENDPOINTS.USER.PROFILE);
    const previousUser = await commonService.getItem<User>(USER_KEY);
    const migratedUser = migrateUserFromAuthData(res);
    const mergedUser = mergeUserFromApiResponse(migratedUser, previousUser, mergeOptions);
    await commonService.setItem(USER_KEY, mergedUser);
    return mergedUser;
  } catch (error) {
    rethrowAsApiError(error, 'Failed to fetch profile');
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  } catch (error) {
    rethrowAsApiError(error, 'Request failed');
  }
}

export async function resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
  try {
    await api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { email, otp, newPassword });
  } catch (error) {
    rethrowAsApiError(error, 'Reset failed');
  }
}

export async function updateProfile(data: UpdateProfileData): Promise<User> {
  try {
    const previousUser = await commonService.getItem<User>(USER_KEY);
    const payload: Record<string, unknown> = {
      username: data.displayName,
      fullName: data.fullName,
      phone: data.phone,
      bio: data.bio,
      onboardingStep: data.onboardingStep,
      selectedGames: data.selectedGames,
      addresses: data.addresses,
    };
    if (data.gameProfiles !== undefined) {
      payload.gameProfiles = mapGameProfilesForProfilePut(data.gameProfiles);
      const followedPayload = buildFollowedGamesWithUidsPayload(previousUser?.selectedGames, data.gameProfiles);
      if (followedPayload) {
        payload.followedGames = followedPayload;
      }
    }
    if (data.followedPersonalities !== undefined) {
      const entries = sanitizeFollowProfilePayload(data.followedPersonalities) ?? [];
      payload.followedPersonalities = followEntriesToApiStringArray(entries);
    }
    if (data.followedOrganizations !== undefined) {
      const entries = sanitizeFollowProfilePayload(data.followedOrganizations) ?? [];
      payload.followedOrganizations = followEntriesToApiStringArray(entries);
    }

    const res = await api.put<any>(API_ENDPOINTS.USER.PROFILE, payload);
    const migratedUser = migrateUserFromAuthData(res);
    const normalizedSelectedGames = normalizeSelectedGamesForUpdate(data);
    const personalitiesBaseline =
      data.followedPersonalities !== undefined
        ? sanitizeFollowProfilePayload(data.followedPersonalities) ?? []
        : undefined;
    const organizationsBaseline =
      data.followedOrganizations !== undefined
        ? sanitizeFollowProfilePayload(data.followedOrganizations) ?? []
        : undefined;

    const updatedUser = mergeUserFromApiResponse(migratedUser, previousUser, {
      selectedGamesBaseline: normalizedSelectedGames ?? previousUser?.selectedGames,
      followedPersonalitiesBaseline: personalitiesBaseline,
      followedOrganizationsBaseline: organizationsBaseline,
      ...(data.gameProfiles !== undefined && { gameProfilesBaseline: data.gameProfiles }),
    });

    await commonService.setItem(USER_KEY, updatedUser);
    return updatedUser;
  } catch (error) {
    rethrowAsApiError(error, 'Profile update failed');
  }
}

export async function updateAddresses(addresses: UserAddress[]): Promise<User> {
  return updateProfile({ addresses });
}

/** DELETE `/profile/game-profile` — payload `{ gameId, action: 'removeGame', uid }`. */
export async function deleteGameProfile(input: DeleteGameProfileInput): Promise<User> {
  try {
    const uid = input.gameUid?.trim();
    const gameId = input.gameId?.trim();
    if (!uid) {
      throw new ApiError('UID is required to remove a game profile', 400);
    }
    if (!gameId) {
      throw new ApiError('gameId is required to remove a game profile', 400);
    }

    const body = {
      gameId,
      action: 'removeGame' as const,
      uid,
    };

    await api.delete(API_ENDPOINTS.USER.GAME_PROFILE, { body });
    // Drop cached profiles so merge does not resurrect the deleted row when GET omits `gameProfiles`.
    return getProfile({ gameProfilesBaseline: [] });
  } catch (error) {
    rethrowAsApiError(error, 'Failed to delete game profile');
  }
}

export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  try {
    await api.put(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, { oldPassword, newPassword });
  } catch (error) {
    rethrowAsApiError(error, 'Change password failed');
  }
}

export async function getWalletData(): Promise<{ walletBalance: number; upiIds: string[] }> {
  try {
    const res = await api.get<{ walletBalance: number; upiIds: string[] }>(API_ENDPOINTS.USER.WALLET);
    return res;
  } catch (error) {
    rethrowAsApiError(error, 'Failed to fetch wallet data');
  }
}

export async function updateWalletUpi(upiIds: string[]): Promise<string[]> {
  try {
    const res = await api.post<{ upiIds: string[] }>(API_ENDPOINTS.USER.WALLET_UPI, { upiIds });
    return res.upiIds;
  } catch (error) {
    rethrowAsApiError(error, 'Failed to update UPI IDs');
  }
}

export async function topUp(amount: number): Promise<{ walletBalance: number }> {
  try {
    const res = await api.post<{ walletBalance: number }>(API_ENDPOINTS.USER.WALLET_TOPUP, { amount });
    return res;
  } catch (error) {
    rethrowAsApiError(error, 'Top up failed');
  }
}

export async function withdraw(amount: number, upiId: string): Promise<{ walletBalance: number }> {
  try {
    const res = await api.post<{ walletBalance: number }>(API_ENDPOINTS.USER.WALLET_WITHDRAW, { amount, upiId });
    return res;
  } catch (error) {
    rethrowAsApiError(error, 'Withdrawal failed');
  }
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  try {
    const res = await api.get<Transaction[]>(API_ENDPOINTS.TRANSACTIONS.LIST, filters as any);
    return res;
  } catch (error) {
    rethrowAsApiError(error, 'Failed to fetch transactions');
  }
}
