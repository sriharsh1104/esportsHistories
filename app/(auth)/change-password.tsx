import { BackButton, Button, Input, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import { changePassword } from '@/services/auth.service';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

const MIN_PASSWORD_LENGTH = 6;

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [serverError, setServerError] = useState('');
  const dispatch = useAppDispatch();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const passwordsMatch = newPassword === confirmNewPassword;

  const validateNewPassword = useCallback(
    (v: string) => {
      if (v.length > 0 && v.length < MIN_PASSWORD_LENGTH) {
        return `At least ${MIN_PASSWORD_LENGTH} characters`;
      }
      if (confirmNewPassword.length > 0 && v.length > 0 && v !== confirmNewPassword) {
        return 'New passwords must match';
      }
      return undefined;
    },
    [confirmNewPassword]
  );

  const validateConfirmNewPassword = useCallback(
    (v: string) => {
      if (v.length > 0 && newPassword.length > 0 && v !== newPassword) {
        return 'New passwords must match';
      }
      return undefined;
    },
    [newPassword]
  );

  const canUpdate =
    currentPassword.trim().length > 0 &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    passwordsMatch;

  const styles = useMemo(
    () => ({
      content: { flex: 1, paddingTop: h(48) },
      title: { fontSize: w(28), fontWeight: '700' as const, marginBottom: h(8) },
      subtitle: { fontSize: w(16), marginBottom: h(32) },
      form: { flex: 1 },
      serverErr: { color: '#dc3545', fontSize: w(13), marginBottom: h(8) },
      btn: { marginTop: h(8) },
    }),
    [w, h]
  );

  const handleSubmit = async () => {
    setServerError('');
    if (!canUpdate) return;
    dispatch(showLoader());
    try {
      await changePassword(currentPassword, newPassword);
      router.back();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Change password failed');
    } finally {
      dispatch(hideLoader());
    }
  };

  return (
    <Screen keyboardAvoid padded maxForm>
      <View style={styles.content}>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>Change password</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Enter your current password and choose a new one
        </Text>

        <View style={styles.form}>
          <Input
            label="Current password"
            placeholder="••••••••"
            value={currentPassword}
            onChangeText={(t) => {
              setServerError('');
              setCurrentPassword(t);
            }}
            secure
            autoComplete="password"
            leftIcon="lock"
          />
          <Input
            label="New password"
            placeholder="••••••••"
            value={newPassword}
            onChangeText={(t) => {
              setServerError('');
              setNewPassword(t);
            }}
            secure
            autoComplete="new-password"
            leftIcon="lock"
            validateOnChange={validateNewPassword}
          />
          <Input
            label="Confirm new password"
            placeholder="••••••••"
            value={confirmNewPassword}
            onChangeText={(t) => {
              setServerError('');
              setConfirmNewPassword(t);
            }}
            secure
            autoComplete="new-password"
            leftIcon="lock"
            validateOnChange={validateConfirmNewPassword}
          />

          {!!serverError && <Text style={styles.serverErr}>{serverError}</Text>}

          <Button
            title="Update password"
            onPress={handleSubmit}
            disabled={!canUpdate}
            fullWidth
            style={styles.btn}
          />
        </View>
      </View>
    </Screen>
  );
}
