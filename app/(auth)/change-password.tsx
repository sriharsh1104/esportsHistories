import { BackButton, Button, Input, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import { changePassword } from '@/services/auth.service';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const styles = useMemo(
    () => ({
      content: { flex: 1, paddingTop: h(48) },
      title: { fontSize: w(28), fontWeight: '700' as const, marginBottom: h(8) },
      subtitle: { fontSize: w(16), marginBottom: h(32) },
      form: { flex: 1 },
      btn: { marginTop: h(8) },
    }),
    [w, h]
  );

  const handleSubmit = async () => {
    setError('');
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    if (!newPassword) {
      setError('New password is required');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Change password failed');
    } finally {
      setLoading(false);
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
            onChangeText={setCurrentPassword}
            secure
            autoComplete="password"
            leftIcon="lock"
            error={error && !newPassword ? error : undefined}
          />
          <Input
            label="New password"
            placeholder="••••••••"
            value={newPassword}
            onChangeText={setNewPassword}
            secure
            autoComplete="new-password"
            leftIcon="lock"
            error={error && newPassword ? error : undefined}
          />
          <Input
            label="Confirm new password"
            placeholder="••••••••"
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            secure
            autoComplete="new-password"
            leftIcon="lock"
          />

          <Button
            title="Update password"
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            style={styles.btn}
          />
        </View>
      </View>
    </Screen>
  );
}
