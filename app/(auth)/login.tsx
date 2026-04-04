import { Button, Input, Screen } from "@/components/ui";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/context/ResponsiveContext";
import { ApiError } from "@/services/api.service";
import { useAppDispatch } from "@/store/hooks";
import { hideLoader, showLoader } from "@/store/slices/loaderSlice";
import type { UserBio } from "@/types/auth";
import { isAdminUser } from "@/utils/adminUser";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";

function parseBioGenderAge(bio?: UserBio | string): UserBio {
  if (!bio) return {};
  if (typeof bio === "object") return bio;
  try {
    const parsed = JSON.parse(bio) as UserBio;
    return parsed;
  } catch {
    return {};
  }
}

function isProfileComplete(user: any | null | undefined): boolean {
  if (!user) return false;

  const genderAge = parseBioGenderAge(user.bio);
  const hasDob = !!(genderAge.dateOfBirth || genderAge.dob);

  return (
    !!user.fullName?.trim() &&
    !!user.displayName?.trim() &&
    !!user.phone?.trim() &&
    !!genderAge.gender?.trim() &&
    hasDob
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useAppDispatch();
  const { login, refreshUser } = useAuth();
  const scheme = useColorScheme() ?? "light";
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const styles = useMemo(
    () => ({
      content: { flex: 1, paddingTop: h(48) },
      title: {
        fontSize: w(28),
        fontWeight: "700" as const,
        marginBottom: h(8),
      },
      subtitle: { fontSize: w(16), marginBottom: h(32) },
      form: { flex: 1 },
      forgotLink: {
        fontSize: w(14),
        alignSelf: "flex-end" as const,
        marginBottom: h(24),
      },
      btn: { marginBottom: h(24) },
      footer: {
        flexDirection: "row" as const,
        justifyContent: "center" as const,
        alignItems: "center" as const,
      },
      footerText: { fontSize: w(14) },
      footerLink: { fontSize: w(14), fontWeight: "600" as const },
    }),
    [w, h],
  );

  const handleSubmit = async () => {
    if (!email.trim()) {
      Toast.show({ type: "error", text1: "Email is required" });
      return;
    }
    if (!password) {
      Toast.show({ type: "error", text1: "Password is required" });
      return;
    }
    dispatch(showLoader());
    try {
      const res = await login({ email: email.trim(), password });
      if (res.kind === "2fa_required") {
        router.push({
          pathname: ROUTES.VERIFY_2FA,
          params: { email: res.email, twoFactorToken: res.twoFactorToken },
        });
        return;
      }

      const user = await refreshUser().catch(() => res.user);
      if (isAdminUser(user)) {
        router.replace(ROUTES.ADMIN);
        return;
      }
      const complete = isProfileComplete(user);

      if (!complete) {
        router.replace(ROUTES.EDIT_PROFILE_SIGNUP);
        return;
      }

      router.replace(ROUTES.HOME);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error && error.message
            ? error.message
            : "Login failed. Please try again.";
      Toast.show({ type: "error", text1: message });
    } finally {
      dispatch(hideLoader());
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
          />
          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secure
            autoComplete="password"
            leftIcon="lock"
          />

          <Pressable onPress={() => router.push(ROUTES.FORGOT_PASSWORD)}>
            <Text style={[styles.forgotLink, { color: colors.accent }]}>
              Forgot password?
            </Text>
          </Pressable>

          <Button
            title="Sign in"
            onPress={handleSubmit}
            fullWidth
            style={styles.btn}
          />

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.tabIconDefault }]}>
              Don't have an account?{" "}
            </Text>
            <Pressable onPress={() => router.push(ROUTES.SIGNUP)}>
              <Text style={[styles.footerLink, { color: colors.accent }]}>
                Sign up
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}
