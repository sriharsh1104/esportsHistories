import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/ui";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/context/ResponsiveContext";
import { isAdminUser, isHostUser } from "@/utils/adminUser";
import { userHasSelectedGames } from "@/utils/gameSelection";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Tabs } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  const { w } = useResponsive();
  return <FontAwesome size={w(24)} style={{ marginBottom: -4 }} {...props} />;
}

function DrawerToggle() {
  const navigation = useNavigation();
  const { w } = useResponsive();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <Pressable
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      style={({ pressed }) => ({
        padding: w(8),
        marginLeft: w(8),
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <FontAwesome name="bars" size={w(22)} color={colors.text} />
    </Pressable>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { w } = useResponsive();
  const { user } = useAuth();
  const confirmedSelectedGames = Array.isArray(user?.selectedGames)
    ? user.selectedGames
    : [];
  /** Must match `app/(drawer)/_layout.tsx` — hosts skip game pick but still need drawer + tabs. */
  const isLockedForGameSelection =
    !isAdminUser(user) &&
    !isHostUser(user) &&
    !userHasSelectedGames(confirmedSelectedGames);

  const tabsUnlocked = !isLockedForGameSelection;
  /** Bottom bar: Tournament → Wallet → Dashboard → Settings; hosts also get Lobby after Tournament. */
  const showMainTabsInBar = tabsUnlocked;
  const showLobbyTab = showMainTabsInBar && isHostUser(user);

  return (
    <Tabs
      initialRouteName={
        isLockedForGameSelection
          ? "index"
          : isHostUser(user)
            ? "lobby"
            : "index"
      }
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: true,
        headerLeft: () => (isLockedForGameSelection ? null : <DrawerToggle />),
        headerRight: () =>
          isLockedForGameSelection ? null : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemeToggle />
              <LogoutButton />
            </View>
          ),
        tabBarShowLabel: false,
        tabBarStyle: isLockedForGameSelection
          ? { display: "none" }
          : { paddingHorizontal: w(16) },
        tabBarItemStyle: { flex: 1 },
      }}
    >
      <Tabs.Screen
        name="tournament"
        options={{
          title: "Tournament",
          href: isLockedForGameSelection ? null : undefined,
          tabBarIcon: ({ color }) => <TabBarIcon name="trophy" color={color} />,
        }}
      />
      <Tabs.Screen
        name="lobby"
        options={{
          title: "Lobby",
          href: showLobbyTab ? undefined : null,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="list-alt" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          href: showMainTabsInBar ? undefined : null,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="credit-card" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: isLockedForGameSelection ? "Game Selection" : "Dashboard",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="th-large" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          href: showMainTabsInBar ? undefined : null,
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "Shop",
          href: null,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="shopping-bag" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="follow"
        options={{
          title: "Follow",
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin-dashboard"
        options={{
          title: "Admin",
          href:
            !isLockedForGameSelection && isAdminUser(user) ? undefined : null,
          tabBarIcon: ({ color }) => <TabBarIcon name="shield" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          href: null,
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
      <Tabs.Screen
        name="game"
        options={{
          title: "Games",
          href: null,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="gamepad" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
