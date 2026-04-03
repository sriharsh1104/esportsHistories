import { ThemeToggle } from "@/components/ThemeToggle";
import { useColorScheme } from "@/components/useColorScheme";
import { LogoutButton } from "@/components/ui";
import Colors from "@/constants/Colors";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/context/ResponsiveContext";
import { useWallet } from "@/context/WalletContext";
import type { UserBio } from "@/types/auth";
import { isAdminUser, isHostUser } from "@/utils/adminUser";
import { userHasSelectedGames } from "@/utils/gameSelection";
import { getProfileImageUrl } from "@/utils/profileImage";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DrawerActions } from "@react-navigation/native";
import { Redirect, router, useSegments } from "expo-router";
import { Drawer } from "expo-router/drawer";
import React, { useMemo } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MENU_ITEMS_BASE = [
  {
    icon: "home" as const,
    label: "Dashboard",
    routeUser: ROUTES.HOME,
    routeAdmin: ROUTES.ADMIN,
  },
  {
    icon: "user-plus" as const,
    label: "Create accounts",
    route: ROUTES.ADMIN_CREATE_ACCOUNTS,
    adminOnly: true as const,
  },
  {
    icon: "trophy" as const,
    label: "Tournament",
    route: ROUTES.ADMIN_TOURNAMENT,
    adminOnly: true as const,
  },
  {
    icon: "list-alt" as const,
    label: "Lobby Records",
    route: ROUTES.ADMIN_TOURNAMENT_RECORD,
    adminOrHost: true as const,
  },
  { icon: "credit-card" as const, label: "Wallet", route: ROUTES.WALLET },
  { icon: "cog" as const, label: "Settings", route: ROUTES.SETTINGS },
  { icon: "shield" as const, label: "Ban Check", route: ROUTES.BAN_CHECK },
] as const;

