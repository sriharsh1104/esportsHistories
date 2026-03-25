import type {
  DeleteGameProfileInput,
  GameProfile,
  LoginCredentials,
  SignupCredentials,
  DeviceHistoryResponse,
  UpdateProfileData,
  User,
  UserAddress,
} from '@/types/auth';
import { API_ENDPOINTS } from '@/constants/api';
import { Platform } from 'react-native';
import {
  mergeGameProfileListsPreferUid,
  mergeGameProfilesForPersistence,
} from '@/utils/gameProfiles';
import { mergeSelectedGamesForPersistence } from '@/utils/gameSelection';
import {
  followEntriesToApiStringArray,
  mergeFollowEntryLists,
  mergeFollowProfileSources,
  sanitizeFollowProfilePayload,
} from '@/utils/followProfile';
import { api, ApiError } from './api.service';
import { clearToken, commonService, setRefreshToken, setToken } from './common.service';

const TOKEN_KEY = '@esports_auth_token';
const REFRESH_TOKEN_KEY = '@esports_refresh_token';
const USER_KEY = '@esports_user';
const TOKEN_EXPIRY_BUFFER_SECONDS = 45;

export type LoginResult =
  | { kind: 'success'; user: User; token: string }
  | { kind: '2fa_required'; email: string; twoFactorToken: string };

export type TwoFactorStatus = { enabled: boolean };
export type TwoFactorSetup = { otpauthUrl?: string; qrCodeDataUrl?: string; secret?: string };

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
        ? String(
            (g as { game?: string; name?: string; gameName?: string; title?: string }).game ??
              (g as { name?: string }).name ??
              (g as { gameName?: string }).gameName ??
              (g as { title?: string }).title ??
              ''
          ).trim()
        : String(g).trim();
    if (!gameName) continue;
    let platform: 'mobile' | 'pc' = 'mobile';
    if (typeof g === 'object' && g != null) {
      const p = String((g as { platform?: string }).platform ?? '').toLowerCase();
      if (p === 'pc') platform = 'pc';
      else if (p === 'mobile') platform = 'mobile';
    }
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

function extractTwoFactorToken(data: any): string | null {
  const token =
    data?.twoFactorToken ??
    data?.two_factor_token ??
    data?.data?.twoFactorToken ??
    data?.data?.two_factor_token ??
    null;
  const value = token != null ? String(token).trim() : '';
  return value ? value : null;
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
  /** When PUT echoes empty `addresses`, keep the list we just sent. */
  addressesBaseline?: UserAddress[];
};

function hasUsableAddresses(list: UserAddress[] | undefined): boolean {
  return !!list?.some((a) => String(a.addressLine1 ?? '').trim().length > 0);
}

/** One row from API or legacy client cache (`line1`, `phone`). */
function normalizeUserAddressRow(raw: unknown): UserAddress | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const addressLine1 = String(o.addressLine1 ?? o.line1 ?? '').trim();
  const city = String(o.city ?? '').trim();
  if (!addressLine1 && !city) return null;
  const id = String(o._id ?? o.id ?? '').trim() || `addr-${Date.now()}`;
  return {
    id,
    label: o.label != null ? String(o.label) : undefined,
    addressLine1: addressLine1 || city,
    addressLine2: o.addressLine2 != null ? String(o.addressLine2) : o.line2 != null ? String(o.line2) : undefined,
    city,
    state: String(o.state ?? '').trim(),
    pincode: String(o.pincode ?? o.postalCode ?? '').trim(),
    contactNumber:
      o.contactNumber != null
        ? String(o.contactNumber)
        : o.phone != null
          ? String(o.phone)
          : undefined,
    countryCode: o.countryCode != null ? String(o.countryCode) : undefined,
    isDefault: o.isDefault === true,
  };
}

