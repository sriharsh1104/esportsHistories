import { useAuth } from '@/context/AuthContext';
import type { FollowCatalog } from '@/services/games.service';
import { fetchFollowCatalog } from '@/services/games.service';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type FollowCatalogContextType = {
  catalog: FollowCatalog | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const emptyCatalog: FollowCatalog = { games: [], personalities: [], organizations: [] };

const FollowCatalogContext = createContext<FollowCatalogContextType | null>(null);

export function FollowCatalogProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [catalog, setCatalog] = useState<FollowCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCatalog(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFollowCatalog();
      setCatalog(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load follow catalog';
      setError(msg);
      setCatalog(emptyCatalog);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      if (!isAuthenticated) setCatalog(null);
      return;
    }
    void refresh();
  }, [authLoading, isAuthenticated, refresh]);

  const value = useMemo(
    () => ({
      catalog,
      loading,
      error,
      refresh,
    }),
    [catalog, loading, error, refresh]
  );

  return (
    <FollowCatalogContext.Provider value={value}>{children}</FollowCatalogContext.Provider>
  );
}

export function useFollowCatalog() {
  const ctx = useContext(FollowCatalogContext);
  if (!ctx) throw new Error('useFollowCatalog must be used within FollowCatalogProvider');
  return ctx;
}