function CustomDrawerContent(props: {
  navigation?: any;
  isLockedForGameSelection: boolean;
}) {
  const scheme = useColorScheme() ?? "light";
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const { user, isAuthenticated } = useAuth();
  const { balance, isLoading } = useWallet();
  const insets = useSafeAreaInsets();
  const avatarUri = useMemo(
    () => getProfileImageUrl(user?.profileImage ?? user?.avatarUrl),
    [user?.profileImage, user?.avatarUrl],
  );

  const closeDrawer = () =>
    props.navigation?.dispatch(DrawerActions.closeDrawer());

  const nav = (route: string) => {
    closeDrawer();
    router.push(route as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingHorizontal: w(20),
          paddingTop: Math.max(insets.top, h(12)),
          paddingBottom: h(16),
          backgroundColor: colors.tint + "15",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: w(56),
              height: w(56),
              borderRadius: w(28),
              backgroundColor: colors.tint,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <Text
                style={{ fontSize: w(24), fontWeight: "700", color: "#fff" }}
              >
                {isAuthenticated && user
                  ? user.displayName.charAt(0).toUpperCase()
                  : "?"}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: w(14) }}>
            <Text
              style={{ fontSize: w(18), fontWeight: "700", color: colors.text }}
              numberOfLines={1}
            >
              {isAuthenticated && user ? user.fullName || user.displayName : ""}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: h(6),
              }}
            >
              <FontAwesome name="star" size={w(14)} color={colors.accent} />
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.tint}
                  style={{ marginLeft: w(8) }}
                />
              ) : (
                <Text
                  style={{
                    fontSize: w(13),
                    color: colors.tabIconDefault,
                    marginLeft: w(6),
                  }}
                >
                  ₹{balance.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: h(8), paddingBottom: h(24) }}
      >
        {MENU_ITEMS_BASE.filter((item) => {
          if (!isAuthenticated) return false;
          if (props.isLockedForGameSelection) return false;
          if ("adminOnly" in item && item.adminOnly && !isAdminUser(user))
            return false;
          if (
            "adminOrHost" in item &&
            item.adminOrHost &&
            !isAdminUser(user) &&
            !isHostUser(user)
          )
            return false;
          return true;
        }).map((item) => {
          const route =
            "route" in item
              ? item.route
              : isAdminUser(user)
                ? item.routeAdmin
                : item.routeUser;
          return (
            <Pressable
              key={item.label}
              onPress={() => nav(route)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: h(14),
                paddingHorizontal: w(20),
                backgroundColor: pressed ? colors.border + "40" : "transparent",
              })}
            >
              <FontAwesome
                name={item.icon}
                size={w(20)}
                color={colors.tint}
                style={{ width: w(28), textAlign: "center" }}
              />
              <Text
                style={{
                  fontSize: w(15),
                  fontWeight: "500",
                  color: colors.text,
                  flex: 1,
                }}
              >
                {item.label}
              </Text>
              <FontAwesome
                name="chevron-right"
                size={w(12)}
                color={colors.tabIconDefault}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function DrawerLayout() {
  const colorScheme = useColorScheme();
  const { user, isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const confirmedSelectedGames = Array.isArray(user?.selectedGames)
    ? user.selectedGames
    : [];
  const isLockedForGameSelection =
    !isAdminUser(user) &&
    !isHostUser(user) &&
    !userHasSelectedGames(confirmedSelectedGames);
  const isOnHomeTab = useMemo(() => {
    const [root, tabs] = segments;
    if (root !== "(drawer)" || tabs !== "(tabs)") return false;
    /** `useSegments` typings omit `index` from the leaf union; treat as runtime string. */
    const leaf = segments[2] as string | undefined;
    return leaf == null || leaf === "index";
  }, [segments]);

  function parseBioGenderAge(bio?: UserBio | string): UserBio {
    if (!bio) return {};
    if (typeof bio === "object") return bio;
    try {
      return JSON.parse(bio) as UserBio;
    } catch {
      return {};
    }
  }

  function isProfileComplete(u: typeof user): boolean {
    if (!u) return false;
    const genderAge = parseBioGenderAge(u.bio);
    const hasDob = !!(genderAge.dateOfBirth || genderAge.dob);

    return (
      !!u.fullName?.trim() &&
      !!u.displayName?.trim() &&
      !!u.phone?.trim() &&
      !!genderAge.gender?.trim() &&
      hasDob
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href={ROUTES.LOGIN} />;
  }

  if (!user || (!isAdminUser(user) && !isProfileComplete(user))) {
    return <Redirect href={ROUTES.EDIT_PROFILE_SIGNUP} />;
  }

  if (isLockedForGameSelection && !isOnHomeTab) {
    return <Redirect href={ROUTES.HOME} />;
  }

  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        drawerActiveTintColor: Colors[colorScheme ?? "light"].tint,
        swipeEnabled: !isLockedForGameSelection,
        headerRight: () =>
          isLockedForGameSelection ? null : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemeToggle />
              <LogoutButton />
            </View>
          ),
      }}
      drawerContent={(props) => (
        <CustomDrawerContent
          navigation={props.navigation}
          isLockedForGameSelection={isLockedForGameSelection}
        />
      )}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerLabel: "Dashboard",
          headerShown: false,
          drawerIcon: ({ color }) => (
            <FontAwesome name="home" size={22} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="games"
        options={{
          drawerLabel: "Games",
          title: "Select Games",
          swipeEnabled: !isLockedForGameSelection,
          drawerIcon: ({ color }) => (
            <FontAwesome name="gamepad" size={22} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="admin"
        options={{
          drawerItemStyle: isAdminUser(user) ? undefined : { display: "none" },
          drawerLabel: "Admin",
          title: "Admin",
          swipeEnabled: !isLockedForGameSelection,
          drawerIcon: ({ color }) => (
            <FontAwesome name="sliders" size={22} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="admin-create-accounts"
        options={{
          title: "Create accounts",
          drawerItemStyle: { display: "none" },
          swipeEnabled: !isLockedForGameSelection,
        }}
      />
      <Drawer.Screen
        name="admin-tournament"
        options={{
          title: "Tournament",
          drawerItemStyle: { display: "none" },
          swipeEnabled: !isLockedForGameSelection,
        }}
      />
      <Drawer.Screen
        name="admin-tournament-record"
        options={{
          title: "Lobby Records",
          drawerItemStyle: { display: "none" },
          swipeEnabled: !isLockedForGameSelection,
        }}
      />
    </Drawer>
  );
}
