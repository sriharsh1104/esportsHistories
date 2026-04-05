import { Button, ClassicEmptyState, Screen } from "@/components/ui";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/context/ResponsiveContext";
import { joinSpecialTournamentAsTeammate } from "@/services/tournament.service";
import { useAppDispatch } from "@/store/hooks";
import { hideLoader, showLoader } from "@/store/slices/loaderSlice";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";
import Toast from "react-native-toast-message";

function firstQuery(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return String(v[0] ?? "").trim();
  return String(v ?? "").trim();
}

export default function SpecialTeamInviteScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { w, h } = useResponsive();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const params = useLocalSearchParams<{
    tournamentId?: string | string[];
    invite?: string | string[];
  }>();
  const tournamentId = firstQuery(params.tournamentId);
  const invite = firstQuery(params.invite);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = Boolean(
    tournamentId && invite && isAuthenticated && !submitting,
  );

  const onJoinTeam = useCallback(async () => {
    if (!tournamentId || !invite) return;
    setSubmitting(true);
    dispatch(showLoader());
    try {
      await joinSpecialTournamentAsTeammate(tournamentId, invite);
      Toast.show({
        type: "success",
        text1: "You joined the team",
      });
      router.replace(ROUTES.TOURNAMENT);
    } catch {
      /* api surfaces toast */
    } finally {
      dispatch(hideLoader());
      setSubmitting(false);
    }
  }, [dispatch, invite, tournamentId]);

  const body = useMemo(() => {
    if (authLoading) {
      return (
        <ClassicEmptyState
          variant="info"
          title="Loading…"
          message="Checking your session."
        />
      );
    }
    if (!tournamentId || !invite) {
      return (
        <ClassicEmptyState
          variant="error"
          title="Invalid invite"
          message="This link is missing tournament or invite details. Ask your leader for a new link."
        />
      );
    }
    if (!isAuthenticated) {
      return (
        <ClassicEmptyState
          variant="info"
          title="Sign in required"
          message="Log in, then open this link again to join the team."
        >
          <Button
            title="Sign in"
            onPress={() => router.push(ROUTES.LOGIN)}
            fullWidth
          />
        </ClassicEmptyState>
      );
    }
    return (
      <View>
        <Text
          style={{
            fontSize: w(16),
            fontWeight: "700",
            color: colors.text,
            marginBottom: h(8),
          }}
        >
          Join team
        </Text>
        <Text
          style={{
            fontSize: w(13),
            color: colors.tabIconDefault,
            marginBottom: h(16),
            lineHeight: w(20),
          }}
        >
          You are joining a squad for special tournament{" "}
          <Text style={{ color: colors.text, fontWeight: "600" }}>
            {tournamentId.length > 12
              ? `${tournamentId.slice(0, 8)}…`
              : tournamentId}
          </Text>
          . Confirm only if you trust the leader who sent this link.
        </Text>
        <Button
          title={submitting ? "Joining…" : "Confirm join team"}
          onPress={() => void onJoinTeam()}
          disabled={!canSubmit}
          fullWidth
        />
        <Button
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
          fullWidth
          style={{ marginTop: h(10) }}
        />
      </View>
    );
  }, [
    authLoading,
    canSubmit,
    colors.tabIconDefault,
    colors.text,
    h,
    invite,
    isAuthenticated,
    onJoinTeam,
    submitting,
    tournamentId,
    w,
  ]);

  return (
    <Screen padded maxForm>
      <View style={{ paddingTop: h(24), flex: 1 }}>{body}</View>
    </Screen>
  );
}
