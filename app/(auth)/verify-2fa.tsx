import { BackButton, Button, Input, Screen } from "@/components/ui";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/context/ResponsiveContext";
import { useAppDispatch } from "@/store/hooks";
import { hideLoader, showLoader } from "@/store/slices/loaderSlice";
import type { UserBio } from "@/types/auth";
import { isAdminUser } from "@/utils/adminUser";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
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

export default function Verify2faScreen() {
  const { email, twoFactorToken } = useLocalSearchParams<{
    email: string;
    twoFactorToken: string;
  }>();
  const [code, setCode] = useState("");
  const dispatch = useAppDispatch();
  const { verifyLogin2fa, refreshUser } = useAuth();
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
      btn: { marginTop: h(8), marginBottom: h(24) },
    }),
    [w, h],
  );

  const handleSubmit = async () => {
    if (!twoFactorToken?.trim()) {
      Toast.show({
        type: "error",
        text1: "2FA session expired. Please login again.",
      });
      router.replace(ROUTES.LOGIN);
      return;
    }
    const trimmed = code.trim();
    if (!trimmed || trimmed.length < 6) {
      Toast.show({ type: "error", text1: "Please enter the 6-digit code" });
      return;
    }
    dispatch(showLoader());
    try {
      const loggedInUser = await verifyLogin2fa({
        twoFactorToken,
        code: trimmed,
      });
      const user = await refreshUser().catch(() => loggedInUser);
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
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "2FA verification failed";
      Toast.show({ type: "error", text1: message });
    } finally {
      dispatch(hideLoader());
    }
  };

  return (
    <Screen keyboardAvoid padded maxForm>
      <View style={styles.content}>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>
          Two-factor verification
        </Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Enter the 6-digit code from your authenticator app
          {email ? ` for ${email}` : ""}.
        </Text>

        <View style={styles.form}>
          <Input
            label="Authentication code"
            placeholder="000000"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            leftIcon="shield"
          />
          <Button
            title="Verify"
            onPress={handleSubmit}
            fullWidth
            style={styles.btn}
          />
        </View>
      </View>
    </Screen>
  );
}
