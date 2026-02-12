/**
 * Auth service - replace with real API calls.
 * Uses AsyncStorage for token persistence.
 */
import type {
  GameProfile,
  LoginCredentials,
  SignupCredentials,
  UpdateProfileData,
  User,
  UserAddress,
} from '@/types/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const TOKEN_KEY = '@esports_auth_token';
const USER_KEY = '@esports_user';
const API_BASE = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3000/api';

export async function login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
  // TODO: Replace with actual API call
  const res = await mockApiCall('/auth/login', credentials);
  if (res.success && res.data) {
    await AsyncStorage.setItem(TOKEN_KEY, res.data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    return res.data;
  }
  throw new Error(res.message || 'Login failed');
}

export async function signup(
  credentials: SignupCredentials
): Promise<{ user: User; token: string }> {
  const res = await mockApiCall('/auth/signup', credentials);
  if (res.success && res.data) {
    await AsyncStorage.setItem(TOKEN_KEY, res.data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    return res.data;
  }
  throw new Error(res.message || 'Signup failed');
}

export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function getStoredAuth(): Promise<{ user: User; token: string } | null> {
  const [token, userStr] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
  const t = token[1];
  const u = userStr[1];
  if (t && u) {
    try {
      return { token: t, user: JSON.parse(u) as User };
    } catch {
      await logout();
    }
  }
  return null;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await mockApiCall('/auth/forgot-password', { email });
  if (!res.success) throw new Error(res.message || 'Request failed');
}

export async function updateProfile(data: UpdateProfileData): Promise<User> {
  const stored = await getStoredAuth();
  if (!stored) throw new Error('Not authenticated');
  const updated: User = {
    ...stored.user,
    displayName: data.displayName ?? stored.user.displayName,
    fullName: data.fullName !== undefined ? data.fullName : stored.user.fullName,
    phone: data.phone !== undefined ? data.phone : stored.user.phone,
    upiId: data.upiId !== undefined ? data.upiId : stored.user.upiId,
    addresses: data.addresses !== undefined ? data.addresses : stored.user.addresses,
    gameProfiles: data.gameProfiles !== undefined ? data.gameProfiles : stored.user.gameProfiles,
  };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
  return updated;
}

export async function updateAddresses(addresses: UserAddress[]): Promise<User> {
  return updateProfile({ addresses });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await mockApiCall('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  if (!res.success) throw new Error(res.message || 'Change password failed');
}

async function mockApiCall(endpoint: string, body: object): Promise<{
  success: boolean;
  data?: { user: User; token: string };
  message?: string;
}> {
  await new Promise((r) => setTimeout(r, 800));
  if (endpoint.includes('login')) {
    const { email, password } = body as LoginCredentials;
    if (email && password.length >= 6) {
      return {
        success: true,
        data: {
          user: {
            id: '1',
            email,
            displayName: email.split('@')[0],
          },
          token: 'mock-jwt-token',
        },
      };
    }
    return { success: false, message: 'Invalid email or password' };
  }
  if (endpoint.includes('signup')) {
    const creds = body as SignupCredentials;
    if (creds.password !== creds.confirmPassword) {
      return { success: false, message: 'Passwords do not match' };
    }
    if (creds.password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters' };
    }
    return {
      success: true,
      data: {
        user: {
          id: '1',
          email: creds.email,
          displayName: creds.displayName || creds.email.split('@')[0],
        },
        token: 'mock-jwt-token',
      },
    };
  }
  if (endpoint.includes('forgot-password')) {
    return { success: true };
  }
  if (endpoint.includes('change-password')) {
    return { success: true };
  }
  return { success: false, message: 'Unknown endpoint' };
}
