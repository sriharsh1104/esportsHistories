import { Button, Card, Screen, SettingsRow } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useSelectedGames } from '@/context/SelectedGamesContext';
import { useResponsive } from '@/context/ResponsiveContext';
import type { ThemePreference } from '@/context/ThemeContext';
import { useTheme } from '@/context/ThemeContext';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System (Device)' },
];

export default function SettingsScreen() {
  const { isAuthenticated, logout } = useAuth();
  const { selectedGameIds } = useSelectedGames();
  const { theme, setTheme } = useTheme();
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
        <Card style={[styles.card, { overflow: 'visible' as const }]}>
          <Text
            style={{
              fontSize: w(14),
              fontWeight: '600',
              color: colors.text,
              marginBottom: h(10),
              paddingTop: 2,
              lineHeight: w(20),
            }}
          >
            Theme
          </Text>
          <View style={{ flexDirection: 'row', gap: w(6), flexWrap: 'wrap' }}>
            {THEME_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => setTheme(opt.id)}
                style={{
                  paddingVertical: h(6),
                  paddingHorizontal: w(12),
                  borderRadius: w(16),
                  backgroundColor: theme === opt.id ? colors.tint : colors.border + '40',
                }}
              >
                <Text
                  style={{
                    fontSize: w(12),
                    fontWeight: '500',
                    color: theme === opt.id ? '#fff' : colors.text,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ fontSize: w(11), color: colors.tabIconDefault, marginTop: h(6) }}>
            System follows your device dark/light mode
          </Text>
        </Card>
        <Card style={[styles.card, { marginTop: h(12) }]} padded={false}>
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
            onPress={() => {}}
          />
          <SettingsRow
            icon="shield"
            label="Privacy Policy"
            onPress={() => {}}
          />
          <SettingsRow
            icon="file-text"
            label="Terms of Service"
            onPress={() => {}}
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
