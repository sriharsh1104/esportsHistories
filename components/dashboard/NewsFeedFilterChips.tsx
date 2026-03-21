import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { FeedFocus } from '@/context/FeedFocusContext';
import { useFeedFocus } from '@/context/FeedFocusContext';
import { useFollowHub } from '@/context/FollowHubContext';
import { useResponsive } from '@/context/ResponsiveContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

export type FeedFilterChip =
  | { kind: 'game'; id: string; label: string }
  | { kind: 'personality'; id: string; label: string }
  | { kind: 'organization'; id: string; label: string };

function chipKey(c: FeedFilterChip): string {
  return `${c.kind}:${c.id}`;
}

function isSameFocus(a: FeedFocus, chip: FeedFilterChip): boolean {
  if (a === null) return false;
  return a.kind === chip.kind && a.id === chip.id;
}

function iconForChip(chip: FeedFilterChip): React.ComponentProps<typeof FontAwesome>['name'] {
  if (chip.kind === 'game') return 'gamepad';
  if (chip.kind === 'personality') return 'user';
  return 'building';
}

type NewsFeedFilterChipsProps = {
  chips: FeedFilterChip[];
};

export function NewsFeedFilterChips({ chips }: NewsFeedFilterChipsProps) {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const { focus, setFocus } = useFeedFocus();
  const { openFollowHub } = useFollowHub();

  if (chips.length === 0) return null;

  const circle = (active: boolean) => ({
    width: w(48),
    height: w(48),
    borderRadius: w(24),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: active ? colors.tint : colors.border,
    backgroundColor: active ? colors.tint + '22' : colors.inputBg,
    marginRight: w(10),
  });

  return (
    <View style={{ marginBottom: h(16), width: '100%', maxWidth: '100%' }}>
      <Text
        style={{
          fontSize: w(13),
          fontWeight: '600',
          color: colors.tabIconDefault,
          marginBottom: h(10),
          textTransform: 'uppercase' as const,
        }}
      >
        Following — tap to filter news
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingRight: w(8) }}
      >
        <Pressable
          onPress={() => setFocus(null)}
          accessibilityRole="button"
          accessibilityLabel="Show all followed news"
          style={{ alignItems: 'center', marginRight: w(14) }}
        >
          <View style={circle(focus === null)}>
            <FontAwesome
              name="th-large"
              size={w(18)}
              color={focus === null ? colors.tint : colors.tabIconDefault}
            />
          </View>
          <Text
            numberOfLines={1}
            style={{
              fontSize: w(11),
              fontWeight: '600',
              color: focus === null ? colors.tint : colors.text,
              marginTop: h(4),
              maxWidth: w(56),
              textAlign: 'center',
            }}
          >
            All
          </Text>
        </Pressable>

        {chips.map((chip) => {
          const active = isSameFocus(focus, chip);
          return (
            <Pressable
              key={chipKey(chip)}
              onPress={() =>
                setFocus(
                  chip.kind === 'game'
                    ? { kind: 'game', id: chip.id }
                    : chip.kind === 'personality'
                      ? { kind: 'personality', id: chip.id }
                      : { kind: 'organization', id: chip.id }
                )
              }
              accessibilityRole="button"
              accessibilityLabel={`Filter news: ${chip.label}`}
              style={{ alignItems: 'center', marginRight: w(4) }}
            >
              <View style={circle(active)}>
                <FontAwesome
                  name={iconForChip(chip)}
                  size={w(18)}
                  color={active ? colors.tint : colors.tabIconDefault}
                />
              </View>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: w(11),
                  fontWeight: '600',
                  color: active ? colors.tint : colors.text,
                  marginTop: h(4),
                  maxWidth: w(64),
                  textAlign: 'center',
                }}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={openFollowHub}
          accessibilityRole="button"
          accessibilityLabel="Add follow"
          style={{ alignItems: 'center' }}
        >
          <View
            style={{
              width: w(48),
              height: w(48),
              borderRadius: w(24),
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: colors.accent,
              backgroundColor: colors.accent + '12',
            }}
          >
            <FontAwesome name="plus" size={w(20)} color={colors.accent} />
          </View>
          <Text
            numberOfLines={1}
            style={{
              fontSize: w(11),
              fontWeight: '600',
              color: colors.accent,
              marginTop: h(4),
              maxWidth: w(56),
              textAlign: 'center',
            }}
          >
            Add
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
