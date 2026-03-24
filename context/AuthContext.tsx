import * as authService from '@/services/auth.service';
import { ROUTES } from '@/constants/routes';
import { setAuthFailureHandler } from '@/services/api.service';
import type {
  DeleteGameProfileInput,
  LoginCredentials,
  SignupCredentials,
  UpdateProfileData,
  User,
  UserAddress,
} from '@/types/auth';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (c: LoginCredentials) => Promise<User>;
  signup: (c: SignupCredentials) => Promise<{ email: string }>;
  verifyOtp: (email: string, otp: string) => Promise<User>;
  resendOtp: (email: string) => Promise<void>;
  logout: (options?: { allDevices?: boolean }) => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  updateAddresses: (addresses: UserAddress[]) => Promise<void>;
  addAddress: (addr: UserAddress) => Promise<void>;
  updateUpiIds: (upiIds: string[]) => Promise<void>;
  deleteGameProfile: (input: DeleteGameProfileInput) => Promise<void>;
  refreshUser: () => Promise<User>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStoredAuth = useCallback(async () => {
    try {
      const stored = await authService.getStoredAuth();
      if (stored) {
        setUser(stored.user);
        try {
          const freshUser = await authService.getProfile();
          setUser(freshUser);
        } catch {
          // keep cached user if profile fetch fails
        }
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  useEffect(() => {
    setAuthFailureHandler(() => {
      setUser(null);
      router.replace(ROUTES.LOGIN);
    });

    return () => {
      setAuthFailureHandler(null);
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { user: u } = await authService.login(credentials);
    setUser(u);
    try {
      const fresh = await authService.getProfile();
      setUser(fresh);
      return fresh;
    } catch {
      return u;
    }
  }, []);

  const signup = useCallback(async (credentials: SignupCredentials) => {
    const res = await authService.signup(credentials);
    return res;
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    const { user: u } = await authService.verifyOtp(email, otp);
    setUser(u);
    try {
      const fresh = await authService.getProfile();
      setUser(fresh);
      return fresh;
    } catch {
      return u;
    }
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    await authService.resendOtp(email);
  }, []);

  const logout = useCallback(async (options?: { allDevices?: boolean }) => {
    await authService.logout(options);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: UpdateProfileData) => {
    const updated = await authService.updateProfile(data);
    setUser(updated);
  }, []);

  const updateAddresses = useCallback(async (addresses: UserAddress[]) => {
    const updated = await authService.updateAddresses(addresses);
    setUser(updated);
  }, []);

  const addAddress = useCallback(async (addr: UserAddress) => {
    const updated = await authService.addProfileAddress(addr);
    setUser(updated);
  }, []);

  /** Persists via PUT `/profile` as `paymentUPI` (single slot). Last entry wins if multiple passed. */
  const updateUpiIds = useCallback(async (upiIds: string[]) => {
    const paymentUPI =
      upiIds.length === 0 ? null : (upiIds[upiIds.length - 1]?.trim() || null);
    const updated = await authService.updateProfile({
      paymentUPI: paymentUPI === null ? null : paymentUPI,
    });
    setUser(updated);
  }, []);

  const refreshUser = useCallback(async () => {
    const freshUser = await authService.getProfile();
    setUser(freshUser);
    return freshUser;
  }, []);

  const deleteGameProfile = useCallback(async (input: DeleteGameProfileInput) => {
    const updated = await authService.deleteGameProfile(input);
    setUser(updated);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    verifyOtp,
    resendOtp,
    logout,
    updateProfile,
    updateAddresses,
    addAddress,
    updateUpiIds,
    deleteGameProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
