import { NewsSection } from '@/components/dashboard';
import { Button, Card, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useSelectedGames } from '@/context/SelectedGamesContext';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

export default function FollowScreen() {
  const { isAuthenticated } = useAuth();
  const { selectedGameIds } = useSelectedGames();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const styles = useMemo(
    () => ({
      header: { paddingTop: h(16), paddingBottom: h(24) },
      title: { fontSize: w(24), fontWeight: '700' as const, marginBottom: h(4) },
      subtitle: { fontSize: w(16) },
      section: { marginBottom: h(24) },
      sectionTitle: { fontSize: w(18), fontWeight: '600' as const, marginBottom: h(16) },
      card: { padding: w(16), marginBottom: h(16) },
      cardTitle: { fontSize: w(16), fontWeight: '600' as const, marginBottom: h(4) },
      cardDesc: { fontSize: w(14) },
      centered: { flex: 1, justifyContent: 'center' as const, paddingTop: h(48) },
      btn: { maxWidth: w(200) },
    }),
    [w, h]
  );

  if (!isAuthenticated) {
    return (
      <Screen padded maxForm>
        <View style={styles.centered}>
          <Text style={[styles.title, { color: colors.text }]}>Follow</Text>
          <Text style={[styles.subtitle, { color: colors.tabIconDefault, marginBottom: h(24) }]}>
            Sign in to follow games and get personalized news
          </Text>
          <Button
            title="Sign in"
            onPress={() => router.push('/(auth)/login')}
            fullWidth
            style={styles.btn}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded scroll maxContent>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Follow</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Your personalized feed from followed games
        </Text>
      </View>

      <View style={styles.section}>
        <Card
          onPress={() => router.push('/select-games?from=follow')}
          style={[
            styles.card,
            {
              borderWidth: 1,
              borderColor: colors.tint,
              borderStyle: 'dashed',
              backgroundColor: colors.tint + '12',
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Manage games to follow
          </Text>
          <Text style={[styles.cardDesc, { color: colors.tabIconDefault }]}>
            {selectedGameIds.length > 0
              ? `${selectedGameIds.length} games selected • Tap to add/remove`
              : 'Select games to get personalized news'}
          </Text>
        </Card>
      </View>

      <View style={styles.section}>
        <NewsSection />
      </View>
    </Screen>
  );
}
