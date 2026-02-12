import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const SELECTED_GAMES_KEY = '@esports_selected_games';
const MAX_GAMES = 10;

type SelectedGamesContextType = {
  selectedGameIds: string[];
  setSelectedGameIds: (ids: string[]) => void;
  toggleGame: (gameId: string) => void;
  isGameSelected: (gameId: string) => boolean;
  hasSelectedGames: boolean;
  isLoading: boolean;
};

const SelectedGamesContext = createContext<SelectedGamesContextType | null>(null);

export function SelectedGamesProvider({ children }: { children: React.ReactNode }) {
  const [selectedGameIds, setSelectedGameIdsState] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStored = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SELECTED_GAMES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setSelectedGameIdsState(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setSelectedGameIdsState([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStored();
  }, [loadStored]);

  const setSelectedGameIds = useCallback(async (ids: string[]) => {
    const trimmed = ids.slice(0, MAX_GAMES);
    setSelectedGameIdsState(trimmed);
    await AsyncStorage.setItem(SELECTED_GAMES_KEY, JSON.stringify(trimmed));
  }, []);

  const toggleGame = useCallback(
    (gameId: string) => {
      setSelectedGameIdsState((prev) => {
        const next = prev.includes(gameId)
          ? prev.filter((id) => id !== gameId)
          : prev.length >= MAX_GAMES
            ? prev
            : [...prev, gameId];
        AsyncStorage.setItem(SELECTED_GAMES_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const isGameSelected = useCallback(
    (gameId: string) => selectedGameIds.includes(gameId),
    [selectedGameIds]
  );

  const hasSelectedGames = selectedGameIds.length > 0;

  const value: SelectedGamesContextType = {
    selectedGameIds,
    setSelectedGameIds,
    toggleGame,
    isGameSelected,
    hasSelectedGames,
    isLoading,
  };

  return (
    <SelectedGamesContext.Provider value={value}>
      {children}
    </SelectedGamesContext.Provider>
  );
}

export function useSelectedGames() {
  const ctx = useContext(SelectedGamesContext);
  if (!ctx) throw new Error('useSelectedGames must be used within SelectedGamesProvider');
  return ctx;
}
