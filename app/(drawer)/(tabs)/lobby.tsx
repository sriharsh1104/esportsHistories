import { HostLobbyRecords } from "@/components/host/HostLobbyRecords";
import { Screen } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { isHostUser } from "@/utils/adminUser";
import { Redirect } from "expo-router";
import React from "react";

/** Host-only tab: lobby applications, assigned slots, room details (split from Tournament). */
export default function LobbyTabScreen() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href={ROUTES.LOGIN} />;
  }

  if (!isHostUser(user)) {
    return <Redirect href={ROUTES.TOURNAMENT} />;
  }

  return (
    <Screen scroll={false} keyboardAvoid padded maxContent>
      <HostLobbyRecords />
    </Screen>
  );
}
