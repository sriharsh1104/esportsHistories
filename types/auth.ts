export type UserAddress = {
  id: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  isDefault?: boolean;
};

export type GameProfile = {
  id: string;
  gameId: string;
  gameName: string;
  gameUid: string;
};

export type OnboardingStep = 'profile' | 'games' | 'done';

export type User = {
  id: string;
  email: string;
  displayName: string;
  fullName?: string;
  phone?: string;
  /** @deprecated Use upiIds. Kept for migration. */
  upiId?: string;
  upiIds?: string[];
  walletBalance?: number;
  avatarUrl?: string;
  addresses?: UserAddress[];
  gameProfiles?: GameProfile[];
  onboardingStep?: OnboardingStep;
  selectedGames?: string[];
};

export type UpdateProfileData = {
  displayName?: string;
  fullName?: string;
  phone?: string;
  upiIds?: string[];
  addresses?: UserAddress[];
  gameProfiles?: GameProfile[];
  onboardingStep?: OnboardingStep;
  selectedGames?: string[];
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
  confirmPassword: string;
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
