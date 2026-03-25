/** Delivery rows in app state; GET profile returns `addresses[]` (up to 5). PUT uses single `address`. */
export type UserAddress = {
  id: string;
  label?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  contactNumber?: string;
  countryCode?: string;
  isDefault?: boolean;
};

export type GameProfile = {
  id: string;
  gameId: string;
  gameName: string;
  gameUid: string;
};

/** DELETE `/profile/game-profile` — body `{ gameId, action: 'removeGame', uid }`. */
export type DeleteGameProfileInput = {
  gameUid: string;
  gameId: string;
};

export type OnboardingStep = 'profile' | 'games' | 'done';

export type UserRole = 'user' | 'host' | 'admin' | 'org_manager';

export type UserBio = {
  gender?: string;
  dateOfBirth?: string;
  dob?: string;
};

export type SelectedGame = string | {
  platform: 'mobile' | 'pc';
  game: string;
};

/** User's saved follows from profile API — not the public catalog (that is `/profile/game-options`). */
export type FollowProfileEntry = {
  id: string;
  name: string;
};

export type User = {
  id: string;
  email: string;
  displayName: string;
  fullName?: string;
  phone?: string;
  /** Backend may return this as object or JSON string. */
  bio?: UserBio | string;
  role?: UserRole;
  isVerified?: boolean;
  /** @deprecated Use upiIds. Kept for migration. */
  upiId?: string;
  /** Profile `UserPaymentInfo` — primary payout UPI (`name@bank` / PSP handle). */
  paymentUPI?: string;
  paymentMethod?: string;
  isPaymentVerified?: boolean;
  upiIds?: string[];
  walletBalance?: number;
  avatarUrl?: string;
  addresses?: UserAddress[];
  gameProfiles?: GameProfile[];
  onboardingStep?: OnboardingStep;
  selectedGames?: SelectedGame[];
  followedPersonalities?: FollowProfileEntry[];
  followedOrganizations?: FollowProfileEntry[];
};

export type UpdateProfileData = {
  displayName?: string;
  fullName?: string;
  phone?: string;
  bio?: UserBio | string;
  /** PUT `/profile` — optional; server validates `name@psp` style UPI. Pass `null` to clear. */
  paymentUPI?: string | null;
  /** Saved UPI IDs list (backend key observed: `paymentUPIs`). */
  paymentUPIs?: string[];
  upiIds?: string[];
  addresses?: UserAddress[];
  gameProfiles?: GameProfile[];
  onboardingStep?: OnboardingStep;
  selectedGames?: SelectedGame[];
  followedPersonalities?: FollowProfileEntry[];
  followedOrganizations?: FollowProfileEntry[];
};

export type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type SignupCredentials = LoginCredentials & {
  displayName: string;
};

export type ChangePasswordData = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export type ForgotPasswordData = {
  email: string;
};

export type Transaction = {
  _id: string;
  type: 'topup' | 'withdrawal';
  amount: number;
  status: 'pending' | 'success' | 'failed';
  upiId?: string;
  transactionId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type TransactionFilters = {
  type?: 'topup' | 'withdrawal';
  status?: 'pending' | 'success' | 'failed';
  startDate?: string;
  endDate?: string;
};

export type ActiveDeviceSession = {
  sessionId: string;
  /** Preferred, server-provided label to display in UI. */
  deviceLabel?: string;
  deviceInfo?: unknown;
  ip?: string;
  createdAt?: string;
  lastUsedAt?: string;
  expiresAt?: string;
  /** Backend may include a hint for current device. */
  isCurrent?: boolean;
};

export type DeviceAuthHistoryItem = {
  /** Backend-defined event id, if present. */
  id?: string;
  sessionId?: string;
  /** Preferred, server-provided label to display in UI. */
  deviceLabel?: string;
  deviceInfo?: unknown;
  ip?: string;
  /** e.g. "login" / "logout" (backend-defined). */
  action?: string;
  createdAt?: string;
  /** Some backends include these on history rows too. */
  lastUsedAt?: string;
  expiresAt?: string;
  /** Device history fields (when backend tracks login/logout). */
  loggedInAt?: string;
  loggedOutAt?: string;
  logoutReason?: string;
};

export type DeviceHistoryMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type DeviceHistoryResponse = {
  activeDevices: ActiveDeviceSession[];
  history: DeviceAuthHistoryItem[];
  activeDevicesMeta?: DeviceHistoryMeta;
  historyMeta?: DeviceHistoryMeta;
};
