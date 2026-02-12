import { Card } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import { useSelectedGames } from '@/context/SelectedGamesContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { MOCK_NEWS } from '@/data/news';
import type { NewsItem } from '@/data/news';

function NewsCard({ item }: { item: NewsItem }) {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  return (
    <Card onPress={() => {}} style={{ marginBottom: h(12) }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View
          style={{
            width: w(40),
            height: w(40),
            borderRadius: w(8),
            backgroundColor: colors.tint + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: w(12),
          }}
        >
          <FontAwesome
            name={item.category === 'pc' ? 'desktop' : 'mobile'}
            size={w(18)}
            color={colors.tint}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: w(12),
              color: colors.accent,
              marginBottom: h(4),
            }}
          >
            {item.game} • {item.timeAgo}
          </Text>
          <Text
            style={{
              fontSize: w(16),
              fontWeight: '600',
              color: colors.text,
              marginBottom: h(4),
            }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text
            style={{ fontSize: w(14), color: colors.tabIconDefault }}
            numberOfLines={2}
          >
            {item.excerpt}
          </Text>
        </View>
        <FontAwesome name="chevron-right" size={w(14)} color={colors.tabIconDefault} />
      </View>
    </Card>
  );
}

export function NewsSection() {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const { selectedGameIds } = useSelectedGames();

  const filteredNews = useMemo(() => {
    if (selectedGameIds.length === 0) return MOCK_NEWS;
    return MOCK_NEWS.filter((item) => selectedGameIds.includes(item.gameId));
  }, [selectedGameIds]);

  return (
    <View>
      <Text
        style={{
          fontSize: w(18),
          fontWeight: '600',
          marginBottom: h(16),
          color: colors.text,
        }}
      >
        Latest News
      </Text>
      <ScrollView
        horizontal={false}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        style={{ maxHeight: 400 }}
      >
        {filteredNews.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}
