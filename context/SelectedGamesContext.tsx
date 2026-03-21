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
  /** Pass `gameIds` to save that list in one API call; omit to use current context selection. */
  saveSelectedGames: (gameIds?: string[]) => Promise<void>;
};

const SelectedGamesContext = createContext<SelectedGamesContextType | null>(null);

export function SelectedGamesProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading, updateProfile } = useAuth();
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [selectedGameIds, setSelectedGameIdsState] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGames = useCallback(async () => {
    try {
      setIsLoading(true);
      const games = await gamesService.fetchGameOptions();
      setAvailableGames(games);
    } catch (error) {
      console.error('Failed to fetch available games:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Avoid background API calls. Games are fetched on-demand by screens.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAvailableGames([]);
    }
    setIsLoading(false);
  }, [authLoading, user]);

  useEffect(() => {
    if (user && user.selectedGames) {
      // selectedGames might be populated objects or just IDs from the backend
      const ids = user.selectedGames
        .map((g: any) => {
          if (typeof g !== 'object') return String(g);
          return String(g._id ?? g.id ?? g.gameId ?? g.name ?? g.game ?? '');
        })
        .filter(Boolean);
      setSelectedGameIdsState(ids);
    } else {
      setSelectedGameIdsState([]);
    }
  }, [user]);

  const setSelectedGameIds = useCallback(async (ids: string[]) => {
    const trimmed = ids.slice(0, MAX_GAMES);
    setSelectedGameIdsState(trimmed);
  }, []);

  const saveSelectedGames = useCallback(
    async (gameIdsOverride?: string[]) => {
      const sourceIds = gameIdsOverride ?? selectedGameIds;
      const trimmed = sourceIds.slice(0, MAX_GAMES);
      const selectedGamesWithPlatform = trimmed
        .map((id) => {
          const game = availableGames.find((g) => g._id === id);
          if (!game) return null;
          return {
            platform: game.category,
            game: game.name,
          } as const;
        })
        .filter((row): row is { platform: Game['category']; game: string } => row != null);

      await updateProfile({ selectedGames: selectedGamesWithPlatform });
      setSelectedGameIdsState(trimmed);
    },
    [selectedGameIds, availableGames, updateProfile]
  );

  const toggleGame = useCallback(
    async (gameId: string) => {
      const next = selectedGameIds.includes(gameId)
        ? selectedGameIds.filter((id) => id !== gameId)
        : selectedGameIds.length >= MAX_GAMES
          ? selectedGameIds
          : [...selectedGameIds, gameId];
      
      setSelectedGameIdsState(next);
    },
    [selectedGameIds]
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
    saveSelectedGames,
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
