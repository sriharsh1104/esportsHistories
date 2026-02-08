import { BackButton, Button, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import { getItemById } from '@/data/shop';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Image, Text, View } from 'react-native';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const item = id ? getItemById(id) : undefined;

  const styles = useMemo(
    () => ({
      content: { paddingTop: h(16) },
      image: { width: '100%' as const, aspectRatio: 1, borderRadius: w(16), marginBottom: h(20) },
      name: { fontSize: w(24), fontWeight: '700' as const, marginBottom: h(4) },
      meta: { fontSize: w(16), marginBottom: h(16) },
      price: { fontSize: w(28), fontWeight: '700' as const, marginBottom: h(24) },
      buyBtn: { marginTop: h(8) },
    }),
    [w, h]
  );

  if (!item) {
    return (
      <Screen padded>
        <Text style={{ color: colors.text, fontSize: w(18) }}>Product not found</Text>
        <Button title="Back" onPress={() => router.back()} style={{ marginTop: h(16) }} />
      </Screen>
    );
  }

  return (
    <Screen padded scroll>
      <View style={styles.content}>
        <BackButton />
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.meta, { color: colors.tabIconDefault }]}>
          {item.org}
          {item.player ? ` • ${item.player}` : ''}
        </Text>
        <Text style={[styles.price, { color: colors.tint }]}>
          ₹{item.price.toLocaleString('en-IN')}
        </Text>
        <Button
          title="Buy now"
          fullWidth
          onPress={() =>
            router.push({
              pathname: '/(drawer)/(tabs)/shop/checkout',
              params: { productId: item.id },
            } as any)
          }
          style={styles.buyBtn}
        />
      </View>
    </Screen>
  );
}
