import { WalletSection } from '@/components/dashboard';
import { Button, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { ROUTES } from '@/constants/routes';
import { router } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

export default function WalletScreen() {
  const { isAuthenticated } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  if (!isAuthenticated) {
    return (
      <Screen padded maxForm>
        <View style={{ flex: 1, justifyContent: 'center', paddingTop: h(48) }}>
          <Text style={{ fontSize: w(24), fontWeight: '700', color: colors.text, marginBottom: h(8) }}>
            Wallet
          </Text>
          <Text style={{ fontSize: w(16), color: colors.tabIconDefault, marginBottom: h(24) }}>
            Sign in to access your wallet
          </Text>
          <Button
            title="Sign in"
            onPress={() => router.push(ROUTES.LOGIN)}
            fullWidth
            style={{ maxWidth: w(200) }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded maxForm>
      <View style={{ paddingTop: h(16), paddingBottom: h(24) }}>
        <Text style={{ fontSize: w(24), fontWeight: '700', color: colors.text, marginBottom: h(4) }}>
          Wallet
        </Text>
        <Text style={{ fontSize: w(16), color: colors.tabIconDefault }}>
          Top up or withdraw funds
        </Text>
      </View>

      <WalletSection />
    </Screen>
  );
}
