import { Card, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import { SHOP_CATEGORIES } from '@/data/shop';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useMemo } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';

export default function ShopScreen() {
  const scheme = useColorScheme() ?? 'light';
  const { w, h, isTablet } = useResponsive();
  const colors = Colors[scheme];

  const styles = useMemo(
    () => ({
      header: { paddingTop: h(16), paddingBottom: h(24) },
      title: { fontSize: w(24), fontWeight: '700' as const, marginBottom: h(4) },
      subtitle: { fontSize: w(16) },
      section: { marginBottom: h(24) },
      sectionTitle: {
        fontSize: w(18),
        fontWeight: '600' as const,
        marginBottom: h(12),
      },
      itemCard: { marginBottom: h(12), flexDirection: 'row' as const, padding: w(12) },
      image: { width: w(72), height: w(72), borderRadius: w(12) },
      itemContent: { flex: 1, marginLeft: w(16), justifyContent: 'center' as const },
      itemRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between',
      },
      itemLeft: { flex: 1 },
      itemName: { fontSize: w(16), fontWeight: '600' as const },
      itemOrg: { fontSize: w(13), marginTop: h(2) },
      itemPrice: { fontSize: w(16), fontWeight: '700' as const },
    }),
    [w, h]
  );

  return (
    <Screen padded scroll>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Shop</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Official esports org merchandise
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {SHOP_CATEGORIES.map((cat) => (
          <View key={cat.id} style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: h(12) }}>
              <FontAwesome
                name={cat.icon as any}
                size={w(20)}
                color={colors.tint}
                style={{ marginRight: w(10) }}
              />
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                {cat.title}
              </Text>
            </View>
            {cat.items.map((item) => (
              <Card key={item.id} onPress={() => {}} style={styles.itemCard} padded={false}>
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
                        {item.org}
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
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
