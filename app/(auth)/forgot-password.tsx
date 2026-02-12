import { BackButton, Button, Input, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useResponsive } from '@/context/ResponsiveContext';
import { requestPasswordReset } from '@/services/auth.service';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const dispatch = useAppDispatch();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const styles = useMemo(
    () => ({
      content: { flex: 1, paddingTop: h(48) },
      title: { fontSize: w(28), fontWeight: '700' as const, marginBottom: h(8) },
      subtitle: { fontSize: w(16), marginBottom: h(32) },
      form: { flex: 1 },
      btn: { marginBottom: h(24) },
      backLink: { fontSize: w(14), textAlign: 'center' as const },
    }),
    [w, h]
  );

  const handleSubmit = async () => {
    setError('');
    setSuccess(false);
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    dispatch(showLoader());
    try {
      await requestPasswordReset(email.trim());
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      dispatch(hideLoader());
    }
  };

  if (success) {
    return (
      <Screen padded maxForm>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Check your email</Text>
          <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
            We've sent a password reset link to {email}
          </Text>
          <Button
            title="Back to sign in"
            onPress={() => router.replace(ROUTES.LOGIN)}
            fullWidth
            style={styles.btn}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen keyboardAvoid padded maxForm>
      <View style={styles.content}>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>Forgot password?</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Enter your email and we'll send a reset link
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
            error={error}
          />

          <Button
            title="Send reset link"
            onPress={handleSubmit}
            fullWidth
            style={styles.btn}
          />

          <Pressable onPress={() => router.push(ROUTES.LOGIN)}>
            <Text style={[styles.backLink, { color: colors.accent }]}>
              Back to sign in
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
