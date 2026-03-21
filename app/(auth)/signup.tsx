import { BackButton, Button, Input, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import { ApiError } from '@/services/api.service';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

const NAME_REGEX = /^[A-Za-z ]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
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

  const normalizedDisplayName = displayName.trim().replace(/\s+/g, ' ');

  const validateDisplayNameLive = useCallback((v: string) => {
    const n = v.trim().replace(/\s+/g, ' ');
    if (!n) return undefined;
    if (n.length < 2 || n.length > 100) {
      return 'Display name must be between 2 and 100 characters';
    }
    if (!NAME_REGEX.test(n)) {
      return 'Display name can only contain letters and spaces';
    }
    return undefined;
  }, []);

  const validateEmailLive = useCallback((v: string) => {
    const t = v.trim();
    if (!t) return undefined;
    if (!EMAIL_REGEX.test(t)) return 'Enter a valid email address';
    return undefined;
  }, []);

  const validatePasswordLive = useCallback(
    (v: string) => {
      if (v.length > 0 && v.length < 8) {
        return 'Password must be at least 8 characters';
      }
      if (confirmPassword.length > 0 && v.length > 0 && v !== confirmPassword) {
        return 'Passwords do not match';
      }
      return undefined;
    },
    [confirmPassword]
  );

  const validateConfirmPasswordLive = useCallback(
    (v: string) => {
      if (v.length > 0 && password.length > 0 && v !== password) {
        return 'Passwords do not match';
      }
      return undefined;
    },
    [password]
  );

  const handleSubmit = async () => {
    setDisplayNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    if (!normalizedDisplayName) {
      setDisplayNameError('Display name is required');
      return;
    }
    if (normalizedDisplayName.length < 2 || normalizedDisplayName.length > 100) {
      setDisplayNameError('Display name must be between 2 and 100 characters');
      return;
    }
    if (!NAME_REGEX.test(normalizedDisplayName)) {
      setDisplayNameError('Display name can only contain letters and spaces');
      return;
    }
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!password) {
      setPasswordError('Password is required');
      return;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (!confirmPassword) {
      setConfirmPasswordError('Confirm password is required');
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }
    dispatch(showLoader());
    try {
      const res = await signup({
        email: email.trim(),
        password,
        displayName: normalizedDisplayName,
      });
      router.push({ pathname: ROUTES.VERIFY_OTP, params: { email: res.email } });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Signup failed';
      if (e instanceof ApiError && e.response && typeof e.response === 'object') {
        const responseObj = e.response as { errors?: Array<{ field?: string; message?: string }> };
        const firstNameError = responseObj.errors?.find((err) => err.field === 'name' && err.message);
        const firstEmailError = responseObj.errors?.find((err) => err.field === 'email' && err.message);
        if (firstNameError?.message) {
          setDisplayNameError(firstNameError.message);
          return;
        }
        if (firstEmailError?.message) {
          setEmailError(firstEmailError.message);
          return;
        }
      }
      if (/name/i.test(message)) {
        setDisplayNameError(message);
      } else {
        setEmailError(message);
      }
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
            onChangeText={(t) => {
              setDisplayNameError('');
              setDisplayName(t);
            }}
            autoComplete="name"
            leftIcon="user"
            error={displayNameError || undefined}
            validateOnChange={validateDisplayNameLive}
          />
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={(t) => {
              setEmailError('');
              setEmail(t);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon="envelope"
            error={emailError || undefined}
            validateOnChange={validateEmailLive}
          />
          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={(t) => {
              setPasswordError('');
              setPassword(t);
            }}
            secure
            autoComplete="password"
            leftIcon="lock"
            error={passwordError || undefined}
            validateOnChange={validatePasswordLive}
          />
          <Input
            label="Confirm password"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPasswordError('');
              setConfirmPassword(t);
            }}
            secure
            autoComplete="password"
            leftIcon="lock"
            error={confirmPasswordError || undefined}
            validateOnChange={validateConfirmPasswordLive}
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
