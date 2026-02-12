import { Button, Card, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFollowedPlayers } from '@/context/FollowedPlayersContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useSelectedGames } from '@/context/SelectedGamesContext';
import { ALL_GAMES } from '@/data/games';
import { MOCK_PLAYERS } from '@/data/players';
import { MOCK_TOURNAMENTS } from '@/data/tournaments';
import type { Tournament } from '@/data/tournaments';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ROUTES } from '@/constants/routes';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

const STATUS_COLORS = {
  ongoing: '#22c55e',
  upcoming: '#f59e0b',
  recent: '#6b7280',
};

function TournamentCard({
  item,
  onFollow,
  isFollowing,
}: {
  item: Tournament;
  onFollow: () => void;
  isFollowing: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  return (
    <Card style={{ marginBottom: h(12) }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: w(8),
              marginBottom: h(8),
            }}
          >
            <View
              style={{
                paddingHorizontal: w(8),
                paddingVertical: h(4),
                borderRadius: w(6),
                backgroundColor: STATUS_COLORS[item.status] + '25',
              }}
            >
              <Text
                style={{
                  fontSize: w(10),
                  fontWeight: '600',
                  color: STATUS_COLORS[item.status],
                  textTransform: 'uppercase',
                }}
              >
                {item.status}
              </Text>
            </View>
            <Text style={{ fontSize: w(12), color: colors.tabIconDefault }}>{item.gameName}</Text>
          </View>
          <Text style={{ fontSize: w(16), fontWeight: '600', color: colors.text, marginBottom: h(4) }}>
            {item.name}
          </Text>
          <Text style={{ fontSize: w(12), color: colors.tabIconDefault }}>
            {item.prizePool} • {item.teamsCount} teams
          </Text>
          <Text style={{ fontSize: w(11), color: colors.tabIconDefault, marginTop: h(2) }}>
            {item.startDate}
          </Text>
        </View>
        <Pressable
          onPress={onFollow}
          style={{
            paddingVertical: h(8),
            paddingHorizontal: w(12),
            borderRadius: w(10),
            backgroundColor: isFollowing ? colors.tint + '25' : colors.tint,
          }}
        >
          <Text
            style={{
              fontSize: w(12),
              fontWeight: '600',
              color: isFollowing ? colors.tint : '#fff',
            }}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

export default function TournamentScreen() {
  const { isAuthenticated } = useAuth();
  const { selectedGameIds, toggleGame } = useSelectedGames();
  const { followPlayer, unfollowPlayer, isFollowing } = useFollowedPlayers();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const styles = useMemo(
    () => ({
      header: { paddingTop: h(16), paddingBottom: h(24) },
      title: { fontSize: w(24), fontWeight: '700' as const, marginBottom: h(4) },
      subtitle: { fontSize: w(16) },
      section: { marginBottom: h(24) },
      sectionTitle: {
        fontSize: w(14),
        fontWeight: '600' as const,
        marginBottom: h(12),
        color: colors.tabIconDefault,
      },
      followCard: {
        padding: w(16),
        marginBottom: h(12),
        borderWidth: 1,
        borderStyle: 'dashed' as const,
      },
      centered: { flex: 1, justifyContent: 'center' as const, paddingTop: h(48) },
      btn: { maxWidth: w(200) },
    }),
    [w, h, colors.tabIconDefault]
  );

  const isTournamentGameFollowed = (gameId: string) => selectedGameIds.includes(gameId);

  if (!isAuthenticated) {
    return (
      <Screen padded maxForm>
        <View style={styles.centered}>
          <Text style={[styles.title, { color: colors.text }]}>Tournaments</Text>
          <Text style={[styles.subtitle, { color: colors.tabIconDefault, marginBottom: h(24) }]}>
            Sign in to view and follow esports tournaments
          </Text>
          <Button
            title="Sign in"
            onPress={() => router.push('/(auth)/login')}
            fullWidth
            style={styles.btn}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded scroll maxContent>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Tournaments</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Ongoing esports tournaments • Follow for updates
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.tabIconDefault }]}>
          MANAGE FOLLOWS
        </Text>
        <Card
          onPress={() => router.push(ROUTES.SELECT_GAMES_TOURNAMENT)}
          style={{
            ...styles.followCard,
            borderColor: colors.tint,
            backgroundColor: colors.tint + '12',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FontAwesome
              name="gamepad"
              size={w(22)}
              color={colors.tint}
              style={{ marginRight: w(12) }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: w(16), fontWeight: '600', color: colors.text }}>
                Games to follow
              </Text>
              <Text style={{ fontSize: w(12), color: colors.tabIconDefault, marginTop: h(4) }}>
                {selectedGameIds.length > 0
                  ? `${selectedGameIds.length} games selected`
                  : 'Add games to see tournament news'}
              </Text>
            </View>
            <FontAwesome name="chevron-right" size={w(16)} color={colors.tint} />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.tabIconDefault }]}>
          ONGOING & UPCOMING
        </Text>
        <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {MOCK_TOURNAMENTS.filter((t) => t.status !== 'recent').map((item) => (
            <TournamentCard
              key={item.id}
              item={item}
              isFollowing={isTournamentGameFollowed(item.gameId)}
              onFollow={() => toggleGame(item.gameId)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.tabIconDefault }]}>
          FOLLOW PLAYERS
        </Text>
        <Text
          style={{
            fontSize: w(12),
            color: colors.tabIconDefault,
            marginBottom: h(12),
            lineHeight: w(18),
          }}
        >
          Follow player profiles to get news specific to them
        </Text>
        {MOCK_PLAYERS.map((player) => {
          const following = isFollowing(player.id);
          const game = ALL_GAMES.find((g) => g.id === player.gameId);
          return (
            <Card key={player.id} style={{ marginBottom: h(10) }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: w(44),
                      height: w(44),
                      borderRadius: w(22),
                      backgroundColor: colors.tint + '25',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: w(12),
                    }}
                  >
                    <Text style={{ fontSize: w(18), fontWeight: '700', color: colors.tint }}>
                      {player.displayName.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: w(16), fontWeight: '600', color: colors.text }}>
                      {player.displayName}
                    </Text>
                    <Text style={{ fontSize: w(12), color: colors.tabIconDefault, marginTop: h(2) }}>
                      {game?.name ?? player.gameName}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() =>
                    following
                      ? unfollowPlayer(player.id)
                      : followPlayer({
                          id: player.id,
                          displayName: player.displayName,
                          gameId: player.gameId,
                        })
                  }
                  style={{
                    paddingVertical: h(8),
                    paddingHorizontal: w(14),
                    borderRadius: w(10),
                    backgroundColor: following ? colors.tint + '25' : colors.tint,
                  }}
                >
                  <Text
                    style={{
                      fontSize: w(12),
                      fontWeight: '600',
                      color: following ? colors.tint : '#fff',
                    }}
                  >
                    {following ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
