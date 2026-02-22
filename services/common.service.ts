/**
 * Common Service - Shared logic used across services.
 * Storage wrapper, token management, and reusable helpers.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@esports_auth_token';

export const commonService = {
  // Storage
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async getItemString(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: unknown): Promise<void> {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key, str);
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  async multiGet(keys: string[]): Promise<Record<string, string | null>> {
    const entries = await AsyncStorage.multiGet(keys);
    return Object.fromEntries(entries);
  },

  async multiRemove(keys: string[]): Promise<void> {
    await AsyncStorage.multiRemove(keys);
  },

};

// In-memory token cache
let _token: string | null = null;
let _refreshToken: string | null = null;

export function setToken(token: string | null): void {
  _token = token;
}

export function getToken(): string | null {
  return _token;
}

export function setRefreshToken(token: string | null): void {
  _refreshToken = token;
}

export function getRefreshToken(): string | null {
  return _refreshToken;
}

export function clearToken(): void {
  _token = null;
  _refreshToken = null;
}
