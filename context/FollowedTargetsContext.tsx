import { useAuth } from '@/context/AuthContext';
import type { User } from '@/types/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = '@esports_followed_targets';

export type FollowedTargetKind = 'personality' | 'organization';

export type FollowedTarget = {
  id: string;
  name: string;
  kind: FollowedTargetKind;
};

type FollowedTargetsContextType = {
  targets: FollowedTarget[];
  isFollowing: (id: string, kind: FollowedTargetKind) => boolean;
  toggleTarget: (item: { id: string; name: string; kind: FollowedTargetKind }) => Promise<void>;
  /** Replace all follows of one kind and persist via profile API (with the other kind unchanged). */
  commitKind: (kind: FollowedTargetKind, items: Array<{ id: string; name: string }>) => Promise<void>;
  refresh: () => Promise<void>;
};

const FollowedTargetsContext = createContext<FollowedTargetsContextType | null>(null);

function parseStored(raw: string | null): FollowedTarget[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is FollowedTarget =>
          x &&
          typeof x === 'object' &&
          typeof (x as FollowedTarget).id === 'string' &&
          typeof (x as FollowedTarget).name === 'string' &&
          ((x as FollowedTarget).kind === 'personality' || (x as FollowedTarget).kind === 'organization')
      )
      .map((x) => ({
        id: x.id,
        name: x.name,
        kind: x.kind,
      }));
  } catch {
    return [];
  }
}

function targetsFromUser(user: User | null): FollowedTarget[] {
  if (!user) return [];
  const p = (user.followedPersonalities ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    kind: 'personality' as const,
  }));
  const o = (user.followedOrganizations ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    kind: 'organization' as const,
  }));
  return [...p, ...o];
}

export function FollowedTargetsProvider({ children }: { children: React.ReactNode }) {
  const { user, updateProfile, refreshUser } = useAuth();
  const [targets, setTargets] = useState<FollowedTarget[]>([]);
  const storageMigrationDone = useRef(false);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    setTargets(targetsFromUser(user));
  }, [user]);

  useEffect(() => {
    if (user?.id !== lastUserId.current) {
      storageMigrationDone.current = false;
      lastUserId.current = user?.id ?? null;
    }
    if (!user?.id || storageMigrationDone.current) return;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = parseStored(raw);
        if (parsed.length === 0) {
          storageMigrationDone.current = true;
          return;
        }
        const serverCount =
          (user.followedPersonalities?.length ?? 0) + (user.followedOrganizations?.length ?? 0);
        if (serverCount > 0) {
          await AsyncStorage.removeItem(STORAGE_KEY);
          storageMigrationDone.current = true;
          return;
        }
        const pers = parsed.filter((t) => t.kind === 'personality').map(({ id, name }) => ({ id, name }));
        const orgs = parsed.filter((t) => t.kind === 'organization').map(({ id, name }) => ({ id, name }));
        await updateProfile({ followedPersonalities: pers, followedOrganizations: orgs });
        await AsyncStorage.removeItem(STORAGE_KEY);
        storageMigrationDone.current = true;
      } catch {
        // keep storageMigrationDone false so a later session can retry
      }
    })();
  }, [user?.id, user?.followedPersonalities, user?.followedOrganizations, updateProfile]);

  const pushProfileFollows = useCallback(
    async (next: FollowedTarget[]) => {
      const personalities = next.filter((t) => t.kind === 'personality').map(({ id, name }) => ({ id, name }));
      const organizations = next.filter((t) => t.kind === 'organization').map(({ id, name }) => ({ id, name }));
      await updateProfile({ followedPersonalities: personalities, followedOrganizations: organizations });
    },
    [updateProfile]
  );

  const refresh = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  const isFollowing = useCallback(
    (id: string, kind: FollowedTargetKind) => targets.some((t) => t.id === id && t.kind === kind),
    [targets]
  );

  const toggleTarget = useCallback(
    async (item: { id: string; name: string; kind: FollowedTargetKind }) => {
      const exists = targets.some((t) => t.id === item.id && t.kind === item.kind);
      const next = exists
        ? targets.filter((t) => !(t.id === item.id && t.kind === item.kind))
        : [...targets, item];
      await pushProfileFollows(next);
    },
    [targets, pushProfileFollows]
  );

  const commitKind = useCallback(
    async (kind: FollowedTargetKind, items: Array<{ id: string; name: string }>) => {
      const normalized: FollowedTarget[] = items.map((i) => ({
        id: i.id,
        name: i.name,
        kind,
      }));
      const others = targets.filter((t) => t.kind !== kind);
      await pushProfileFollows([...others, ...normalized]);
    },
    [targets, pushProfileFollows]
  );

  const value = useMemo(
    () => ({
      targets,
      isFollowing,
      toggleTarget,
      commitKind,
      refresh,
    }),
    [targets, isFollowing, toggleTarget, commitKind, refresh]
  );

  return (
    <FollowedTargetsContext.Provider value={value}>{children}</FollowedTargetsContext.Provider>
  );
}

export function useFollowedTargets() {
  const ctx = useContext(FollowedTargetsContext);
  if (!ctx) throw new Error('useFollowedTargets must be used within FollowedTargetsProvider');
  return ctx;
}
