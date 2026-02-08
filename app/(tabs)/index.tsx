import { NewsSection, WalletBalanceCard } from '@/components/dashboard';
import { Button, Card, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

export default function DashboardScreen() {
  const { user, isAuthenticated } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const { w, h, isTablet } = useResponsive();
  const colors = Colors[scheme];

  const styles = useMemo(
    () => ({
      header: { paddingTop: h(16), paddingBottom: h(24) },
      greeting: { fontSize: w(24), fontWeight: '700' as const, marginBottom: h(4) },
      subtitle: { fontSize: w(16) },
      authPrompt: { marginBottom: h(32) },
      authCard: { padding: w(20) },
      authTitle: { fontSize: w(18), fontWeight: '600' as const, marginBottom: h(8) },
      authDesc: { fontSize: w(14), marginBottom: h(16) },
      authBtn: { marginBottom: h(12) },
      sections: { flex: 1 },
      sectionTitle: { fontSize: w(18), fontWeight: '600' as const, marginBottom: h(16) },
      quickCard: { marginBottom: h(12) },
      cardsRow: {
        flexDirection: (isTablet ? 'row' : 'column') as 'row' | 'column',
        gap: w(12),
      },
      cardFlex: isTablet ? { flex: 1, minWidth: 200 } : {},
      cardTitle: { fontSize: w(16), fontWeight: '600' as const, marginBottom: h(4) },
      cardDesc: { fontSize: w(14) },
    }),
    [w, h, isTablet]
  );

  return (
    <Screen padded scroll maxContent>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>
          {isAuthenticated && user
            ? `Hey, ${user.displayName}`
            : 'Welcome to Esports Histories'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          {isAuthenticated ? 'Your esports news hub' : 'Sign in to get started'}
        </Text>
      </View>

      {!isAuthenticated && (
        <View style={styles.authPrompt}>
          <Card style={styles.authCard}>
            <Text style={[styles.authTitle, { color: colors.text }]}>
              Create an account
            </Text>
            <Text style={[styles.authDesc, { color: colors.tabIconDefault }]}>
              Sign up to save favorites and get personalized news
            </Text>
            <Button
              title="Sign in"
              fullWidth
              style={styles.authBtn}
              onPress={() => router.push('/(auth)/login')}
            />
            <Button
              title="Sign up"
              variant="outline"
              fullWidth
              onPress={() => router.push('/(auth)/signup')}
            />
          </Card>
        </View>
      )}

      {isAuthenticated && (
        <View style={[styles.sections, { marginBottom: h(24) }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Wallet
          </Text>
          <WalletBalanceCard />
        </View>
      )}

      <View style={styles.sections}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Quick links
        </Text>
        <View style={styles.cardsRow}>
          <View style={styles.cardFlex}>
            <Card onPress={() => {}} style={styles.quickCard}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>PC Games</Text>
              <Text style={[styles.cardDesc, { color: colors.tabIconDefault }]}>
                LoL, Dota 2, CS2, Valorant
              </Text>
            </Card>
          </View>
          <View style={styles.cardFlex}>
            <Card onPress={() => {}} style={styles.quickCard}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Mobile Games</Text>
              <Text style={[styles.cardDesc, { color: colors.tabIconDefault }]}>
                Mobile Legends, PUBG Mobile, Free Fire
              </Text>
            </Card>
          </View>
        </View>
      </View>

      <View style={[styles.sections, { marginTop: h(24) }]}>
        <NewsSection />
      </View>
    </Screen>
  );
}