function normalizeAddressesFromApi(direct: any, data: any): UserAddress[] | undefined {
  const listRaw = direct?.addresses ?? data?.addresses;
  if (!Array.isArray(listRaw) || listRaw.length === 0) return undefined;
  const fromList = listRaw
    .map(normalizeUserAddressRow)
    .filter((x): x is UserAddress => x != null);
  return fromList.length ? fromList : undefined;
}

/**
 * Single row for PUT `/profile` body key `address`.
 * GET still returns full list under `addresses` (up to 5).
 */
function mapUserAddressForProfileApi(a: UserAddress): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: a.id,
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2 ?? '',
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: a.isDefault === true,
  };
  if (a.label != null) row.label = a.label;
  if (a.contactNumber != null) row.contactNumber = a.contactNumber;
  if (a.countryCode != null) row.countryCode = a.countryCode;
  return row;
}

/** Which row to send as `address` on PUT — new row, else default, else first. */
function pickAddressRowForProfilePut(
  next: UserAddress[],
  previous: UserAddress[] | undefined | null
): UserAddress | null {
  if (next.length === 0) return null;
  const prevIds = new Set((previous ?? []).map((p) => p.id));
  const added = next.find((a) => !prevIds.has(a.id));
  if (added) return added;
  const defaultRow = next.find((a) => a.isDefault);
  if (defaultRow) return defaultRow;
  return next[0] ?? null;
}

