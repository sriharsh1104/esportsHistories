import { NewsSection, WalletBalanceCard } from '@/components/dashboard';
import { Button, Card, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useSelectedGames } from '@/context/SelectedGamesContext';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

export default function NewsScreen() {
  const { user, isAuthenticated } = useAuth();
  const { selectedGameIds } = useSelectedGames();
  const scheme = useColorScheme() ?? 'light';
  const { w, h, isTablet } = useResponsive();
  const colors = Colors[scheme];

  const styles = useMemo(
    () => ({
      header: { paddingTop: h(16), paddingBottom: h(24) },
      greeting: { fontSize: w(24), fontWeight: '700' as const, marginBottom: h(4) },
      subtitle: { fontSize: w(16) },

      section: { marginBottom: h(24) },
      sectionTitle: { fontSize: w(18), fontWeight: '600' as const, marginBottom: h(16) },
      quickCard: { marginBottom: h(12) },
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

  return (
    <Screen padded scroll maxContent>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>
          {isAuthenticated && user ? `Hey, ${user.displayName}` : 'Esports News'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          {isAuthenticated
            ? 'Latest news for your followed games'
            : 'Discover the latest esports news'}
        </Text>
      </View>



      {isAuthenticated && selectedGameIds.length === 0 && (
        <Card style={{ padding: w(16), marginBottom: h(16) }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Select games to see news
          </Text>
          <Text style={[styles.cardDesc, { color: colors.tabIconDefault, marginBottom: h(12) }]}>
            Select at least 1 game to follow and get personalized news
          </Text>
          <Button
            title="Select games"
            variant="outline"
            onPress={() => router.push(ROUTES.SELECT_GAMES)}
          />
        </Card>
      )}

      {isAuthenticated && (
        <View style={styles.section}>
          <WalletBalanceCard />
        </View>
      )}

      {(() => {
        const pcIds = ['valorant', 'r6', 'cs2', 'dota2', 'lol', 'fc', 'pes', 'tekken'];
        const mobileIds = ['bgmi', 'freefire', 'mlbb', 'codm', 'coc', 'cr', 'wildrift'];
        const hasPc = selectedGameIds.length > 0 && selectedGameIds.some((id) => pcIds.includes(id));
        const hasMobile = selectedGameIds.length > 0 && selectedGameIds.some((id) => mobileIds.includes(id));
        const showQuickLinks = hasPc || hasMobile;

        return showQuickLinks ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Browse games</Text>
            <View style={styles.cardsRow}>
              {hasPc && (
                <View style={styles.cardFlex}>
                  <Card onPress={() => router.push(ROUTES.GAME)} style={styles.quickCard}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>PC Games</Text>
                    <Text style={[styles.cardDesc, { color: colors.tabIconDefault }]}>
                      LoL, Dota 2, CS2, Valorant
                    </Text>
                  </Card>
                </View>
              )}
              {hasMobile && (
                <View style={styles.cardFlex}>
                  <Card onPress={() => router.push(ROUTES.GAME)} style={styles.quickCard}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Mobile Games</Text>
                    <Text style={[styles.cardDesc, { color: colors.tabIconDefault }]}>
                      BGMI, Free Fire, MLBB
                    </Text>
                  </Card>
                </View>
              )}
            </View>
          </View>
        ) : null;
      })()}

      {isAuthenticated && selectedGameIds.length > 0 && (
        <View style={styles.newsSection}>
          <NewsSection />
        </View>
      )}
    </Screen>
  );
}
