import { Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Text, View } from 'react-native';

export default function GamesIndexScreen() {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  return (
    <Screen padded>
      <View style={{ paddingTop: h(24), alignItems: 'center' }}>
        <FontAwesome
          name="gamepad"
          size={w(48)}
          color={colors.tabIconDefault}
          style={{ marginBottom: h(16) }}
        />
        <Text
          style={{
            fontSize: w(18),
            fontWeight: '600',
            color: colors.text,
            textAlign: 'center',
            marginBottom: h(8),
          }}
        >
          Select a game
        </Text>
        <Text
          style={{
            fontSize: w(14),
            color: colors.tabIconDefault,
            textAlign: 'center',
          }}
        >
          Open the menu and choose a game from Mobile or PC
        </Text>
      </View>
    </Screen>
  );
}
