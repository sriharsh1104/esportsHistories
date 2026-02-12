import { BackButton, Button, CustomPhoneInput, Input, Screen } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

export default function EditProfileScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState('');
  const dispatch = useAppDispatch();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setUpiId(user.upiId || '');
    }
  }, [user]);

  const styles = useMemo(
    () => ({
      content: { flex: 1, paddingTop: h(48) },
      title: { fontSize: w(28), fontWeight: '700' as const, marginBottom: h(8) },
      subtitle: { fontSize: w(16), marginBottom: h(32) },
      form: { flex: 1 },
      btn: { marginTop: h(24) },
    }),
    [w, h, colors]
  );

  const handleSubmit = async () => {
    setError('');
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    dispatch(showLoader());
    try {
      await updateProfile({
        displayName: displayName.trim(),
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        upiId: upiId.trim() || undefined,
        ...(from === 'signup' && { onboardingStep: 'games' as const }),
      });
      if (from === 'signup') {
        router.replace(ROUTES.SELECT_GAMES_ONBOARDING);
      } else {
        router.back();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      dispatch(hideLoader());
    }
  };

  if (!user) return null;

  return (
    <Screen keyboardAvoid padded maxForm>
      <View style={styles.content}>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Update your profile information
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Input
            label="Display name"
            placeholder="Username / handle"
            value={displayName}
            onChangeText={setDisplayName}
            leftIcon="user"
            error={error}
          />
          <Input
            label="Full name"
            placeholder="Your full name (optional)"
            value={fullName}
            onChangeText={setFullName}
            leftIcon="pencil"
          />
          <CustomPhoneInput
            label="Phone number"
            placeholder="+91 9876543210"
            value={phone}
            onChangeText={setPhone}
          />
          <Input
            label="UPI ID"
            placeholder="user@upi"
            value={upiId}
            onChangeText={setUpiId}
            autoCapitalize="none"
            leftIcon="credit-card"
          />

          <Button
            title="Save changes"
            onPress={handleSubmit}
            fullWidth
            style={styles.btn}
          />
        </ScrollView>
      </View>
    </Screen>
  );
}
