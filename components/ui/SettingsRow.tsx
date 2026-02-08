import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

type SettingsRowProps = {
  icon: keyof typeof FontAwesome.glyphMap;
  label: string;
  onPress?: () => void;
  value?: string;
  showArrow?: boolean;
  destructive?: boolean;
};

export function SettingsRow({
  icon,
  label,
  onPress,
  value,
  showArrow = true,
  destructive = false,
}: SettingsRowProps) {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const textColor = destructive ? '#dc3545' : colors.text;

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: h(14),
        paddingHorizontal: w(16),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <FontAwesome
        name={icon}
        size={w(18)}
        color={destructive ? '#dc3545' : colors.tabIconDefault}
        style={{ marginRight: w(12) }}
      />
      <Text style={{ flex: 1, fontSize: w(16), color: textColor }}>{label}</Text>
      {value && (
        <Text style={{ fontSize: w(14), color: colors.tabIconDefault, marginRight: w(8) }}>
          {value}
        </Text>
      )}
      {showArrow && onPress && (
        <FontAwesome name="chevron-right" size={w(14)} color={colors.tabIconDefault} />
      )}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}
