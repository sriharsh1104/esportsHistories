import { BackButton, Button, Input, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

export default function EditProfileScreen() {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
    [w, h]
  );

  const handleSubmit = async () => {
    setError('');
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    setLoading(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        upiId: upiId.trim() || undefined,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setLoading(false);
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

        <View style={styles.form}>
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
          <Input
            label="Phone number"
            placeholder="+91 9876543210"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            leftIcon="phone"
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
            loading={loading}
            fullWidth
            style={styles.btn}
          />
        </View>
      </View>
    </Screen>
  );
}
