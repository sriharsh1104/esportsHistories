import { BackButton, Button, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useFollowCatalog } from '@/context/FollowCatalogContext';
import { useFollowedTargets } from '@/context/FollowedTargetsContext';
import type { FollowedTarget } from '@/context/FollowedTargetsContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useSelectedGames } from '@/context/SelectedGamesContext';
import type { FollowCatalogItem } from '@/services/games.service';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';

const MAX_GAMES = 10;

type ExploreSection = 'games' | 'personality' | 'organization';

function normalizeTypeParam(raw?: string): ExploreSection {
  const t = String(raw ?? '').toLowerCase();
  if (t === 'games' || t === 'game') return 'games';
  if (t === 'person' || t === 'personality' || t === 'player' || t === 'players') return 'personality';
  if (t === 'org' || t === 'organization' || t === 'team' || t === 'teams') return 'organization';
  return 'personality';
}

function sortedIdsKey(ids: string[]): string {
  return [...ids].sort().join('\u0001');
}

function targetsKey(list: FollowedTarget[]): string {
  return [...list]
    .map((t) => `${t.kind}:${t.id}`)
    .sort()
    .join('\u0001');
}

export default function FollowExploreScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const section = useMemo(() => normalizeTypeParam(type), [type]);
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const { catalog, loading, error, refresh } = useFollowCatalog();
  const { selectedGameIds, saveSelectedGames, refreshGames } = useSelectedGames();
  const { targets, commitKind } = useFollowedTargets();

  const [pendingGameIds, setPendingGameIds] = useState<string[]>([]);
  const [pendingPersonalities, setPendingPersonalities] = useState<FollowedTarget[]>([]);
  const [pendingOrgs, setPendingOrgs] = useState<FollowedTarget[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (section === 'games') {
        setPendingGameIds([...selectedGameIds]);
        void refreshGames();
      } else if (section === 'personality') {
        setPendingPersonalities(targets.filter((t) => t.kind === 'personality'));
      } else {
        setPendingOrgs(targets.filter((t) => t.kind === 'organization'));
      }
    }, [section, selectedGameIds, targets, refreshGames])
  );

  const baselinePersonalities = useMemo(
    () => targets.filter((t) => t.kind === 'personality'),
    [targets]
  );
  const baselineOrgs = useMemo(() => targets.filter((t) => t.kind === 'organization'), [targets]);

  const dirty = useMemo(() => {
    if (section === 'games') {
      return sortedIdsKey(pendingGameIds) !== sortedIdsKey(selectedGameIds);
    }
    if (section === 'personality') {
      return targetsKey(pendingPersonalities) !== targetsKey(baselinePersonalities);
    }
    return targetsKey(pendingOrgs) !== targetsKey(baselineOrgs);
  }, [
    section,
    pendingGameIds,
    selectedGameIds,
    pendingPersonalities,
    baselinePersonalities,
    pendingOrgs,
    baselineOrgs,
  ]);

  const meta = useMemo(() => {
    if (section === 'games') {
      return {
        title: 'Follow games',
        subtitle: 'Items select karo, phir upar Submit se profile API par save (jaise games).',
        empty: 'Is response mein abhi koi game listed nahi. Manual picker use karo.',
      };
    }
    if (section === 'organization') {
      return {
        title: 'Follow teams & orgs',
        subtitle: 'Select karo, upar Submit — profile par followedOrganizations update.',
        empty: 'Abhi koi organisation is API response mein nahi.',
      };
    }
    return {
      title: 'Follow players & personalities',
      subtitle: 'Select karo, upar Submit — profile par followedPersonalities update.',
      empty: 'Abhi koi personality is API response mein nahi.',
    };
  }, [section]);

  const items = useMemo((): FollowCatalogItem[] => {
    if (!catalog) return [];
    if (section === 'games') return catalog.games;
    if (section === 'organization') return catalog.organizations;
    return catalog.personalities;
  }, [catalog, section]);

  const togglePendingGame = useCallback((id: string) => {
    setPendingGameIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_GAMES) return prev;
      return [...prev, id];
    });
  }, []);

  const togglePendingPerson = useCallback((item: FollowCatalogItem) => {
    setPendingPersonalities((prev) => {
      const exists = prev.some((t) => t.id === item.id);
      if (exists) return prev.filter((t) => t.id !== item.id);
      return [...prev, { id: item.id, name: item.name, kind: 'personality' as const }];
    });
  }, []);

  const togglePendingOrg = useCallback((item: FollowCatalogItem) => {
    setPendingOrgs((prev) => {
      const exists = prev.some((t) => t.id === item.id);
      if (exists) return prev.filter((t) => t.id !== item.id);
      return [...prev, { id: item.id, name: item.name, kind: 'organization' as const }];
    });
  }, []);

  const onSubmit = useCallback(async () => {
    if (!dirty || submitting) return;
    setSubmitting(true);
    try {
      if (section === 'games') {
        await saveSelectedGames(pendingGameIds);
      } else if (section === 'personality') {
        await commitKind(
          'personality',
          pendingPersonalities.map((t) => ({ id: t.id, name: t.name }))
        );
      } else {
        await commitKind(
          'organization',
          pendingOrgs.map((t) => ({ id: t.id, name: t.name }))
        );
      }
      router.replace(ROUTES.HOME);
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [
    dirty,
    submitting,
    section,
    saveSelectedGames,
    pendingGameIds,
    commitKind,
    pendingPersonalities,
    pendingOrgs,
    router,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: FollowCatalogItem }) => {
      const isGame = section === 'games';
      const selected = isGame
        ? pendingGameIds.includes(item.id)
        : section === 'personality'
          ? pendingPersonalities.some((t) => t.id === item.id)
          : pendingOrgs.some((t) => t.id === item.id);

      return (
        <Pressable
          onPress={() => {
            if (isGame) togglePendingGame(item.id);
            else if (section === 'personality') togglePendingPerson(item);
            else togglePendingOrg(item);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: h(12),
            paddingHorizontal: w(4),
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            width: '100%',
            maxWidth: '100%',
            alignSelf: 'stretch',
          }}
        >
          <View
            style={{
              width: w(44),
              height: w(44),
              borderRadius: w(22),
              backgroundColor: colors.inputBg,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: w(12),
              overflow: 'hidden',
            }}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <FontAwesome
                name={isGame ? 'gamepad' : section === 'personality' ? 'user' : 'building'}
                size={w(18)}
                color={colors.tint}
              />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: w(16), fontWeight: '600', color: colors.text }} numberOfLines={2}>
              {item.name}
            </Text>
            {!!item.slug && item.slug !== item.id && (
              <Text style={{ fontSize: w(12), color: colors.tabIconDefault, marginTop: h(2) }} numberOfLines={1}>
                {item.slug}
              </Text>
            )}
          </View>
          <FontAwesome
            name={selected ? 'check-circle' : 'plus-circle'}
            size={w(22)}
            color={selected ? colors.tint : colors.tabIconDefault}
          />
        </Pressable>
      );
    },
    [
      section,
      colors,
      w,
      h,
      pendingGameIds,
      pendingPersonalities,
      pendingOrgs,
      togglePendingGame,
      togglePendingPerson,
      togglePendingOrg,
    ]
  );

  const listHeader = (
    <View style={{ marginBottom: h(12) }}>
      <Text style={{ fontSize: w(20), fontWeight: '700', color: colors.text, marginBottom: h(6) }}>
        {meta.title}
      </Text>
      <Text style={{ fontSize: w(14), color: colors.tabIconDefault, lineHeight: w(20) }}>{meta.subtitle}</Text>
      {section === 'games' && (
        <Button
          title="Advanced game picker"
          variant="outline"
          onPress={() => router.push(ROUTES.SELECT_GAMES_FOLLOW)}
          fullWidth
          style={{ marginTop: h(14) }}
        />
      )}
    </View>
  );

  const showSubmit =
    !loading && !error && (!!catalog || section === 'games');

  const headerBar = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: '100%',
        marginBottom: h(10),
        gap: w(8),
      }}
    >
      <BackButton compact />
      {showSubmit ? (
        <Button
          title={submitting ? 'Saving…' : 'Submit'}
          onPress={() => void onSubmit()}
          disabled={!dirty || submitting}
          style={{
            paddingVertical: h(10),
            paddingHorizontal: w(18),
            minHeight: h(44),
            flexShrink: 0,
          }}
        />
      ) : (
        <View style={{ minWidth: w(44) }} />
      )}
    </View>
  );

  return (
    <Screen
      padded
      scroll={false}
      style={{ flex: 1, width: '100%', minHeight: 0, alignSelf: 'stretch' }}
    >
      <View style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: '100%', alignSelf: 'stretch' }}>
        {headerBar}
        <View style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: '100%' }}>
          {loading && !catalog ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: h(48) }}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={{ marginTop: h(12), color: colors.tabIconDefault, fontSize: w(14) }}>
                Game-options API se list load ho rahi hai…
              </Text>
            </View>
          ) : error ? (
            <View style={{ flex: 1, justifyContent: 'center', paddingVertical: h(24) }}>
              <Text style={{ color: '#dc3545', fontSize: w(14), marginBottom: h(16), textAlign: 'center' }}>
                {error}
              </Text>
              <Button title="Retry" onPress={() => void refresh()} fullWidth />
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(it) => `${section}-${it.id}`}
              renderItem={renderItem}
              ListHeaderComponent={
                <View style={{ width: '100%', maxWidth: '100%' }}>
                  {listHeader}
                  {section === 'games' && pendingGameIds.length >= MAX_GAMES && (
                    <Text
                      style={{
                        fontSize: w(12),
                        color: colors.accent,
                        marginBottom: h(8),
                        textAlign: 'center',
                      }}
                    >
                      Max {MAX_GAMES} games
                    </Text>
                  )}
                </View>
              }
              ListEmptyComponent={
                <Text style={{ color: colors.tabIconDefault, fontSize: w(14), paddingVertical: h(24) }}>
                  {meta.empty}
                </Text>
              }
              refreshControl={
                <RefreshControl
                  refreshing={loading && !!catalog}
                  onRefresh={() => void refresh()}
                  tintColor={colors.tint}
                />
              }
              style={{ flex: 1, minHeight: 0, width: '100%' }}
              contentContainerStyle={{
                paddingBottom: h(24),
                flexGrow: items.length === 0 ? 1 : undefined,
                width: '100%',
                maxWidth: '100%',
              }}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              {...(Platform.OS === 'web' ? { windowSize: 10 } : {})}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}
