import {
  NewsFeedFilterChips,
  type FeedFilterChip,
  NewsSection,
  WalletBalanceCard,
} from '@/components/dashboard';
import { Button, Card, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useSelectedGames } from '@/context/SelectedGamesContext';
import { userHasSelectedGames } from '@/utils/gameSelection';
import {
  fetchGameDashboardData,
  type Game,
  type GameDashboardItem,
} from '@/services/games.service';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

export default function NewsScreen() {
  const { user, isAuthenticated } = useAuth();
  const {
    availableGames,
    selectedGameIds,
    toggleGame,
    isGameSelected,
    refreshGames,
    saveSelectedGames,
    isLoading: isGamesLoading,
  } = useSelectedGames();
  const scheme = useColorScheme() ?? 'light';
  const { w, h, isTablet } = useResponsive();
  const colors = Colors[scheme];
  const [activeCategory, setActiveCategory] = useState<'mobile' | 'pc'>('mobile');
  const [dashboardItems, setDashboardItems] = useState<GameDashboardItem[]>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [isSubmittingSelection, setIsSubmittingSelection] = useState(false);
  const confirmedSelectedGames = Array.isArray(user?.selectedGames) ? user.selectedGames : [];
  const requiresGameSelection = isAuthenticated && !userHasSelectedGames(confirmedSelectedGames);

  function slugFromGameLabel(name: string): string {
    return String(name).trim().toLowerCase().replace(/\s+/g, '-');
  }

  /** Resolved games for dashboard/cards without requiring game-options when profile already has picks. */
  const gamesFromProfile = useMemo((): Game[] => {
    if (!confirmedSelectedGames.length) return [];
    return confirmedSelectedGames
      .map((g: any) => {
        if (typeof g !== 'object') {
          const name = String(g).trim();
          if (!name) return null;
          const slug = slugFromGameLabel(name);
          return {
            _id: name,
            name,
            slug,
            category: 'mobile' as const,
            icon: 'gamepad',
          };
        }
        const name = String(g.name ?? g.game ?? '').trim();
        if (!name) return null;
        const idRaw = String(g._id ?? g.id ?? g.gameId ?? '').trim();
        const fromCatalog =
          availableGames.find((ag) => ag._id === idRaw) ??
          availableGames.find((ag) => ag.name.toLowerCase() === name.toLowerCase());
        if (fromCatalog) return fromCatalog;
        const slug = String(g.slug ?? slugFromGameLabel(name));
        const platform = g.platform === 'pc' ? 'pc' : 'mobile';
        return {
          _id: idRaw || name,
          name,
          slug,
          category: platform,
          icon: 'gamepad',
        };
      })
      .filter(Boolean) as Game[];
  }, [confirmedSelectedGames, availableGames]);

  const confirmedSelectedIds = useMemo(
    () => gamesFromProfile.map((g) => g._id).filter(Boolean),
    [gamesFromProfile]
  );

  const chipGames = useMemo(
    () => gamesFromProfile.map((g) => ({ id: g._id, label: g.name })),
    [gamesFromProfile]
  );

  const followedPersonalities = user?.followedPersonalities ?? [];
  const followedOrganizations = user?.followedOrganizations ?? [];

  const feedChips = useMemo((): FeedFilterChip[] => {
    const gameChips: FeedFilterChip[] = chipGames.map((g) => ({
      kind: 'game',
      id: g.id,
      label: g.label,
    }));
    const pers: FeedFilterChip[] = followedPersonalities.map((p) => ({
      kind: 'personality',
      id: p.id,
      label: p.name,
    }));
    const orgs: FeedFilterChip[] = followedOrganizations.map((o) => ({
      kind: 'organization',
      id: o.id,
      label: o.name,
    }));
    return [...gameChips, ...pers, ...orgs];
  }, [chipGames, followedPersonalities, followedOrganizations]);

  const hasFollowFeed =
    feedChips.length > 0;

  const styles = useMemo(
    () => ({
      header: { paddingTop: h(16), paddingBottom: h(24) },
      greeting: { fontSize: w(24), fontWeight: '700' as const, marginBottom: h(4) },
      subtitle: { fontSize: w(16) },

      section: { marginBottom: h(24) },
      sectionTitle: { fontSize: w(18), fontWeight: '600' as const, marginBottom: h(16) },
      quickCard: { marginBottom: h(12) },
      gameChip: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: h(8),
        paddingHorizontal: w(12),
        borderRadius: w(12),
        marginRight: w(8),
        marginBottom: h(8),
      },
      categoryTabs: {
        flexDirection: 'row' as const,
        gap: w(8),
        marginBottom: h(12),
      },
      categoryTab: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        borderRadius: w(16),
        paddingVertical: h(8),
        paddingHorizontal: w(12),
        borderWidth: 1,
      },
      cardsRow: {
        flexDirection: (isTablet ? 'row' : 'column') as 'row' | 'column',
        gap: w(12),
      },
      cardFlex: isTablet ? { flex: 1, minWidth: 200 } : {},
      cardTitle: { fontSize: w(16), fontWeight: '600' as const, marginBottom: h(4) },
      cardDesc: { fontSize: w(14) },
      newsSection: { marginTop: h(8), marginBottom: h(32) },
    }),
    [w, h, isTablet]
  );

  useEffect(() => {
    if (!isAuthenticated || !requiresGameSelection) return;
    if (availableGames.length > 0) return;
    void refreshGames();
  }, [isAuthenticated, requiresGameSelection, availableGames.length, refreshGames]);

  const categoryGames = useMemo(
    () => availableGames.filter((game) => game.category === activeCategory),
    [availableGames, activeCategory]
  );

  useEffect(() => {
    if (!isAuthenticated || requiresGameSelection) {
      setDashboardItems([]);
      return;
    }

    setIsDashboardLoading(true);
    fetchGameDashboardData()
      .then((items) => {
        setDashboardItems(items);
      })
      .catch(() => {
        setDashboardItems([]);
      })
      .finally(() => {
        setIsDashboardLoading(false);
      });
  }, [isAuthenticated, requiresGameSelection, confirmedSelectedIds.join('|')]);

  const handleSaveSelectedGames = async () => {
    try {
      setIsSubmittingSelection(true);
      await saveSelectedGames();
    } finally {
      setIsSubmittingSelection(false);
    }
  };

  const renderGameSelectionCard = (modalLike: boolean) => (
    <Card style={{ padding: w(16), marginBottom: h(16), borderColor: modalLike ? colors.tint : colors.border, borderWidth: 1 }}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Game Selection</Text>
      <Text style={[styles.cardDesc, { color: colors.tabIconDefault, marginBottom: h(12) }]}>
        At least one game follow karo to dashboard pe related content milega.
      </Text>
      <View style={styles.categoryTabs}>
        {(['mobile', 'pc'] as const).map((category) => {
          const active = activeCategory === category;
          return (
            <Pressable
              key={category}
              onPress={() => setActiveCategory(category)}
              style={[
                styles.categoryTab,
                {
                  backgroundColor: active ? colors.tint : 'transparent',
                  borderColor: active ? colors.tint : colors.border,
                },
              ]}
            >
              <FontAwesome
                name={category === 'mobile' ? 'mobile' : 'desktop'}
                size={w(12)}
                color={active ? '#fff' : colors.text}
                style={{ marginRight: w(6) }}
              />
              <Text style={{ color: active ? '#fff' : colors.text, fontSize: w(12), fontWeight: '600' }}>
                {category.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {isGamesLoading && categoryGames.length === 0 && (
          <View style={{ width: '100%', paddingVertical: h(12), alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.tint} />
          </View>
        )}

        {!isGamesLoading && categoryGames.length === 0 && (
          <Text style={{ color: colors.tabIconDefault, fontSize: w(13), marginBottom: h(8) }}>
            No game options found.
          </Text>
        )}

        {categoryGames.map((game) => {
          const selected = isGameSelected(game._id);
          return (
            <Pressable
              key={game._id}
              onPress={() => void toggleGame(game._id)}
              style={[
                styles.gameChip,
                { backgroundColor: selected ? colors.tint : colors.border + '40' },
              ]}
            >
              <FontAwesome
                name={selected ? 'check-circle' : 'gamepad'}
                size={w(13)}
                color={selected ? '#fff' : colors.text}
                style={{ marginRight: w(6) }}
              />
              <Text style={{ color: selected ? '#fff' : colors.text, fontSize: w(12), fontWeight: '600' }}>
                {game.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selectedGameIds.length === 0 && (
        <Text style={{ color: '#dc3545', fontSize: w(12), marginTop: h(4) }}>
          Select at least one game before submit.
        </Text>
      )}
      <Button
        title={isSubmittingSelection ? 'Submitting...' : isGamesLoading ? 'Loading...' : 'Submit'}
        onPress={handleSaveSelectedGames}
        disabled={isGamesLoading || isSubmittingSelection || selectedGameIds.length === 0}
        style={{ marginTop: h(8) }}
      />
    </Card>
  );

  return (
    <Screen padded scroll maxContent>
      {requiresGameSelection ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingTop: h(24), minHeight: h(420) }}>
          {renderGameSelectionCard(true)}
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: colors.text }]}>
              {isAuthenticated && user ? `Hey, ${user.displayName}` : 'Esports News'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
              {isAuthenticated
                ? 'Games, players & orgs — tap a circle above the feed to filter news'
                : 'Discover the latest esports news'}
            </Text>
          </View>

          {isAuthenticated && hasFollowFeed && (
            <View style={styles.section}>
              <NewsFeedFilterChips chips={feedChips} />
              <NewsSection />
            </View>
          )}

          {isAuthenticated && (
            <View style={styles.section}>
              <WalletBalanceCard />
            </View>
          )}

          {isAuthenticated && gamesFromProfile.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your games</Text>
              <View style={styles.cardsRow}>
                {gamesFromProfile.map((game) => (
                  <View key={game._id} style={styles.cardFlex}>
                    <Card
                      onPress={() => router.push(ROUTES.GAME_SLUG(game.slug))}
                      style={styles.quickCard}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <FontAwesome
                          name="gamepad"
                          size={w(20)}
                          color={colors.tint}
                          style={{ marginRight: w(12) }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                            {game.name}
                          </Text>
                          <Text style={[styles.cardDesc, { color: colors.tabIconDefault }]}>
                            View news & updates
                          </Text>
                        </View>
                        <FontAwesome name="chevron-right" size={w(14)} color={colors.tabIconDefault} />
                      </View>
                    </Card>
                  </View>
                ))}
              </View>
            </View>
          )}

          {isAuthenticated && followedPersonalities.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Players & personalities you follow
              </Text>
              <View style={styles.cardsRow}>
                {followedPersonalities.map((p) => (
                  <View key={`p-${p.id}`} style={styles.cardFlex}>
                    <Card
                      onPress={() => router.push(ROUTES.FOLLOW_EXPLORE_PERSON)}
                      style={styles.quickCard}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <FontAwesome
                          name="user"
                          size={w(20)}
                          color={colors.tint}
                          style={{ marginRight: w(12) }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                            {p.name}
                          </Text>
                          <Text style={[styles.cardDesc, { color: colors.tabIconDefault }]}>
                            Filter news from the row above
                          </Text>
                        </View>
                        <FontAwesome name="chevron-right" size={w(14)} color={colors.tabIconDefault} />
                      </View>
                    </Card>
                  </View>
                ))}
              </View>
            </View>
          )}

          {isAuthenticated && followedOrganizations.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Teams & orgs you follow</Text>
              <View style={styles.cardsRow}>
                {followedOrganizations.map((o) => (
                  <View key={`o-${o.id}`} style={styles.cardFlex}>
                    <Card
                      onPress={() => router.push(ROUTES.FOLLOW_EXPLORE_ORG)}
                      style={styles.quickCard}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <FontAwesome
                          name="building"
                          size={w(20)}
                          color={colors.tint}
                          style={{ marginRight: w(12) }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                            {o.name}
                          </Text>
                          <Text style={[styles.cardDesc, { color: colors.tabIconDefault }]}>
                            Filter news from the row above
                          </Text>
                        </View>
                        <FontAwesome name="chevron-right" size={w(14)} color={colors.tabIconDefault} />
                      </View>
                    </Card>
                  </View>
                ))}
              </View>
            </View>
          )}

          {isAuthenticated && gamesFromProfile.length > 0 && (
            <View style={styles.newsSection}>
              <Text
                style={{
                  fontSize: w(18),
                  fontWeight: '600',
                  marginBottom: h(16),
                  color: colors.text,
                }}
              >
                Game Dashboard
              </Text>

              {isDashboardLoading ? (
                <View style={{ paddingVertical: h(24), alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              ) : dashboardItems.length === 0 ? (
                <Card style={{ padding: w(20), alignItems: 'center' }}>
                  <Text style={{ color: colors.tabIconDefault, fontSize: w(15), fontWeight: '600' }}>
                    No Data Found
                  </Text>
                </Card>
              ) : (
                dashboardItems.map((item) => (
                  <Card key={item.id} style={{ marginBottom: h(12) }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                    {!!item.description && (
                      <Text style={[styles.cardDesc, { color: colors.tabIconDefault }]}>{item.description}</Text>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: h(8) }}>
                      <Text style={{ color: colors.accent, fontSize: w(12) }}>{item.game ?? ''}</Text>
                      <Text style={{ color: colors.tabIconDefault, fontSize: w(12) }}>{item.time ?? ''}</Text>
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}

        </>
      )}
    </Screen>
  );
}
