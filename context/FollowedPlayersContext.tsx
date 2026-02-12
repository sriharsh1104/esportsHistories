import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const FOLLOWED_PLAYERS_KEY = '@esports_followed_players';

export type FollowedPlayer = {
  id: string;
  displayName: string;
  gameId: string;
};

type FollowedPlayersContextType = {
  followedPlayerIds: string[];
  followPlayer: (player: FollowedPlayer) => void;
  unfollowPlayer: (playerId: string) => void;
  isFollowing: (playerId: string) => boolean;
};

const FollowedPlayersContext = createContext<FollowedPlayersContextType | null>(null);

export function FollowedPlayersProvider({ children }: { children: React.ReactNode }) {
  const [followedPlayerIds, setFollowedPlayerIds] = useState<string[]>([]);

  const loadStored = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(FOLLOWED_PLAYERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setFollowedPlayerIds(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setFollowedPlayerIds([]);
    }
  }, []);

  useEffect(() => {
    loadStored();
  }, [loadStored]);

  const followPlayer = useCallback((player: FollowedPlayer) => {
    setFollowedPlayerIds((prev) => {
      if (prev.includes(player.id)) return prev;
      const next = [...prev, player.id];
      AsyncStorage.setItem(FOLLOWED_PLAYERS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const unfollowPlayer = useCallback((playerId: string) => {
    setFollowedPlayerIds((prev) => {
      const next = prev.filter((id) => id !== playerId);
      AsyncStorage.setItem(FOLLOWED_PLAYERS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isFollowing = useCallback(
    (playerId: string) => followedPlayerIds.includes(playerId),
    [followedPlayerIds]
  );

  return (
    <FollowedPlayersContext.Provider
      value={{ followedPlayerIds, followPlayer, unfollowPlayer, isFollowing }}
    >
      {children}
    </FollowedPlayersContext.Provider>
  );
}

export function useFollowedPlayers() {
  const ctx = useContext(FollowedPlayersContext);
  if (!ctx) throw new Error('useFollowedPlayers must be used within FollowedPlayersProvider');
  return ctx;
}
