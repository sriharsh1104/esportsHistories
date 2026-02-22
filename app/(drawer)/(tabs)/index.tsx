import { NewsSection, WalletBalanceCard } from '@/components/dashboard';
import { Button, Card, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useSelectedGames } from '@/context/SelectedGamesContext';
import { ALL_GAMES } from '@/data/games';
import FontAwesome from '@expo/vector-icons/FontAwesome';
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
        if (!isAuthenticated || selectedGameIds.length === 0) return null;
        
        // Find game details for each selected ID
        const selectedGames = selectedGameIds
          .map(id => ALL_GAMES.find(g => g.id === id))
          .filter(Boolean) as any[];

        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Games</Text>
            <View style={styles.cardsRow}>
              {selectedGames.map((game) => (
                <View key={game.id} style={styles.cardFlex}>
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
        );
      })()}

      {isAuthenticated && selectedGameIds.length > 0 && (
        <View style={styles.newsSection}>
          <NewsSection />
        </View>
      )}
    </Screen>
  );
}
