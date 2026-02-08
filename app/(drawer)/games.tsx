import { Card, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import { GAME_CATEGORIES } from '@/data/games';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

export default function GamesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const styles = useMemo(
    () => ({
      header: { paddingTop: h(16), paddingBottom: h(24) },
      title: { fontSize: w(24), fontWeight: '700' as const, marginBottom: h(4) },
      subtitle: { fontSize: w(16) },
      section: { marginBottom: h(24) },
      sectionTitle: {
        fontSize: w(18),
        fontWeight: '600' as const,
        marginBottom: h(12),
      },
      gameCard: { marginBottom: h(8) },
      gameRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
      },
      gameIcon: { marginRight: w(12) },
      gameName: { fontSize: w(16), fontWeight: '500' as const, flex: 1 },
    }),
    [w, h]
  );

  return (
    <Screen padded scroll maxContent>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Select Games</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Esports games popular in India
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {GAME_CATEGORIES.map((cat) => (
          <View key={cat.id} style={styles.section}>
            <View style={styles.gameRow}>
              <FontAwesome
                name={cat.icon as any}
                size={w(20)}
                color={colors.tint}
                style={styles.gameIcon}
              />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {cat.title}
              </Text>
            </View>
            {cat.games.map((game) => (
              <Card
                key={game.id}
                onPress={() => {}}
                style={styles.gameCard}
              >
                <View style={styles.gameRow}>
                  <Text style={[styles.gameName, { color: colors.text }]}>
                    {game.name}
                  </Text>
                  <FontAwesome
                    name="chevron-right"
                    size={w(14)}
                    color={colors.tabIconDefault}
                  />
                </View>
              </Card>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
