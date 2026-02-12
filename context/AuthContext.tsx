import * as authService from '@/services/auth.service';
import type {
  LoginCredentials,
  SignupCredentials,
  UpdateProfileData,
  User,
  UserAddress,
} from '@/types/auth';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (c: LoginCredentials) => Promise<User>;
  signup: (c: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  updateAddresses: (addresses: UserAddress[]) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStoredAuth = useCallback(async () => {
    try {
      const stored = await authService.getStoredAuth();
      if (stored) setUser(stored.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { user: u } = await authService.login(credentials);
    setUser(u);
    return u;
  }, []);

  const signup = useCallback(async (credentials: SignupCredentials) => {
    const { user: u } = await authService.signup(credentials);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
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

  const refreshUser = useCallback(loadStoredAuth, [loadStoredAuth]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    updateProfile,
    updateAddresses,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
