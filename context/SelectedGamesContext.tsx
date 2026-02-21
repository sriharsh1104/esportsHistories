import type { Game } from '@/services/games.service';
import * as gamesService from '@/services/games.service';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const MAX_GAMES = 10;

type SelectedGamesContextType = {
  availableGames: Game[];
  selectedGameIds: string[];
  setSelectedGameIds: (ids: string[]) => Promise<void>;
  toggleGame: (gameId: string) => Promise<void>;
  isGameSelected: (gameId: string) => boolean;
  hasSelectedGames: boolean;
  isLoading: boolean;
  refreshGames: () => Promise<void>;
};

const SelectedGamesContext = createContext<SelectedGamesContextType | null>(null);

export function SelectedGamesProvider({ children }: { children: React.ReactNode }) {
  const { user, updateProfile } = useAuth();
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [selectedGameIds, setSelectedGameIdsState] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGames = useCallback(async () => {
    try {
      const games = await gamesService.fetchAllGames();
      setAvailableGames(games);
    } catch (error) {
      console.error('Failed to fetch available games:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    if (user && user.selectedGames) {
      // selectedGames might be populated objects or just IDs from the backend
      const ids = user.selectedGames.map((g: any) => typeof g === 'object' ? g._id : g);
      setSelectedGameIdsState(ids);
    } else {
      setSelectedGameIdsState([]);
    }
  }, [user]);

  const setSelectedGameIds = useCallback(async (ids: string[]) => {
    const trimmed = ids.slice(0, MAX_GAMES);
    setSelectedGameIdsState(trimmed);
    if (user) {
      await updateProfile({ selectedGames: trimmed } as any);
    }
  }, [user, updateProfile]);

  const toggleGame = useCallback(
    async (gameId: string) => {
      const next = selectedGameIds.includes(gameId)
        ? selectedGameIds.filter((id) => id !== gameId)
        : selectedGameIds.length >= MAX_GAMES
          ? selectedGameIds
          : [...selectedGameIds, gameId];
      
      setSelectedGameIdsState(next);
      if (user) {
        await updateProfile({ selectedGames: next } as any);
      }
    },
    [selectedGameIds, user, updateProfile]
  );

  const isGameSelected = useCallback(
    (gameId: string) => selectedGameIds.includes(gameId),
    [selectedGameIds]
  );

  const hasSelectedGames = selectedGameIds.length > 0;

  const value: SelectedGamesContextType = {
    availableGames,
    selectedGameIds,
    setSelectedGameIds,
    toggleGame,
    isGameSelected,
    hasSelectedGames,
    isLoading,
    refreshGames: fetchGames,
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
