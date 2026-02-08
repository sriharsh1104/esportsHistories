import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

const THEME_KEY = '@esports_theme_preference';

export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => Promise<void>;
  colorScheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        if (stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
          setThemeState(stored as ThemePreference);
        }
      } catch {
        // keep default
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setTheme = useCallback(async (t: ThemePreference) => {
    setThemeState(t);
    await AsyncStorage.setItem(THEME_KEY, t);
  }, []);

  const colorScheme: 'light' | 'dark' =
    theme === 'system'
      ? (deviceScheme === 'dark' ? 'dark' : 'light')
      : theme;

  const value: ThemeContextType = { theme, setTheme, colorScheme };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
