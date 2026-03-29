import { BackButton, Button, Input, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import { isAdminUser } from '@/utils/adminUser';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(60);
  const dispatch = useAppDispatch();
  const { verifyOtp, resendOtp } = useAuth();
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

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const handleSubmit = async () => {
    setError('');
    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    dispatch(showLoader());
    try {
      const u = await verifyOtp(email!, otp);
      if (isAdminUser(u)) {
        router.replace(ROUTES.ADMIN);
      } else if (u.onboardingStep === 'profile') {
        router.replace(ROUTES.EDIT_PROFILE_SIGNUP);
      } else if (u.onboardingStep === 'games') {
        router.replace(ROUTES.SELECT_GAMES_ONBOARDING);
      } else {
        router.replace(ROUTES.HOME);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0) return;
    dispatch(showLoader());
    try {
      await resendOtp(email!);
      setSecondsLeft(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resend failed');
    } finally {
      dispatch(hideLoader());
    }
  };

  return (
    <Screen keyboardAvoid padded maxForm>
      <View style={styles.content}>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>Verify Email</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Enter the 6-digit code sent to {email}
        </Text>

        <View style={styles.form}>
          <Input
            label="OTP Code"
            placeholder="000000"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            leftIcon="lock"
            error={error}
          />

          <Button
            title="Verify"
            onPress={handleSubmit}
            fullWidth
            style={styles.btn}
          />

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.tabIconDefault }]}>
              Didn't receive code?{' '}
            </Text>
            <Pressable onPress={handleResend} disabled={secondsLeft > 0}>
              <Text
                style={[
                  styles.footerLink,
                  { color: secondsLeft > 0 ? colors.tabIconDefault : colors.accent },
                ]}
              >
                {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}