function migrateLegacyStoredUser(user: User): User {
  const list = user.addresses;
  if (!Array.isArray(list) || list.length === 0) return user;
  const addresses = list
    .map((row) => normalizeUserAddressRow(row as unknown))
    .filter((x): x is UserAddress => x != null);
  return addresses.length ? { ...user, addresses } : { ...user, addresses: undefined };
}

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

  const addressesFromApi = migratedUser.addresses;
  const baseline = options?.addressesBaseline;
  const addresses = hasUsableAddresses(addressesFromApi)
    ? addressesFromApi
    : baseline !== undefined
      ? baseline
      : hasUsableAddresses(previousUser?.addresses)
        ? previousUser?.addresses
        : addressesFromApi;

  return {
    ...(previousUser ?? migratedUser),
    ...migratedUser,
    paymentUPI: migratedUser.paymentUPI ?? previousUser?.paymentUPI,
    paymentMethod: migratedUser.paymentMethod ?? previousUser?.paymentMethod,
    isPaymentVerified:
      migratedUser.isPaymentVerified !== undefined
        ? migratedUser.isPaymentVerified
        : previousUser?.isPaymentVerified,
    upiIds: migratedUser.upiIds ?? previousUser?.upiIds,
    addresses,
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

/**
 * PUT `/profile` — server validates each followed game has `game` + `platform` (not raw catalog ids).
 */
function coerceSelectedGamesForProfilePut(
  selectedGames: NonNullable<UpdateProfileData['selectedGames']>
): Array<{ platform: 'mobile' | 'pc'; game: string }> {
  const raw = Array.isArray(selectedGames) ? selectedGames : [];
  if (raw.some((g) => typeof g === 'string' || typeof g === 'number')) {
    throw new ApiError(
      'Each followed game must include valid game/platform. Pick games from the list and save again.',
      400
    );
  }
  const out: Array<{ platform: 'mobile' | 'pc'; game: string }> = [];
  for (const g of raw) {
    if (!g || typeof g !== 'object') continue;
    const o = g as Record<string, unknown>;
    const game = String(o.game ?? o.name ?? o.gameName ?? o.title ?? '').trim();
    const rawP = String(o.platform ?? 'mobile').toLowerCase();
    const platform: 'mobile' | 'pc' = rawP === 'pc' ? 'pc' : 'mobile';
    if (!game) continue;
    out.push({ platform, game });
  }
  if (out.length === 0 && raw.length > 0) {
    throw new ApiError('Each followed game must include valid game/platform.', 400);
  }
  return out;
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
 * Same object may have `selectedGames: []` while real picks live under `followedGames` / etc.
 * Prefer first non-empty array in key order; only if all are empty/missing, return the first `[]` seen
 * (old two-pass logic returned `[]` from `selectedGames` before ever reading `followedGames`).
 */
function coalesceSelectedGamesField(obj: any): any[] | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  let firstEmpty: any[] | undefined;
  for (const key of USER_GAME_LIST_KEYS) {
    const arr = obj[key];
    if (!Array.isArray(arr)) continue;
    if (arr.length > 0) return arr;
    if (firstEmpty === undefined) firstEmpty = arr;
  }
  return firstEmpty;
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

  const addresses = normalizeAddressesFromApi(direct, data);
  const rawGameProfiles = direct?.gameProfiles ?? data?.gameProfiles;
  const fromGameProfiles = normalizeGameProfilesFromApi(rawGameProfiles);
  const fromFollowedGames = normalizeGameProfilesFromFollowedGames(
    direct?.followedGames ?? data?.followedGames
  );
  const gameProfiles = mergeGameProfileListsPreferUid(fromGameProfiles, fromFollowedGames);

  const rawUpiIds =
    direct?.paymentUPIs ??
    data?.paymentUPIs ??
    direct?.upiIds ??
    data?.upiIds;
  const rawPaymentUPI = direct?.paymentUPI ?? data?.paymentUPI;
  const paymentUPIStr =
    rawPaymentUPI != null && String(rawPaymentUPI).trim()
      ? String(rawPaymentUPI).trim()
      : undefined;
  const fromUpiList = Array.isArray(rawUpiIds)
    ? rawUpiIds.map((x: unknown) => String(x).trim()).filter(Boolean)
    : [];
  const upiIds =
    fromUpiList.length > 0 ? fromUpiList : paymentUPIStr ? [paymentUPIStr] : undefined;

  const paymentMethodRaw = direct?.paymentMethod ?? data?.paymentMethod;
  const paymentMethod =
    paymentMethodRaw != null && String(paymentMethodRaw).trim()
      ? String(paymentMethodRaw).trim()
      : undefined;
  const isPaymentVerified =
    direct?.isPaymentVerified === true ||
    direct?.isPaymentVerified === false ||
    data?.isPaymentVerified === true ||
    data?.isPaymentVerified === false
      ? Boolean(direct?.isPaymentVerified ?? data?.isPaymentVerified)
      : undefined;

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
  const profileImage =
    direct?.profileImage ??
    data?.profileImage ??
    direct?.profile_image ??
    data?.profile_image ??
    direct?.avatar ??
    data?.avatar ??
    direct?.profilePic ??
    data?.profilePic ??
    direct?.avatarUrl ??
    data?.avatarUrl ??
    undefined;
  const avatarUrl = profileImage;

  const followedPersonalities = mergeFollowProfileSources(
    direct?.followedPersonalities,
    data?.followedPersonalities,
    direct?.followed_personalities,
    data?.followed_personalities,
    direct?.personalityProfiles,
    data?.personalityProfiles,
    direct?.personality_profiles,
    data?.personality_profiles
  );
  const followedOrganizations = mergeFollowProfileSources(
    direct?.followedOrganizations,
    data?.followedOrganizations,
    direct?.followed_organizations,
    data?.followed_organizations,
    direct?.organizationProfiles,
    data?.organizationProfiles,
    direct?.organization_profiles,
    data?.organization_profiles
  );

  return {
    id: String(id),
    email: String(email),
    displayName: String(username),
    fullName: fullName ? String(fullName) : undefined,
    phone,
    role: direct?.role,
    isVerified: direct?.isVerified ?? direct?.isEmailVerified,
    paymentUPI: paymentUPIStr,
    paymentMethod,
    isPaymentVerified,
    upiIds,
    bio,
    profileImage: profileImage != null ? String(profileImage) : undefined,
    avatarUrl,
    addresses,
    gameProfiles,
    onboardingStep,
    selectedGames,
    followedPersonalities,
    followedOrganizations,
  };
}

export async function uploadProfileAvatar(input: {
  uri: string;
  fileName?: string;
  mimeType?: string;
}): Promise<{ user: User; profileImageUploadId?: string }> {
  try {
    const uri = String(input.uri ?? '').trim();
    if (!uri) throw new ApiError('Image is required', 400);

    const fileName = String(input.fileName ?? 'avatar.jpg').trim() || 'avatar.jpg';
    const mimeType = String(input.mimeType ?? '').trim() || inferMimeTypeFromName(fileName) || 'image/jpeg';

    const form = new FormData();
    if (Platform.OS === 'web') {
      // Web needs real Blob/File; `{ uri, name, type }` will not upload bytes.
      const blob = await (await fetch(uri)).blob();
      if (blob.size > 1024 * 1024) {
        throw new ApiError('Image must be 1MB or smaller', 400);
      }
      const file = new File([blob], fileName, { type: mimeType });
      form.append('image', file);
    } else {
      // React Native file part shape
      form.append('image', { uri, name: fileName, type: mimeType } as any);
    }

    const res = await api.post<any>(API_ENDPOINTS.USER.PROFILE_AVATAR, form as any, {
      toast: false,
    });

    const uploadIdRaw =
      res?.data?.uploadId ??
      res?.uploadId ??
      res?.data?.profileImageUploadId ??
      res?.profileImageUploadId ??
      undefined;
    const profileImageUploadId =
      uploadIdRaw != null && String(uploadIdRaw).trim() ? String(uploadIdRaw).trim() : undefined;

    const profileImageRaw =
      res?.profileImage ??
      res?.data?.profileImage ??
      res?.user?.profileImage ??
      res?.data?.user?.profileImage ??
      undefined;
    const profileImage = profileImageRaw != null ? String(profileImageRaw).trim() : '';

    const previousUser = await commonService.getItem<User>(USER_KEY);
    const migratedUser = migrateUserFromAuthData(res);
    const merged = mergeUserFromApiResponse(migratedUser, previousUser);

    const next: User =
      profileImage
        ? {
            ...merged,
            profileImage,
            avatarUrl: profileImage,
          }
        : merged;

    await commonService.setItem(USER_KEY, next);
    return { user: next, profileImageUploadId };
  } catch (error) {
    rethrowAsApiError(error, 'Failed to upload avatar');
  }
}

function inferMimeTypeFromName(name: string): string | null {
  const lower = String(name ?? '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return null;
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
    const data = await api.post<any>(API_ENDPOINTS.AUTH.LOGIN, credentials, {
      skipAuth: true,
      toast: false,
    });
    return await persistAuthSession(data);
  } catch (error) {
    rethrowAsApiError(error, 'Login failed');
  }
}

export async function loginWith2fa(credentials: LoginCredentials): Promise<LoginResult> {
  try {
    const data = await api.post<any>(API_ENDPOINTS.AUTH.LOGIN, credentials, {
      skipAuth: true,
      toast: false,
    });

    const tokenFields = getTokenFields(data);
    if (!tokenFields.token) {
      const twoFactorToken = extractTwoFactorToken(data);
      if (twoFactorToken) {
        return { kind: '2fa_required', email: credentials.email, twoFactorToken };
      }
    }

    const persisted = await persistAuthSession(data);
    return { kind: 'success', user: persisted.user, token: persisted.token };
  } catch (error) {
    rethrowAsApiError(error, 'Login failed');
  }
}

export async function verifyLogin2fa(input: {
  twoFactorToken: string;
  code: string;
}): Promise<{ user: User; token: string }> {
  try {
    const data = await api.post<any>(
      API_ENDPOINTS.AUTH.VERIFY_LOGIN_2FA,
      {
        twoFactorToken: input.twoFactorToken,
        code: input.code,
      },
      { skipAuth: true, toast: false }
    );
    return await persistAuthSession(data);
  } catch (error) {
    rethrowAsApiError(error, '2FA verification failed');
  }
}

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  try {
    const res = await api.get<any>(API_ENDPOINTS.AUTH.TWO_FA.STATUS);
    const enabledRaw =
      res?.enabled ??
      res?.data?.enabled ??
      res?.twoFactorEnabled ??
      res?.is2FAEnabled ??
      res?.isTwoFactorEnabled;
    return { enabled: Boolean(enabledRaw) };
  } catch (error) {
    rethrowAsApiError(error, 'Failed to fetch 2FA status');
  }
}

