import type {
    LoginCredentials,
    SignupCredentials,
    UpdateProfileData,
    User,
    UserAddress
} from '@/types/auth';
import { api } from './api.service';
import { clearToken, commonService, setRefreshToken, setToken } from './common.service';

const TOKEN_KEY = '@esports_auth_token';
const REFRESH_TOKEN_KEY = '@esports_refresh_token';
const USER_KEY = '@esports_user';

export async function saveUserData(user: User): Promise<void> {
  await commonService.setItem(USER_KEY, user);
}

function migrateUser(user: any): User {
  return {
    id: user._id || user.id,
    email: user.email,
    displayName: user.username || user.displayName,
    fullName: user.fullName || '',
    phone: user.phone || '',
    profilePic: user.profilePic,
    bio: user.bio,
    role: user.role,
    isVerified: user.isVerified,
    onboardingStep: user.onboardingStep || 'profile',
    upiIds: user.upiIds || [],
    walletBalance: user.walletBalance || 0,
    addresses: user.addresses || [],
    gameProfiles: user.gameProfiles || [],
    selectedGames: user.selectedGames || [],
  } as User;
}

export async function login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
  try {
    const res = await api.post<{ _id: string; username: string; email: string; token: string; refreshToken: string }>('/auth/login', credentials);
    const user = migrateUser(res);
    const token = res.token;
    const refreshToken = res.refreshToken;
    
    await commonService.setItem(TOKEN_KEY, token);
    await commonService.setItem(REFRESH_TOKEN_KEY, refreshToken);
    await commonService.setItem(USER_KEY, user);
    setToken(token);
    setRefreshToken(refreshToken);
    
    return { user, token };
  } catch (error: any) {
    throw new Error(error.message || 'Login failed');
  }
}

export async function signup(
  credentials: SignupCredentials
): Promise<{ email: string; message: string }> {
  try {
    const res = await api.post<{ message: string; email: string }>('/auth/signup', {
      username: credentials.displayName || credentials.email.split('@')[0],
      email: credentials.email,
      password: credentials.password
    });
    return res;
  } catch (error: any) {
    throw new Error(error.message || 'Signup failed');
  }
}

export async function verifyOtp(email: string, otp: string): Promise<{ user: User; token: string }> {
  try {
    const res = await api.post<{ _id: string; username: string; email: string; token: string; refreshToken: string }>('/auth/verify-otp', { email, otp });
    const user = migrateUser(res);
    const token = res.token;
    const refreshToken = res.refreshToken;

    await commonService.setItem(TOKEN_KEY, token);
    await commonService.setItem(REFRESH_TOKEN_KEY, refreshToken);
    await commonService.setItem(USER_KEY, user);
    setToken(token);
    setRefreshToken(refreshToken);

    return { user, token };
  } catch (error: any) {
    throw new Error(error.message || 'Verification failed');
  }
}

export async function resendOtp(email: string): Promise<void> {
  try {
    await api.post('/auth/resend-otp', { email });
  } catch (error: any) {
    throw new Error(error.message || 'Resend failed');
  }
}

export async function logout(): Promise<void> {
  await commonService.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  clearToken();
}

export async function getStoredAuth(): Promise<{ user: User; token: string } | null> {
  const t = await commonService.getItem<string>(TOKEN_KEY);
  const rt = await commonService.getItem<string>(REFRESH_TOKEN_KEY);
  const u = await commonService.getItem<User>(USER_KEY);
  
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

export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await api.post('/auth/forget-password', { email });
  } catch (error: any) {
    throw new Error(error.message || 'Request failed');
  }
}

export async function resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
  try {
    await api.post('/auth/reset-password', { email, otp, newPassword });
  } catch (error: any) {
    throw new Error(error.message || 'Reset failed');
  }
}

export async function updateProfile(data: UpdateProfileData): Promise<User> {
  try {
    const res = await api.put<any>('/user/profile', data);
    const user = migrateUser(res);
    await commonService.setItem(USER_KEY, user);
    return user;
  } catch (error: any) {
    throw new Error(error.message || 'Profile update failed');
  }
}

export async function updateAddresses(addresses: UserAddress[]): Promise<User> {
  return updateProfile({ addresses });
}

export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  try {
    await api.put('/auth/change-password', { oldPassword, newPassword });
  } catch (error: any) {
    throw new Error(error.message || 'Change password failed');
  }
}

export async function getWalletData(): Promise<{ walletBalance: number; upiIds: string[] }> {
  try {
    const res = await api.get<{ walletBalance: number; upiIds: string[] }>('/user/wallet');
    return res;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch wallet data');
  }
}

export async function updateWalletUpi(upiIds: string[]): Promise<string[]> {
  try {
    const res = await api.post<{ upiIds: string[] }>('/user/wallet/upi', { upiIds });
    return res.upiIds;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update UPI IDs');
  }
}

export async function topUp(amount: number): Promise<{ walletBalance: number }> {
    try {
        const res = await api.post<{ walletBalance: number }>('/user/wallet/topup', { amount });
        return res;
    } catch (error: any) {
        throw new Error(error.message || 'Top up failed');
    }
}

export async function withdraw(amount: number, upiId: string): Promise<{ walletBalance: number }> {
    try {
        const res = await api.post<{ walletBalance: number }>('/user/wallet/withdraw', { amount, upiId });
        return res;
    } catch (error: any) {
        throw new Error(error.message || 'Withdrawal failed');
    }
}

import type { Transaction, TransactionFilters } from '@/types/auth';

export async function getTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
    try {
        const res = await api.get<Transaction[]>('/transactions', filters as any);
        return res;
    } catch (error: any) {
        throw new Error(error.message || 'Failed to fetch transactions');
    }
}
