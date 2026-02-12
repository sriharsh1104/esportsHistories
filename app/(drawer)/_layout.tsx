import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import { useSelectedGames } from '@/context/SelectedGamesContext';
import { GAME_CATEGORIES } from '@/data/games';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DrawerActions } from '@react-navigation/native';
import { router } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

type PlatformTab = 'pc' | 'mobile';

function CustomDrawerContent(props: { navigation?: any }) {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const [activeTab, setActiveTab] = useState<PlatformTab>('mobile');
  const { selectedGameIds } = useSelectedGames();

  const allMobile = GAME_CATEGORIES.find((c) => c.id === 'mobile')?.games ?? [];
  const allPc = GAME_CATEGORIES.find((c) => c.id === 'pc')?.games ?? [];
  const filterBySelected = (list: typeof allMobile) =>
    selectedGameIds.length === 0 ? list : list.filter((g) => selectedGameIds.includes(g.id));
  const mobileGames = filterBySelected(allMobile);
  const pcGames = filterBySelected(allPc);
  const games = activeTab === 'mobile' ? mobileGames : pcGames;

  const closeDrawer = () => props.navigation?.dispatch(DrawerActions.closeDrawer());

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: h(48) }}>
      <View style={{ paddingHorizontal: w(20), paddingBottom: h(20) }}>
        <Text style={{ fontSize: w(20), fontWeight: '700', color: colors.text }}>
          Games
        </Text>
        <View
          style={{
            flexDirection: 'row',
            marginTop: h(16),
            backgroundColor: colors.border + '40',
            borderRadius: w(8),
            padding: w(4),
          }}
        >
          <Pressable
            onPress={() => setActiveTab('mobile')}
            style={{
              flex: 1,
              paddingVertical: h(10),
              borderRadius: w(6),
              backgroundColor: activeTab === 'mobile' ? colors.tint : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: w(14),
                fontWeight: '600',
                color: activeTab === 'mobile' ? '#fff' : colors.text,
              }}
            >
              Mobile
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('pc')}
            style={{
              flex: 1,
              paddingVertical: h(10),
              borderRadius: w(6),
              backgroundColor: activeTab === 'pc' ? colors.tint : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: w(14),
                fontWeight: '600',
                color: activeTab === 'pc' ? '#fff' : colors.text,
              }}
            >
              PC
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {games.map((game) => (
          <Pressable
            key={game.id}
            onPress={() => {
              closeDrawer();
              router.push(`/(drawer)/(tabs)/game/${game.slug}` as any);
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: h(12),
              paddingHorizontal: w(20),
              backgroundColor: pressed ? colors.border + '40' : 'transparent',
            })}
          >
            <Text
              style={{ fontSize: w(15), fontWeight: '500', color: colors.text, flex: 1 }}
              numberOfLines={1}
            >
              {game.name}
            </Text>
            <FontAwesome
              name="chevron-right"
              size={w(12)}
              color={colors.tabIconDefault}
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function DrawerLayout() {
  const colorScheme = useColorScheme();

  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        drawerActiveTintColor: Colors[colorScheme ?? 'light'].tint,
      }}
      drawerContent={(props) => <CustomDrawerContent navigation={props.navigation} />}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerLabel: 'Dashboard',
          headerShown: false,
          drawerIcon: ({ color }) => <FontAwesome name="home" size={22} color={color} />,
        }}
      />
      <Drawer.Screen
        name="games"
        options={{
          drawerLabel: 'Games',
          title: 'Select Games',
          drawerIcon: ({ color }) => <FontAwesome name="gamepad" size={22} color={color} />,
        }}
      />
    </Drawer>
  );
}
