import { Card } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import { useWallet } from '@/context/WalletContext';
import { ROUTES } from '@/constants/routes';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

export function WalletBalanceCard() {
  const { balance, isLoading } = useWallet();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const styles = useMemo(
    () => ({
      card: { padding: w(20) },
      row: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
      },
      icon: { marginRight: w(12) },
      balanceLabel: { fontSize: w(14) },
      balanceValue: { fontSize: w(24), fontWeight: '700' as const },
    }),
    [w, h]
  );

  return (
    <Pressable onPress={() => router.push(ROUTES.WALLET)}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <FontAwesome
            name="credit-card"
            size={w(24)}
            color={colors.tint}
            style={styles.icon}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.balanceLabel, { color: colors.tabIconDefault }]}>
              Wallet Balance
            </Text>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Text style={[styles.balanceValue, { color: colors.text }]}>
                ₹{balance.toFixed(2)}
              </Text>
            )}
          </View>
          <FontAwesome name="chevron-right" size={w(16)} color={colors.tabIconDefault} />
        </View>
      </Card>
    </Pressable>
  );
}
