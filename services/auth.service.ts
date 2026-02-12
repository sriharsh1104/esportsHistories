/**
 * Auth service - replace with real API calls.
 * Uses commonService for storage and token management.
 */
import type {
  GameProfile,
  LoginCredentials,
  SignupCredentials,
  UpdateProfileData,
  User,
  UserAddress,
} from '@/types/auth';
import { commonService, setToken, clearToken } from './common.service';

const TOKEN_KEY = '@esports_auth_token';
const USER_KEY = '@esports_user';
const MOCK_USERS_KEY = '@esports_mock_users';

async function getMockUsers(): Promise<Record<string, User>> {
  const users = await commonService.getItem<Record<string, User>>(MOCK_USERS_KEY);
  return users ?? {};
}

async function saveMockUser(email: string, user: User): Promise<void> {
  const users = await getMockUsers();
  users[email.toLowerCase()] = user;
  await commonService.setItem(MOCK_USERS_KEY, users);
}

function migrateUser(user: User): User {
  if (!user.upiIds && user.upiId) {
    return { ...user, upiIds: [user.upiId] };
  }
  return user;
}

export async function login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
  // TODO: Replace with actual API call via api.service
  const res = await mockApiCall('/auth/login', credentials);
  if (res.success && res.data) {
    await commonService.setItem(TOKEN_KEY, res.data.token);
    await commonService.setItem(USER_KEY, res.data.user);
    setToken(res.data.token);
    return res.data;
  }
  throw new Error(res.message || 'Login failed');
}

export async function signup(
  credentials: SignupCredentials
): Promise<{ user: User; token: string }> {
  const res = await mockApiCall('/auth/signup', credentials);
  if (res.success && res.data) {
    await commonService.setItem(TOKEN_KEY, res.data.token);
    await commonService.setItem(USER_KEY, res.data.user);
    setToken(res.data.token);
    return res.data;
  }
  throw new Error(res.message || 'Signup failed');
}

export async function logout(): Promise<void> {
  await commonService.multiRemove([TOKEN_KEY, USER_KEY]);
  clearToken();
}

export async function getStoredAuth(): Promise<{ user: User; token: string } | null> {
  const stored = await commonService.multiGet([TOKEN_KEY, USER_KEY]);
  const t = stored[TOKEN_KEY];
  const u = stored[USER_KEY];
  if (t && u) {
    try {
      const user = migrateUser(JSON.parse(u) as User);
      setToken(t);
      return { token: t, user };
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
    upiIds: data.upiIds !== undefined ? data.upiIds : stored.user.upiIds,
    addresses: data.addresses !== undefined ? data.addresses : stored.user.addresses,
    gameProfiles: data.gameProfiles !== undefined ? data.gameProfiles : stored.user.gameProfiles,
    onboardingStep:
      data.onboardingStep !== undefined ? data.onboardingStep : stored.user.onboardingStep,
  };
  await commonService.setItem(USER_KEY, updated);
  await saveMockUser(updated.email, updated);
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
    if (!email || password.length < 6) {
      return { success: false, message: 'Invalid email or password' };
    }
    const users = await getMockUsers();
    const existing = users[email.trim().toLowerCase()];
    if (existing) {
      return {
        success: true,
        data: {
          user: migrateUser(existing),
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
    const user: User = {
      id: '1',
      email: creds.email.trim(),
      displayName: creds.displayName?.trim() || creds.email.split('@')[0],
      onboardingStep: 'profile',
    };
    await saveMockUser(user.email, user);
    return {
      success: true,
      data: {
        user,
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