export async function setupTwoFactor(): Promise<TwoFactorSetup> {
  try {
    const res = await api.post<any>(API_ENDPOINTS.AUTH.TWO_FA.SETUP, undefined, { toast: false });
    const src = (res?.data ?? res) as Record<string, unknown> | undefined;
    const otpauthUrl = String(src?.otpauthUrl ?? '').trim() || undefined;
    const qrCodeDataUrl = String(src?.qrCodeDataUrl ?? '').trim() || undefined;
    const secret = String(src?.secret ?? '').trim() || undefined;
    return { otpauthUrl, qrCodeDataUrl, secret };
  } catch (error) {
    rethrowAsApiError(error, 'Failed to setup 2FA');
  }
}

export async function enableTwoFactor(code: string): Promise<void> {
  try {
    await api.post(API_ENDPOINTS.AUTH.TWO_FA.ENABLE, { code }, { toast: false });
  } catch (error) {
    rethrowAsApiError(error, 'Failed to enable 2FA');
  }
}

export async function disableTwoFactor(code: string): Promise<void> {
  try {
    await api.post(API_ENDPOINTS.AUTH.TWO_FA.DISABLE, { code }, { toast: false });
  } catch (error) {
    rethrowAsApiError(error, 'Failed to disable 2FA');
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

export async function getDeviceHistory(options?: {
  page?: number;
  limit?: number;
  includeHistory?: boolean;
  includeActive?: boolean;
}): Promise<DeviceHistoryResponse> {
  try {
    const res = await api.get<any>(API_ENDPOINTS.AUTH.DEVICE_HISTORY, {
      page: options?.page,
      limit: options?.limit,
      includeHistory: options?.includeHistory ? 1 : undefined,
      includeActive: options?.includeActive === false ? 0 : undefined,
    });
    const data = (res?.data ?? res) as any;
    const activeDevicesContainer = data?.activeDevices;
    const activeDevicesRaw = Array.isArray(activeDevicesContainer)
      ? activeDevicesContainer
      : Array.isArray(activeDevicesContainer?.items)
        ? activeDevicesContainer.items
        : [];
    const activeDevicesMeta =
      activeDevicesContainer && typeof activeDevicesContainer === 'object' && !Array.isArray(activeDevicesContainer)
        ? {
            page: Number(activeDevicesContainer?.page ?? 1) || 1,
            limit: Number(activeDevicesContainer?.limit ?? (options?.limit ?? 20)) || (options?.limit ?? 20),
            total: Number(activeDevicesContainer?.total ?? activeDevicesRaw.length) || 0,
            totalPages: Number(activeDevicesContainer?.totalPages ?? 1) || 1,
          }
        : undefined;
    const historyContainer = data?.history;
    const historyRaw = Array.isArray(historyContainer)
      ? historyContainer
      : Array.isArray(historyContainer?.items)
        ? historyContainer.items
        : [];
    const historyMeta =
      historyContainer && typeof historyContainer === 'object' && !Array.isArray(historyContainer)
        ? {
            page: Number(historyContainer?.page ?? 1) || 1,
            limit: Number(historyContainer?.limit ?? (options?.limit ?? 20)) || (options?.limit ?? 20),
            total: Number(historyContainer?.total ?? historyRaw.length) || 0,
            totalPages: Number(historyContainer?.totalPages ?? 1) || 1,
          }
        : undefined;

    return {
      activeDevices: activeDevicesRaw
        .map((d: any) => ({
          sessionId: String(d?.sessionId ?? '').trim(),
          deviceLabel: d?.deviceLabel != null ? String(d.deviceLabel) : undefined,
          deviceInfo: d?.deviceInfo,
          ip: d?.ip != null ? String(d.ip) : undefined,
          createdAt: d?.createdAt != null ? String(d.createdAt) : undefined,
          lastUsedAt: d?.lastUsedAt != null ? String(d.lastUsedAt) : undefined,
          expiresAt: d?.expiresAt != null ? String(d.expiresAt) : undefined,
          isCurrent: d?.isCurrent === true || d?.current === true,
        }))
        .filter((d: any) => d.sessionId),
      history: historyRaw.map((h: any) => ({
        id: h?.id != null ? String(h.id) : h?._id != null ? String(h._id) : undefined,
        sessionId: h?.sessionId != null ? String(h.sessionId) : undefined,
        deviceLabel: h?.deviceLabel != null ? String(h.deviceLabel) : undefined,
        deviceInfo: h?.deviceInfo,
        ip: h?.ip != null ? String(h.ip) : undefined,
        action: h?.action != null ? String(h.action) : h?.event != null ? String(h.event) : undefined,
        createdAt: h?.createdAt != null ? String(h.createdAt) : undefined,
        lastUsedAt: h?.lastUsedAt != null ? String(h.lastUsedAt) : undefined,
        expiresAt: h?.expiresAt != null ? String(h.expiresAt) : undefined,
        loggedInAt: h?.loggedInAt != null ? String(h.loggedInAt) : undefined,
        loggedOutAt: h?.loggedOutAt != null ? String(h.loggedOutAt) : undefined,
        logoutReason: h?.logoutReason != null ? String(h.logoutReason) : undefined,
      })),
      activeDevicesMeta,
      historyMeta,
    };
  } catch (error) {
    rethrowAsApiError(error, 'Failed to fetch device history');
  }
}

export async function logoutDevice(sessionId: string): Promise<void> {
  try {
    const id = String(sessionId ?? '').trim();
    if (!id) throw new ApiError('sessionId is required', 400);
    await api.post(API_ENDPOINTS.AUTH.LOGOUT_DEVICE, { sessionId: id }, { toast: false });
  } catch (error) {
    rethrowAsApiError(error, 'Failed to logout device');
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
      return { token: t, user: migrateLegacyStoredUser(u) };
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

/**
 * PUT `/profile` whitelist. Address updates: only `address` (one object), never `addresses`.
 * Full list comes back on GET as `addresses`.
 */
function buildProfilePutPayload(
  data: UpdateProfileData,
  previousUser: User | null | undefined
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (data.displayName !== undefined) payload.username = data.displayName;
  if (data.fullName !== undefined) payload.fullName = data.fullName;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.bio !== undefined) payload.bio = data.bio;
  if (data.onboardingStep !== undefined) payload.onboardingStep = data.onboardingStep;
  if (data.selectedGames !== undefined) {
    payload.selectedGames = coerceSelectedGamesForProfilePut(data.selectedGames);
  }
  if (data.addresses !== undefined) {
    const row = pickAddressRowForProfilePut(data.addresses, previousUser?.addresses);
    payload.address = row === null ? null : mapUserAddressForProfileApi(row);
  }
  if (data.gameProfiles !== undefined) {
    payload.gameProfiles = mapGameProfilesForProfilePut(data.gameProfiles);
    const followedPayload = buildFollowedGamesWithUidsPayload(previousUser?.selectedGames, data.gameProfiles);
    if (followedPayload) payload.followedGames = followedPayload;
  }
  if (data.followedPersonalities !== undefined) {
    const entries = sanitizeFollowProfilePayload(data.followedPersonalities) ?? [];
    payload.followedPersonalities = followEntriesToApiStringArray(entries);
  }
  if (data.followedOrganizations !== undefined) {
    const entries = sanitizeFollowProfilePayload(data.followedOrganizations) ?? [];
    payload.followedOrganizations = followEntriesToApiStringArray(entries);
  }
  const rawSavedUpis =
    data.paymentUPIs !== undefined ? data.paymentUPIs : data.upiIds !== undefined ? data.upiIds : undefined;
  if (rawSavedUpis !== undefined) {
    const list = Array.isArray(rawSavedUpis)
      ? rawSavedUpis.map((x) => String(x).trim()).filter(Boolean)
      : [];
    payload.paymentUPIs = list;
    payload.upiIds = list; // back-compat
  }
  if (data.paymentUPI !== undefined) {
    payload.paymentUPI = data.paymentUPI === null || data.paymentUPI === '' ? null : data.paymentUPI;
  }
  if (data.profileImageUploadId !== undefined) {
    const id = String(data.profileImageUploadId ?? '').trim();
    if (id) {
      payload.profileImageUploadId = id;
      payload.uploadId = id;
    }
  }
  return payload;
}

export async function updateProfile(data: UpdateProfileData): Promise<User> {
  try {
    const previousUser = await commonService.getItem<User>(USER_KEY);
    const payload = buildProfilePutPayload(data, previousUser);

    const res = await api.put<any>(API_ENDPOINTS.USER.PROFILE, payload);
    let migratedUser = migrateUserFromAuthData(res);
    const paymentUpiPatchApplied = data.paymentUPI !== undefined;
    const paymentUpiCleared =
      paymentUpiPatchApplied && (data.paymentUPI === null || data.paymentUPI === '');
    const paymentUpiTrimmed =
      paymentUpiPatchApplied && typeof data.paymentUPI === 'string' ? data.paymentUPI.trim() : '';
    if (paymentUpiPatchApplied) {
      // Ensure merge step cannot "resurrect" previous paymentUPI when server responds with null/empty.
      // Important: do NOT clobber the saved UPI list when merely selecting payout UPI.
      migratedUser = {
        ...migratedUser,
        paymentUPI: paymentUpiCleared ? undefined : paymentUpiTrimmed || undefined,
        ...(paymentUpiCleared ? { upiIds: [] } : {}),
      };
    }
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
      ...(data.addresses !== undefined && { addressesBaseline: data.addresses }),
    });

    // Explicitly enforce payment UPI mutations (set/clear) after merge.
    const finalUser: User =
      paymentUpiPatchApplied
        ? {
            ...updatedUser,
            paymentUPI: paymentUpiCleared ? undefined : paymentUpiTrimmed || undefined,
            ...(paymentUpiCleared ? { upiIds: [] } : {}),
          }
        : updatedUser;

    await commonService.setItem(USER_KEY, finalUser);
    return finalUser;
  } catch (error) {
    rethrowAsApiError(error, 'Profile update failed');
  }
}

export async function updateAddresses(addresses: UserAddress[]): Promise<User> {
  return updateProfile({ addresses });
}

/**
 * POST append — does not replace the list; server adds to `addresses` (e.g. up to 5).
 * Body is the address row at the JSON root (validators expect `addressLine1`, etc. top-level).
 */
export async function addProfileAddress(addr: UserAddress): Promise<User> {
  try {
    const previousUser = await commonService.getItem<User>(USER_KEY);
    const res = await api.post<any>(
      API_ENDPOINTS.USER.PROFILE_ADDRESS,
      mapUserAddressForProfileApi(addr) as Record<string, unknown>,
      { toast: false }
    );
    const migratedUser = migrateUserFromAuthData(res);
    if (hasUsableAddresses(migratedUser.addresses)) {
      const updatedUser = mergeUserFromApiResponse(migratedUser, previousUser);
      await commonService.setItem(USER_KEY, updatedUser);
      return updatedUser;
    }
    return getProfile();
  } catch (error) {
    rethrowAsApiError(error, 'Failed to add address');
  }
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

