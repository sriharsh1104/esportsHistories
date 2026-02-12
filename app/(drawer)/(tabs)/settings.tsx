import { Button, Card, Screen, SettingsRow } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useSelectedGames } from '@/context/SelectedGamesContext';
import { useResponsive } from '@/context/ResponsiveContext';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

export default function SettingsScreen() {
  const { isAuthenticated, logout } = useAuth();
  const { selectedGameIds } = useSelectedGames();
  const scheme = useColorScheme();
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const extra = Constants.expoConfig?.extra;
  const appEnv = extra?.appEnv || 'development';

  const styles = useMemo(
    () => ({
      header: { paddingTop: h(16), paddingBottom: h(24) },
      title: { fontSize: w(24), fontWeight: '700' as const, marginBottom: h(4) },
      subtitle: { fontSize: w(16) },
      section: { marginBottom: h(24) },
      sectionTitle: {
        fontSize: w(14),
        fontWeight: '600' as const,
        marginBottom: h(8),
        color: colors.tabIconDefault,
      },
      card: { padding: 0, overflow: 'hidden' as const },
      logoutBtn: { marginTop: h(32) },
    }),
    [w, h, colors.tabIconDefault]
  );

  return (
    <Screen padded maxForm>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          App configuration & preferences
        </Text>
      </View>

      {isAuthenticated && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.tabIconDefault }]}>
            ACCOUNT
          </Text>
          <Card style={styles.card} padded={false}>
            <SettingsRow
              icon="user"
              label="Profile"
              onPress={() => router.push('/(drawer)/(tabs)/profile')}
            />
            <SettingsRow
              icon="credit-card"
              label="Wallet"
              onPress={() => router.push('/(drawer)/(tabs)/wallet')}
            />
            <SettingsRow
              icon="lock"
              label="Change password"
              onPress={() => router.push('/(auth)/change-password')}
            />
          </Card>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.tabIconDefault }]}>
          PREFERENCES
        </Text>
        <Card style={[styles.card, { marginBottom: h(12) }]} padded={false}>
          <SettingsRow
            icon="gamepad"
            label="Games to follow"
            value={selectedGameIds.length > 0 ? `${selectedGameIds.length} selected` : 'Not set'}
            onPress={() => router.push('/select-games?from=settings')}
            showArrow={true}
          />
        </Card>
        <Card style={styles.card} padded={false}>
          <SettingsRow
            icon="bell"
            label="Notifications"
            value="On"
            onPress={() => {}}
            showArrow={true}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.tabIconDefault }]}>
          SUPPORT
        </Text>
        <Card style={styles.card} padded={false}>
          <SettingsRow
            icon="question-circle"
            label="Help & FAQ"
            onPress={() => router.push('/help-faq')}
          />
          <SettingsRow
            icon="shield"
            label="Privacy Policy"
            onPress={() => router.push('/privacy-policy')}
          />
          <SettingsRow
            icon="file-text"
            label="Terms of Service"
            onPress={() => router.push('/terms')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.tabIconDefault }]}>
          ABOUT
        </Text>
        <Card style={styles.card} padded={false}>
          <SettingsRow icon="info-circle" label="Version" value="1.0.0" showArrow={false} />
          <SettingsRow
            icon="code"
            label="Environment"
            value={appEnv}
            showArrow={false}
          />
        </Card>
      </View>

      {isAuthenticated && (
        <Button
          title="Log out"
          variant="destructive"
          fullWidth
          onPress={async () => {
            await logout();
            router.replace('/(auth)/login');
          }}
          style={styles.logoutBtn}
        />
      )}
    </Screen>
  );
}
