import { BackButton, Button, Input, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const dispatch = useAppDispatch();
  const { signup } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const styles = useMemo(
    () => ({
      content: { flex: 1, paddingTop: h(48) },
      title: { fontSize: w(28), fontWeight: '700' as const, marginBottom: h(8) },
      subtitle: { fontSize: w(16), marginBottom: h(32) },
      form: { flex: 1 },
      btn: { marginTop: h(8), marginBottom: h(24) },
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
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    dispatch(showLoader());
    try {
      const res = await signup({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        confirmPassword,
      });
      router.push({ pathname: ROUTES.VERIFY_OTP, params: { email: res.email } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signup failed');
    } finally {
      dispatch(hideLoader());
    }
  };

  return (
    <Screen keyboardAvoid padded maxForm>
      <View style={styles.content}>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>Create account</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Join Esports Histories for news and updates
        </Text>

        <View style={styles.form}>
          <Input
            label="Display name"
            placeholder="Your name"
            value={displayName}
            onChangeText={setDisplayName}
            autoComplete="name"
            leftIcon="user"
          />
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
            autoComplete="new-password"
            leftIcon="lock"
            error={error && password ? error : undefined}
          />
          <Input
            label="Confirm password"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secure
            autoComplete="new-password"
            leftIcon="lock"
          />

          <Button
            title="Sign up"
            onPress={handleSubmit}
            fullWidth
            style={styles.btn}
          />

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.tabIconDefault }]}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push(ROUTES.LOGIN)}>
              <Text style={[styles.footerLink, { color: colors.accent }]}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}
