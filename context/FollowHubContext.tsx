import { FollowHubModal } from '@/components/FollowHubModal';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type FollowHubContextType = {
  openFollowHub: () => void;
  closeFollowHub: () => void;
};

const FollowHubContext = createContext<FollowHubContextType | null>(null);

export function FollowHubProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  const openFollowHub = useCallback(() => setVisible(true), []);
  const closeFollowHub = useCallback(() => setVisible(false), []);

  const value = useMemo(
    () => ({ openFollowHub, closeFollowHub }),
    [openFollowHub, closeFollowHub]
  );

  return (
    <FollowHubContext.Provider value={value}>
      {children}
      <FollowHubModal visible={visible} onClose={closeFollowHub} />
    </FollowHubContext.Provider>
  );
}

export function useFollowHub() {
  const ctx = useContext(FollowHubContext);
  if (!ctx) throw new Error('useFollowHub must be used within FollowHubProvider');
  return ctx;
}
