import { useFollowedTargets } from '@/context/FollowedTargetsContext';
import { useSelectedGames } from '@/context/SelectedGamesContext';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type FeedFocus =
  | null
  | { kind: 'game'; id: string }
  | { kind: 'personality'; id: string }
  | { kind: 'organization'; id: string };

type FeedFocusContextType = {
  focus: FeedFocus;
  setFocus: (f: FeedFocus) => void;
  /** @deprecated Prefer `focus` — game-only filter; null if focus is not a game. */
  focusGameId: string | null;
  /** @deprecated Prefer `setFocus` */
  setFocusGameId: (id: string | null) => void;
};

const FeedFocusContext = createContext<FeedFocusContextType | null>(null);

function isValidFocus(
  f: FeedFocus,
  gameIds: string[],
  personalityIds: string[],
  organizationIds: string[]
): boolean {
  if (f === null) return true;
  if (f.kind === 'game') return gameIds.includes(f.id);
  if (f.kind === 'personality') return personalityIds.includes(f.id);
  return organizationIds.includes(f.id);
}

function firstAutoFocus(
  gameIds: string[],
  personalityIds: string[],
  organizationIds: string[]
): FeedFocus {
  if (gameIds.length > 0) return { kind: 'game', id: gameIds[0] };
  if (personalityIds.length > 0) return { kind: 'personality', id: personalityIds[0] };
  if (organizationIds.length > 0) return { kind: 'organization', id: organizationIds[0] };
  return null;
}

export function FeedFocusProvider({ children }: { children: React.ReactNode }) {
  const { selectedGameIds } = useSelectedGames();
  const { targets } = useFollowedTargets();
  const [focus, setFocusState] = useState<FeedFocus>(null);
  const hasInitializedFocus = useRef(false);

  const personalityIds = useMemo(
    () => targets.filter((t) => t.kind === 'personality').map((t) => t.id),
    [targets]
  );
  const organizationIds = useMemo(
    () => targets.filter((t) => t.kind === 'organization').map((t) => t.id),
    [targets]
  );

  const setFocus = useCallback((f: FeedFocus) => {
    hasInitializedFocus.current = true;
    setFocusState(f);
  }, []);

  const setFocusGameId = useCallback((id: string | null) => {
    hasInitializedFocus.current = true;
    setFocusState(id === null ? null : { kind: 'game', id });
  }, []);

  useEffect(() => {
    const hasAny =
      selectedGameIds.length > 0 || personalityIds.length > 0 || organizationIds.length > 0;
    if (!hasAny) {
      setFocusState(null);
      hasInitializedFocus.current = false;
      return;
    }

    setFocusState((prev) => {
      if (prev !== null && isValidFocus(prev, selectedGameIds, personalityIds, organizationIds)) {
        return prev;
      }
      if (prev === null && hasInitializedFocus.current) {
        return null;
      }
      hasInitializedFocus.current = true;
      return firstAutoFocus(selectedGameIds, personalityIds, organizationIds);
    });
  }, [selectedGameIds, personalityIds, organizationIds]);

  const focusGameId = focus?.kind === 'game' ? focus.id : null;

  const value = useMemo(
    () => ({
      focus,
      setFocus,
      focusGameId,
      setFocusGameId,
    }),
    [focus, setFocus, focusGameId, setFocusGameId]
  );

  return <FeedFocusContext.Provider value={value}>{children}</FeedFocusContext.Provider>;
}

export function useFeedFocus() {
  const ctx = useContext(FeedFocusContext);
  if (!ctx) throw new Error('useFeedFocus must be used within FeedFocusProvider');
  return ctx;
}
