import { LogoutButton } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  const { w } = useResponsive();
  return <FontAwesome size={w(24)} style={{ marginBottom: -4 }} {...props} />;
}

function DrawerToggle() {
  const navigation = useNavigation();
  const { w } = useResponsive();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        headerLeft: () => <DrawerToggle />,
        headerRight: () => <LogoutButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color }) => <TabBarIcon name="wallet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <TabBarIcon name="shopping-bag" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
      <Tabs.Screen
        name="game"
        options={{
          title: 'Games',
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}
