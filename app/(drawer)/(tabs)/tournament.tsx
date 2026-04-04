import { Button, Card, ClassicEmptyState, Screen } from "@/components/ui";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/context/ResponsiveContext";
import { useSelectedGames } from "@/context/SelectedGamesContext";
import type { TournamentUiItem } from "@/services/tournament.service";
import { fetchTournamentList } from "@/services/tournament.service";
import { useAppDispatch } from "@/store/hooks";
import { hideLoader, showLoader } from "@/store/slices/loaderSlice";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const STATUS_COLORS = {
  ongoing: "#22c55e",
  upcoming: "#f59e0b",
  recent: "#6b7280",
};

function normKey(input: unknown): string {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function TournamentCard({ item }: { item: TournamentUiItem }) {
  const scheme = useColorScheme() ?? "light";
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  return (
    <Card style={{ marginBottom: h(12) }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: w(8),
              marginBottom: h(8),
            }}
          >
            <View
              style={{
                paddingHorizontal: w(8),
                paddingVertical: h(4),
                borderRadius: w(6),
                backgroundColor: STATUS_COLORS[item.status] + "25",
              }}
            >
              <Text
                style={{
                  fontSize: w(10),
                  fontWeight: "600",
                  color: STATUS_COLORS[item.status],
                  textTransform: "uppercase",
                }}
              >
                {item.status}
              </Text>
            </View>
            <Text style={{ fontSize: w(12), color: colors.tabIconDefault }}>
              {item.gameName}
            </Text>
          </View>
          <Text
            style={{
              fontSize: w(16),
              fontWeight: "600",
              color: colors.text,
              marginBottom: h(4),
            }}
          >
            {item.name}
          </Text>
          <Text style={{ fontSize: w(12), color: colors.tabIconDefault }}>
            {item.prizePool} • {item.teamsCount} teams
          </Text>
          <Text
            style={{
              fontSize: w(11),
              color: colors.tabIconDefault,
              marginTop: h(2),
            }}
          >
            {item.startDate}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default function TournamentScreen() {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const { selectedGameIds, availableGames, refreshGames } = useSelectedGames();
  const scheme = useColorScheme() ?? "light";
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const [activeGameId, setActiveGameId] = useState<string | null>(
    selectedGameIds[0] ?? null,
  );
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(false);
  const [tournamentError, setTournamentError] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<TournamentUiItem[]>([]);
  const [tournamentFetchKey, setTournamentFetchKey] = useState(0);

  const styles = useMemo(
    () => ({
      header: { paddingTop: h(16), paddingBottom: h(24) },
      title: {
        fontSize: w(24),
        fontWeight: "700" as const,
        marginBottom: h(4),
      },
      subtitle: { fontSize: w(16) },
      section: { marginBottom: h(24) },
      sectionTitle: {
        fontSize: w(14),
        fontWeight: "600" as const,
        marginBottom: h(12),
        color: colors.tabIconDefault,
      },
      centered: {
        flex: 1,
        justifyContent: "center" as const,
        paddingTop: h(48),
      },
      btn: { maxWidth: w(200) },
      chip: {
        paddingVertical: h(8),
        paddingHorizontal: w(12),
        borderRadius: w(999),
        borderWidth: 1,
        marginRight: w(10),
      },
    }),
    [w, h, colors.tabIconDefault],
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    if (availableGames.length > 0) return;
    void refreshGames();
  }, [isAuthenticated, availableGames.length, refreshGames]);

  // Keep exactly one "active" game selected for filtering (default = first followed game).
  useEffect(() => {
    const first = selectedGameIds[0] ?? null;
    if (!first) {
      setActiveGameId(null);
      return;
    }
    if (!activeGameId || !selectedGameIds.includes(activeGameId)) {
      setActiveGameId(first);
    }
  }, [selectedGameIds, activeGameId]);

  const followedGames = useMemo(() => {
    const byId = new Map(availableGames.map((g) => [g._id, g]));
    return selectedGameIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((g) => ({
        id: g!._id,
        name: g!.name,
        key: normKey(g!.name) || normKey(g!._id) || normKey(g!.slug),
      }));
  }, [availableGames, selectedGameIds]);

  const activeGame = useMemo(() => {
    const g = followedGames.find((x) => x.id === activeGameId);
    return g ?? null;
  }, [followedGames, activeGameId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!activeGame?.name) {
      setTournaments([]);
      setTournamentError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setIsLoadingTournaments(true);
        setTournamentError(null);
        dispatch(showLoader());
        const [live, upcoming] = await Promise.all([
          fetchTournamentList({ status: "live", game: activeGame.name }),
          fetchTournamentList({ status: "upcoming", game: activeGame.name }),
        ]);
        const merged = [...live, ...upcoming];
        if (!cancelled) setTournaments(merged);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to load tournaments";
        if (!cancelled) {
          setTournamentError(msg);
          setTournaments([]);
        }
      } finally {
        if (!cancelled) setIsLoadingTournaments(false);
        dispatch(hideLoader());
      }
    })();

    return () => {
      cancelled = true;
      dispatch(hideLoader());
    };
  }, [isAuthenticated, activeGame, dispatch, tournamentFetchKey]);

  const { paidTournaments, specialTournaments } = useMemo(() => {
    const paid: TournamentUiItem[] = [];
    const special: TournamentUiItem[] = [];
    for (const t of tournaments) {
      const paidFlag = t.isPaid ?? (t.entryFee != null ? t.entryFee > 0 : null);
      if (paidFlag === false) special.push(t);
      else paid.push(t);
    }
    return { paidTournaments: paid, specialTournaments: special };
  }, [tournaments]);

  const isEmpty =
    !isLoadingTournaments && !tournamentError && tournaments.length === 0;

  if (!isAuthenticated) {
    return (
      <Screen padded maxForm>
        <View style={styles.centered}>
          <Text style={[styles.title, { color: colors.text }]}>
            Tournaments
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.tabIconDefault, marginBottom: h(24) },
            ]}
          >
            Sign in to view and follow esports tournaments
          </Text>
          <Button
            title="Sign in"
            onPress={() => router.push("/(auth)/login")}
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
          GAMES
        </Text>
        {followedGames.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {followedGames.map((g) => {
              const active = g.id === activeGameId;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setActiveGameId(g.id)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? colors.tint : colors.border,
                      backgroundColor: active
                        ? colors.tint + "18"
                        : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? colors.tint : colors.tabIconDefault,
                      fontWeight: "600",
                    }}
                  >
                    {g.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={{ fontSize: w(12), color: colors.tabIconDefault }}>
            Follow at least one game to filter tournaments.
          </Text>
        )}
      </View>

      {isEmpty ? (
        <View style={styles.section}>
          <ClassicEmptyState
            title="No tournaments for this game"
            message="Try another followed game or check back later."
            icon="trophy"
          />
        </View>
      ) : null}

      {!isEmpty && tournamentError && !isLoadingTournaments ? (
        <View style={styles.section}>
          <ClassicEmptyState
            variant="error"
            title="Couldn't load tournaments"
            message={tournamentError}
          >
            <Button
              title="Retry"
              variant="outline"
              onPress={() => setTournamentFetchKey((k) => k + 1)}
            />
          </ClassicEmptyState>
        </View>
      ) : null}

      {!isEmpty && !tournamentError ? (
        <>
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: colors.tabIconDefault }]}
            >
              PAID TOURNAMENTS
            </Text>
            {paidTournaments.length > 0 ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {paidTournaments.map((item) => (
                  <TournamentCard key={item.id} item={item} />
                ))}
              </ScrollView>
            ) : (
              <ClassicEmptyState
                title="No paid tournaments"
                message="Nothing scheduled right now for this game."
                icon="money"
                style={{ marginTop: h(4) }}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: colors.tabIconDefault }]}
            >
              SPECIAL (FREE / SPONSORED)
            </Text>
            {specialTournaments.length > 0 ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {specialTournaments.map((item) => (
                  <TournamentCard key={item.id} item={item} />
                ))}
              </ScrollView>
            ) : (
              <ClassicEmptyState
                title="No free or sponsored events"
                message="Check the paid section or try again later."
                icon="gift"
                style={{ marginTop: h(4) }}
              />
            )}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
