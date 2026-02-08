import { Button, Input, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const styles = useMemo(
    () => ({
      content: { flex: 1, paddingTop: h(48) },
      title: { fontSize: w(28), fontWeight: '700' as const, marginBottom: h(8) },
      subtitle: { fontSize: w(16), marginBottom: h(32) },
      form: { flex: 1 },
      forgotLink: { fontSize: w(14), alignSelf: 'flex-end' as const, marginBottom: h(24) },
      btn: { marginBottom: h(24) },
      footer: {
        flexDirection: 'row' as const,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      },
      footerText: { fontSize: w(14) },
      footerLink: { fontSize: w(14), fontWeight: '600' as const },
    }),
    [w, h]
  );

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      router.replace('/(drawer)/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboardAvoid padded maxForm>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Sign in to continue to Esports Histories
        </Text>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon="envelope"
            error={error && !password ? error : undefined}
          />
          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secure
            autoComplete="password"
            leftIcon="lock"
            error={error && password ? error : undefined}
          />

          <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={[styles.forgotLink, { color: colors.accent }]}>
              Forgot password?
            </Text>
          </Pressable>

          <Button
            title="Sign in"
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            style={styles.btn}
          />

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.tabIconDefault }]}>
              Don't have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/signup')}>
              <Text style={[styles.footerLink, { color: colors.accent }]}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}
