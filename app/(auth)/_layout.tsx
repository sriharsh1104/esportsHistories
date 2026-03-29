import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { isAdminUser } from '@/utils/adminUser';
import { Redirect, Stack, useSegments } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function AuthLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  const isChangePassword = segments.includes('change-password');
  if (isAuthenticated && !isChangePassword) {
    return <Redirect href={isAdminUser(user) ? ROUTES.ADMIN : ROUTES.HOME} />;
  }

  if (!isAuthenticated && isChangePassword) {
    return <Redirect href={ROUTES.LOGIN} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="change-password" />
    </Stack>
  );
}
