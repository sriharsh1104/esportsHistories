import { Card, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import {
  ALL_ORGS,
  ALL_PLAYERS,
  getAllItems,
  ITEM_TYPES,
  type ItemType,
  type ShopItem,
} from '@/data/shop';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ROUTES } from '@/constants/routes';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

export default function ShopIndexScreen() {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const [selectedOrg, setSelectedOrg] = useState('All');
  const [selectedPlayer, setSelectedPlayer] = useState('All');
  const [selectedItemType, setSelectedItemType] = useState<ItemType | 'all'>('all');

  const filteredItems = useMemo(() => {
    let items: ShopItem[] = getAllItems();
    if (selectedOrg !== 'All') items = items.filter((i) => i.org === selectedOrg);
    if (selectedPlayer !== 'All') items = items.filter((i) => i.player === selectedPlayer);
    if (selectedItemType !== 'all') items = items.filter((i) => i.itemType === selectedItemType);
    return items;
  }, [selectedOrg, selectedPlayer, selectedItemType]);

  const styles = useMemo(
    () => ({
      header: { paddingTop: h(16), paddingBottom: h(16) },
      title: { fontSize: w(24), fontWeight: '700' as const, marginBottom: h(4) },
      subtitle: { fontSize: w(16), marginBottom: h(16) },
      filterRow: { marginBottom: h(12) },
      filterLabel: { fontSize: w(13), fontWeight: '600' as const, marginBottom: h(6) },
      filterChips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: w(8) },
      chip: {
        paddingVertical: h(8),
        paddingHorizontal: w(14),
        borderRadius: w(20),
      },
      section: { marginBottom: h(24) },
      sectionTitle: { fontSize: w(18), fontWeight: '600' as const, marginBottom: h(12) },
      itemCard: { marginBottom: h(12), flexDirection: 'row' as const, padding: w(12) },
      image: { width: w(72), height: w(72), borderRadius: w(12) },
      itemContent: { flex: 1, marginLeft: w(16), justifyContent: 'center' as const },
      itemRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' },
      itemLeft: { flex: 1 },
      itemName: { fontSize: w(16), fontWeight: '600' as const },
      itemOrg: { fontSize: w(13), marginTop: h(2) },
      itemPrice: { fontSize: w(16), fontWeight: '700' as const },
    }),
    [w, h]
  );

  const FilterChips = ({
    options,
    selected,
    onSelect,
  }: {
    options: string[];
    selected: string;
    onSelect: (v: string) => void;
  }) => (
    <View style={[styles.filterChips, styles.filterRow]}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onSelect(opt)}
          style={[
            styles.chip,
            {
              backgroundColor: selected === opt ? colors.tint : colors.border + '40',
            },
          ]}
        >
          <Text
            style={{
              fontSize: w(13),
              fontWeight: '500',
              color: selected === opt ? '#fff' : colors.text,
            }}
          >
            {opt}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <Screen padded scroll>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Shop</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Official esports org merchandise
        </Text>

        <Text style={[styles.filterLabel, { color: colors.text }]}>Org</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: h(8) }}>
          <View style={styles.filterChips}>
            {ALL_ORGS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setSelectedOrg(opt)}
                style={[
                  styles.chip,
                  { backgroundColor: selectedOrg === opt ? colors.tint : colors.border + '40' },
                ]}
              >
                <Text
                  style={{
                    fontSize: w(13),
                    fontWeight: '500',
                    color: selectedOrg === opt ? '#fff' : colors.text,
                  }}
                >
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text style={[styles.filterLabel, { color: colors.text }]}>Player</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: h(8) }}>
          <View style={styles.filterChips}>
            {ALL_PLAYERS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setSelectedPlayer(opt)}
                style={[
                  styles.chip,
                  { backgroundColor: selectedPlayer === opt ? colors.tint : colors.border + '40' },
                ]}
              >
                <Text
                  style={{
                    fontSize: w(13),
                    fontWeight: '500',
                    color: selectedPlayer === opt ? '#fff' : colors.text,
                  }}
                >
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text style={[styles.filterLabel, { color: colors.text }]}>Type</Text>
        <View style={styles.filterChips}>
          <Pressable
            onPress={() => setSelectedItemType('all')}
            style={[
              styles.chip,
              { backgroundColor: selectedItemType === 'all' ? colors.tint : colors.border + '40' },
            ]}
          >
            <Text
              style={{
                fontSize: w(13),
                fontWeight: '500',
                color: selectedItemType === 'all' ? '#fff' : colors.text,
              }}
            >
              All
            </Text>
          </Pressable>
          {ITEM_TYPES.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setSelectedItemType(t.id)}
              style={[
                styles.chip,
                { backgroundColor: selectedItemType === t.id ? colors.tint : colors.border + '40' },
              ]}
            >
              <Text
                style={{
                  fontSize: w(13),
                  fontWeight: '500',
                  color: selectedItemType === t.id ? '#fff' : colors.text,
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {filteredItems.length === 0 ? (
            <Text style={[styles.sectionTitle, { color: colors.tabIconDefault }]}>
              No items match your filters
            </Text>
          ) : (
            filteredItems.map((item) => (
              <Card
                key={item.id}
                onPress={() => router.push(ROUTES.SHOP_ITEM(item.id))}
                style={styles.itemCard}
                padded={false}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <View style={styles.itemContent}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.itemOrg, { color: colors.tabIconDefault }]}>
                        {`${item.org || ''}${item.player ? ` • ${item.player}` : ''}`}
                      </Text>
                    </View>
                    <Text style={[styles.itemPrice, { color: colors.tint }]}>
                      ₹{item.price.toLocaleString('en-IN')}
                    </Text>
                    <FontAwesome
                      name="chevron-right"
                      size={w(14)}
                      color={colors.tabIconDefault}
                      style={{ marginLeft: w(8) }}
                    />
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
