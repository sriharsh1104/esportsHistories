import { Card, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import type { Game } from '@/data/games';
import { GAME_CATEGORIES } from '@/data/games';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

function getGameBySlug(slug: string): Game | undefined {
  for (const cat of GAME_CATEGORIES) {
    const game = cat.games.find((g) => g.slug === slug);
    if (game) return game;
  }
  return undefined;
}

export default function GameSectionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const game = slug ? getGameBySlug(slug) : undefined;

  const styles = useMemo(
    () => ({
      header: { paddingTop: h(16), paddingBottom: h(24) },
      title: { fontSize: w(24), fontWeight: '700' as const, marginBottom: h(8) },
      subtitle: { fontSize: w(16) },
      section: { marginBottom: h(24) },
      sectionTitle: {
        fontSize: w(18),
        fontWeight: '600' as const,
        marginBottom: h(12),
      },
    }),
    [w, h]
  );

  if (!game) {
    return (
      <Screen padded>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Game not found</Text>
          <Text
            style={[styles.subtitle, { color: colors.tabIconDefault }]}
            onPress={() => router.back()}
          >
            Tap to go back
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded scroll maxContent>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{game.name}</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          News, updates & esports coverage
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Latest News</Text>
        <Card style={{ padding: w(20) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: h(12) }}>
            <FontAwesome
              name="newspaper-o"
              size={w(24)}
              color={colors.tint}
              style={{ marginRight: w(12) }}
            />
            <Text style={{ fontSize: w(16), color: colors.tabIconDefault, flex: 1 }}>
              No news yet. Check back soon for {game.name} updates.
            </Text>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
