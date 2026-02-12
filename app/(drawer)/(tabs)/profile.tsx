import { Button, Card, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const styles = useMemo(
    () => ({
      centered: {
        flex: 1,
        justifyContent: 'center' as const,
        paddingTop: h(48),
      },
      title: { fontSize: w(24), fontWeight: '700' as const, marginBottom: h(8) },
      subtitle: { fontSize: w(16), marginBottom: h(24) },
      btn: { maxWidth: w(200) },
      header: { alignItems: 'center' as const, paddingVertical: h(32) },
      avatar: {
        width: w(80),
        height: w(80),
        borderRadius: w(40),
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        marginBottom: h(16),
        position: 'relative' as const,
      },
      avatarText: { fontSize: w(32), fontWeight: '700' as const, color: '#fff' },
      editPhotoBadge: {
        position: 'absolute' as const,
        bottom: 0,
        right: 0,
        width: w(28),
        height: w(28),
        borderRadius: w(14),
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      name: { fontSize: w(22), fontWeight: '600' as const, marginBottom: h(4) },
      email: { fontSize: w(14) },
      section: { flex: 1 },
      infoCard: { marginBottom: h(16) },
      infoRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        paddingVertical: h(12),
        paddingHorizontal: w(16),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.15)',
      },
      infoLabel: { fontSize: w(14) },
      infoValue: { fontSize: w(14), fontWeight: '500' as const },
      card: { marginTop: h(16), marginBottom: h(16) },
      cardTitle: { fontSize: w(16), fontWeight: '600' as const, marginBottom: h(4) },
      cardDesc: { fontSize: w(14) },
      logoutBtn: { marginTop: h(24) },
    }),
    [w, h]
  );

  if (!isAuthenticated || !user) {
    return (
      <Screen padded maxForm>
        <View style={styles.centered}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
          <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
            Sign in to view your profile
          </Text>
          <Button
            title="Sign in"
            onPress={() => router.push(ROUTES.LOGIN)}
            fullWidth
            style={styles.btn}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded maxForm>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push(ROUTES.EDIT_PROFILE)}
          style={[styles.avatar, { backgroundColor: colors.tint }]}
        >
          <Text style={styles.avatarText}>
            {user.displayName.charAt(0).toUpperCase()}
          </Text>
          <View style={styles.editPhotoBadge}>
            <FontAwesome name="camera" size={w(12)} color="#fff" />
          </View>
        </Pressable>
        <Text style={[styles.name, { color: colors.text }]}>
          {user.fullName || user.displayName}
        </Text>
        {user.fullName && (
          <Text style={[styles.email, { color: colors.tabIconDefault }]}>
            @{user.displayName}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Card style={styles.infoCard} padded={false}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Phone</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user.phone || '—'}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Email</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{user.email}</Text>
          </View>
        </Card>

        <Card
          onPress={() => router.push(ROUTES.EDIT_PROFILE)}
          style={styles.card}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Edit Profile
          </Text>
          <Text style={[styles.cardDesc, { color: colors.tabIconDefault }]}>
            Update name, phone, UPI
          </Text>
        </Card>

        <Card
          onPress={() => router.push(ROUTES.GAME_PROFILES)}
          style={[styles.card, { marginTop: 0 }]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Game Profiles
          </Text>
          <Text style={[styles.cardDesc, { color: colors.tabIconDefault }]}>
            Add in-game names and UIDs for your followed games
          </Text>
        </Card>

        <Card
          onPress={() => router.push(ROUTES.ADDRESSES)}
          style={[styles.card, { marginTop: 0 }]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Addresses
          </Text>
          <Text style={[styles.cardDesc, { color: colors.tabIconDefault }]}>
            Add delivery addresses, use current location
          </Text>
        </Card>

        <Card
          onPress={() => router.push(ROUTES.CHANGE_PASSWORD)}
          style={[styles.card, { marginTop: 0 }]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Change password
          </Text>
          <Text style={[styles.cardDesc, { color: colors.tabIconDefault }]}>
            Update your account password
          </Text>
        </Card>

        <Button
          title="Sign out"
          variant="destructive"
          fullWidth
          onPress={async () => {
            await logout();
            router.replace(ROUTES.LOGIN);
          }}
          style={styles.logoutBtn}
        />
      </View>
    </Screen>
  );
}
