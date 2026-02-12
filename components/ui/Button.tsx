import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import React from 'react';
import { Pressable, Text, TextStyle, ViewStyle } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const getBgColor = () => {
    if (disabled) return colors.tabIconDefault;
    switch (variant) {
      case 'primary':
        return colors.tint;
      case 'secondary':
        return scheme === 'dark' ? '#2D2A36' : '#F5F3FF';
      case 'outline':
      case 'ghost':
        return 'transparent';
      case 'destructive':
        return '#dc3545';
      default:
        return colors.tint;
    }
  };

  const getTextColor = () => {
    if (disabled) return scheme === 'dark' ? '#888' : '#999';
    if (variant === 'outline' || variant === 'ghost') return colors.tint;
    return variant === 'primary' || variant === 'destructive' ? '#fff' : colors.text;
  };

  const getBorderStyle = () => {
    if (variant === 'outline') {
      return { borderWidth: 2, borderColor: colors.tint };
    }
    return {};
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: w(8),
          paddingVertical: h(14),
          paddingHorizontal: w(24),
          borderRadius: w(12),
          minHeight: h(48),
          backgroundColor: getBgColor(),
          opacity: pressed ? 0.8 : 1,
          width: fullWidth ? '100%' : undefined,
          ...getBorderStyle(),
        },
        style,
      ]}
    >
      {leftIcon}
      <Text style={[{ fontSize: w(16), fontWeight: '600', color: getTextColor() }, textStyle]}>
        {title}
      </Text>
      {rightIcon}
    </Pressable>
  );
}
