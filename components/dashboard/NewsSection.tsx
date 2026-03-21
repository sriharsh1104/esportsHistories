import { Card } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useFeedFocus } from '@/context/FeedFocusContext';
import type { FollowedTarget } from '@/context/FollowedTargetsContext';
import { useFollowedTargets } from '@/context/FollowedTargetsContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useSelectedGames } from '@/context/SelectedGamesContext';
import type { NewsItem } from '@/data/news';
import { MOCK_NEWS } from '@/data/news';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

function newsMatchesAnyFollow(
  item: NewsItem,
  selectedGameIds: string[],
  targets: FollowedTarget[]
): boolean {
  if (selectedGameIds.includes(item.gameId)) return true;
  const pids = new Set(targets.filter((t) => t.kind === 'personality').map((t) => t.id));
  const oids = new Set(targets.filter((t) => t.kind === 'organization').map((t) => t.id));
  for (const pid of item.personalityIds ?? []) {
    if (pids.has(pid)) return true;
  }
  for (const oid of item.organizationIds ?? []) {
    if (oids.has(oid)) return true;
  }
  return false;
}

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

export function NewsSection({ gameId }: { gameId?: string }) {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const { selectedGameIds } = useSelectedGames();
  const { targets } = useFollowedTargets();
  const { focus } = useFeedFocus();

  const filteredNews = useMemo(() => {
    if (gameId) {
      return MOCK_NEWS
        .filter((item) => item.gameId === gameId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }

    if (focus !== null) {
      if (focus.kind === 'game') {
        return MOCK_NEWS.filter((item) => item.gameId === focus.id).sort(
          (a, b) => a.sortOrder - b.sortOrder
        );
      }
      if (focus.kind === 'personality') {
        return MOCK_NEWS.filter((item) => item.personalityIds?.includes(focus.id)).sort(
          (a, b) => a.sortOrder - b.sortOrder
        );
      }
      return MOCK_NEWS.filter((item) => item.organizationIds?.includes(focus.id)).sort(
        (a, b) => a.sortOrder - b.sortOrder
      );
    }

    const list = MOCK_NEWS.filter((item) =>
      newsMatchesAnyFollow(item, selectedGameIds, targets)
    );
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [selectedGameIds, targets, gameId, focus]);

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
      <View>
        {filteredNews.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
}
