import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { ROUTES } from '@/constants/routes';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';

export function LogoutButton() {
  const { isAuthenticated, logout } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const { w } = useResponsive();
  const colors = Colors[scheme];

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    await logout();
    router.replace(ROUTES.LOGIN);
  };

  return (
    <Pressable
      onPress={handleLogout}
      style={({ pressed }) => ({
        padding: w(8),
        marginRight: w(8),
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <FontAwesome name="sign-out" size={w(22)} color={colors.text} />
    </Pressable>
  );
}
