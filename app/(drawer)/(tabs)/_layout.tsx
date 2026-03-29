import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/ui";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { useFollowHub } from "@/context/FollowHubContext";
import { useResponsive } from "@/context/ResponsiveContext";
import { useSelectedGames } from "@/context/SelectedGamesContext";
import { isAdminUser } from "@/utils/adminUser";
import { userHasSelectedGames } from "@/utils/gameSelection";
import { tabIconForGameId } from "@/utils/gameTabIcon";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
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

function FollowTabBarButton(props: BottomTabBarButtonProps) {
  const { accessibilityState, style, onLongPress } = props;
  const { openFollowHub } = useFollowHub();
  const { selectedGameIds } = useSelectedGames();
  const { w } = useResponsive();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const focused = accessibilityState?.selected;
  const tint = focused ? colors.tabIconSelected : colors.tabIconDefault;
  const firstId = selectedGameIds[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add or manage follows"
      accessibilityState={accessibilityState}
      onPress={() => openFollowHub()}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        style,
        {
          opacity: pressed ? 0.8 : 1,
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
        },
      ]}
    >
      {firstId ? (
        <FontAwesome
          name={tabIconForGameId(firstId)}
          size={w(24)}
          color={tint}
          style={{ marginBottom: -4 }}
        />
      ) : (
        <FontAwesome
          name="plus-circle"
          size={w(24)}
          color={tint}
          style={{ marginBottom: -4 }}
        />
      )}
    </Pressable>
  );
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
  const confirmedSelectedGames = Array.isArray(user?.selectedGames) ? user.selectedGames : [];
  const isLockedForGameSelection =
    !isAdminUser(user) && !userHasSelectedGames(confirmedSelectedGames);

  return (
    <Tabs
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
        tabBarStyle: isLockedForGameSelection ? { display: 'none' } : { paddingHorizontal: w(16) },
        tabBarItemStyle: { flex: 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isLockedForGameSelection ? "Game Selection" : "News",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="newspaper-o" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "Shop",
          href: isLockedForGameSelection ? null : undefined,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="shopping-bag" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="follow"
        options={{
          title: "Follow",
          tabBarButton: (p) => <FollowTabBarButton {...p} />,
        }}
      />
      <Tabs.Screen
        name="tournament"
        options={{
          title: "Tournament",
          href: isLockedForGameSelection ? null : undefined,
          tabBarIcon: ({ color }) => <TabBarIcon name="trophy" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          href: null,
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          href: null,
          tabBarIcon: ({ color }) => <TabBarIcon name="credit-card" color={color} />,
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
          tabBarIcon: ({ color }) => <TabBarIcon name="gamepad" color={color} />,
        }}
      />
    </Tabs>
  );
}
