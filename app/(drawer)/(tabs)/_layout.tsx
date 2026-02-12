import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/ui";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useResponsive } from "@/context/ResponsiveContext";
import { useSelectedGames } from "@/context/SelectedGamesContext";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Tabs } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

const MOBILE_GAME_IDS = [
  "bgmi",
  "freefire",
  "mlbb",
  "codm",
  "coc",
  "cr",
  "wildrift",
];

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  const { w } = useResponsive();
  return <FontAwesome size={w(24)} style={{ marginBottom: -4 }} {...props} />;
}

function FollowTabIcon({ color }: { color: string }) {
  const { selectedGameIds } = useSelectedGames();
  const { w } = useResponsive();
  const firstGameId = selectedGameIds[0];
  const iconName =
    firstGameId && MOBILE_GAME_IDS.includes(firstGameId)
      ? "mobile"
      : firstGameId
        ? "desktop"
        : "heart";
  return (
    <FontAwesome
      name={iconName as any}
      size={w(24)}
      color={color}
      style={{ marginBottom: -4 }}
    />
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

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: true,
        headerLeft: () => <DrawerToggle />,
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ThemeToggle />
            <LogoutButton />
          </View>
        ),
        tabBarShowLabel: false,
        tabBarStyle: { paddingHorizontal: w(16) },
        tabBarItemStyle: { flex: 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "News",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="newspaper-o" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "Shop",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="shopping-bag" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="follow"
        options={{
          title: "Follow",
          tabBarIcon: ({ color }) => <FollowTabIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="tournament"
        options={{
          title: "Tournament",
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
