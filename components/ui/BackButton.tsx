import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

type BackButtonProps = {
  /** Use in toolbars (e.g. next to Submit) where bottom margin would misalign the row. */
  compact?: boolean;
};

export function BackButton({ compact = false }: BackButtonProps) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{
        padding: w(8),
        marginLeft: -w(8),
        marginBottom: compact ? 0 : h(8),
      }}
    >
      <FontAwesome name="arrow-left" size={w(22)} color={colors.text} />
    </TouchableOpacity>
  );
}
