import { Button, Card, Screen } from "@/components/ui";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/context/ResponsiveContext";
import {
  approveAdminHostApplication,
  fetchAdminGamesCatalog,
  fetchAdminHostApplications,
  fetchAdminTournaments,
  fetchAdminUsers,
  rejectAdminHostApplication,
  type FetchAdminHostApplicationsParams,
  type FetchAdminUsersParams,
} from "@/services/admin.service";
import { ApiError } from "@/services/api.service";
import { useAppDispatch } from "@/store/hooks";
import { hideLoader, showLoader } from "@/store/slices/loaderSlice";
import type {
  AdminHostApplication,
  AdminTournamentRow,
  AdminUserRow,
} from "@/types/admin";
import { isAdminUser } from "@/utils/adminUser";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Redirect } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { formatDateDdMmYyyy } from "@/utils/date";

type StatusFilter =
  | "upcoming"
  | "live"
  | "completed"
  | "pendingResult"
  | "cancelled";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "completed", label: "Completed" },
  { value: "pendingResult", label: "Pending result" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminTournamentRecordScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { w, h } = useResponsive();
  const { user, isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();

  const [status, setStatus] = useState<StatusFilter>("upcoming");
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AdminTournamentRow[]>([]);
  const [games, setGames] = useState<{ label: string; value: string }[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [applicationsModalOpen, setApplicationsModalOpen] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [applications, setApplications] = useState<AdminHostApplication[]>([]);
  const [applicationsTab, setApplicationsTab] = useState<
    "applications" | "availableHosts"
  >("applications");
  const [applicationsTournament, setApplicationsTournament] =
    useState<AdminTournamentRow | null>(null);
  const [hostsLoading, setHostsLoading] = useState(false);
  const [hostsError, setHostsError] = useState<string | null>(null);
  const [hosts, setHosts] = useState<AdminUserRow[]>([]);

  const load = async (opts?: { silent?: boolean }) => {
    if (!isAuthenticated || !isAdminUser(user)) return;
    if (!opts?.silent) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsRefreshing(true);
    }

    try {
      dispatch(showLoader());
      const list = await fetchAdminTournaments({
        status,
        game: selectedGame ?? undefined,
      });
      setItems(list);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load tournaments";
      setError(msg);
      Toast.show({ type: "error", text1: msg });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      dispatch(hideLoader());
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, selectedGame]);

  const hasItems = items.length > 0;

  const grouped = useMemo(() => {
    const byDate = new Map<string, AdminTournamentRow[]>();
    items.forEach((row) => {
      const key = row.date || row.fromDate || "Unknown date";
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(row);
    });
    return Array.from(byDate.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
  }, [items]);

  const gameOptions = useMemo(() => {
    const base = [{ label: "All games", value: null as string | null }];
    const mapped = games.map((g) => ({ label: g.label, value: g.value }));
    return [...base, ...mapped];
  }, [games]);

  const selectedGameLabel =
    gameOptions.find((g) => g.value === selectedGame)?.label ??
    gameOptions[0]?.label ??
    "All games";

  useEffect(() => {
    if (!isAuthenticated || !isAdminUser(user)) return;
    let cancelled = false;
    setGamesLoading(true);
    setGamesError(null);
    fetchAdminGamesCatalog()
      .then((list) => {
        if (cancelled) return;
        setGames(
          list.map((g) => ({
            label: g.title,
            value: g.slug,
          })),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setGamesError("Could not load games");
      })
      .finally(() => {
        if (!cancelled) setGamesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const loadApplications = async (
    opts?: Partial<FetchAdminHostApplicationsParams>,
  ) => {
    if (!applicationsTournament) return;
    setApplicationsLoading(true);
    setApplicationsError(null);
    try {
      const list = await fetchAdminHostApplications({
        page: 1,
        limit: 50,
        status: "pending",
        ...opts,
      });
      const filtered = applicationsTournament.id
        ? list.filter(
            (app) =>
              !app.tournamentId ||
              app.tournamentId === applicationsTournament.id,
          )
        : list;
      setApplications(filtered);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load host applications";
      setApplicationsError(msg);
      Toast.show({ type: "error", text1: msg });
    } finally {
      setApplicationsLoading(false);
    }
  };

  const loadAvailableHosts = async (
    opts?: Partial<FetchAdminUsersParams>,
  ) => {
    setHostsLoading(true);
    setHostsError(null);
    try {
      const page = await fetchAdminUsers({
        page: 1,
        limit: 50,
        role: "HOST",
        ...opts,
      });
      setHosts(page.items);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load hosts";
      setHostsError(msg);
      Toast.show({ type: "error", text1: msg });
    } finally {
      setHostsLoading(false);
    }
  };

  const openApplicationsModal = (row: AdminTournamentRow) => {
    setApplicationsTournament(row);
    setApplicationsTab("applications");
    setApplications([]);
    setHosts([]);
    setApplicationsModalOpen(true);
    void loadApplications();
    void loadAvailableHosts();
  };

  const handleApproveApplication = async (
    application: AdminHostApplication,
  ) => {
    dispatch(showLoader());
    try {
      await approveAdminHostApplication(application.id);
      Toast.show({
        type: "success",
        text1: "Host application approved",
      });
      await loadApplications();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to approve application";
      Toast.show({ type: "error", text1: msg });
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleRejectApplication = async (
    application: AdminHostApplication,
  ) => {
    dispatch(showLoader());
    try {
      await rejectAdminHostApplication(application.id, {
        adminNotes: application.adminNotes,
      });
      Toast.show({
        type: "success",
        text1: "Host application rejected",
      });
      await loadApplications();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to reject application";
      Toast.show({ type: "error", text1: msg });
    } finally {
      dispatch(hideLoader());
    }
  };

  if (!isAuthenticated || !isAdminUser(user)) {
    return <Redirect href={ROUTES.HOME} />;
  }

  return (
    <Screen scroll keyboardAvoid padded>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: h(32) }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: h(8),
          }}
        >
        </View>


        <Card style={{ marginBottom: h(12) }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: h(8),
            }}
          >
            <Text
              style={{
                fontSize: w(15),
                fontWeight: "700",
                color: colors.text,
              }}
            >
              Filters
            </Text>
            <Pressable
              onPress={() => {
                if (!isRefreshing) void load({ silent: true });
              }}
              hitSlop={8}
              style={{
                width: w(32),
                height: w(32),
                borderRadius: w(16),
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
                opacity: isRefreshing ? 0.5 : 1,
                backgroundColor: colors.cardBg,
              }}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <FontAwesome name="refresh" size={w(16)} color={colors.tint} />
              )}
            </Pressable>
          </View>
          <Text
            style={{
              fontSize: w(11),
              fontWeight: "700",
              color: colors.tabIconDefault,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: h(6),
            }}
          >
            Game
          </Text>
          <Pressable
            onPress={() => setGamePickerOpen(true)}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: w(10),
              paddingVertical: h(10),
              paddingHorizontal: w(12),
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: colors.inputBg,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: w(14),
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {selectedGameLabel}
              </Text>
              <Text
                style={{
                  fontSize: w(11),
                  color: colors.tabIconDefault,
                  marginTop: h(2),
                }}
              >
                Filter tournaments by game (e.g. Free Fire, BGMI).
              </Text>
            </View>
            <FontAwesome
              name="chevron-down"
              size={w(16)}
              color={colors.tabIconDefault}
            />
          </Pressable>

          {gamesLoading ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: h(8),
                gap: w(8),
              }}
            >
              <ActivityIndicator size="small" color={colors.tint} />
              <Text
                style={{
                  fontSize: w(11),
                  color: colors.tabIconDefault,
                }}
              >
                Loading games…
              </Text>
            </View>
          ) : null}
          {gamesError ? (
            <Text
              style={{
                fontSize: w(11),
                color: "#dc2626",
                marginTop: h(6),
              }}
            >
              {gamesError}
            </Text>
          ) : null}

          <Text
            style={{
              fontSize: w(11),
              fontWeight: "700",
              color: colors.tabIconDefault,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginTop: h(14),
              marginBottom: h(6),
            }}
          >
            Status
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: w(8) }}>
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setStatus(opt.value)}
                style={[
                  styles.chip,
                  {
                    paddingHorizontal: w(12),
                    paddingVertical: h(8),
                    borderRadius: w(8),
                    borderWidth: 1,
                    borderColor:
                      status === opt.value ? colors.tint : colors.border,
                    backgroundColor:
                      status === opt.value ? colors.tint + "22" : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: w(13),
                    fontWeight: "600",
                    color: status === opt.value ? colors.tint : colors.text,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View
            style={{
              marginTop: h(12),
            }}
          > 
          </View>
        </Card>

        <Card>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: h(8),
            }}
          >
            <Text
              style={{
                fontSize: w(15),
                fontWeight: "700",
                color: colors.text,
              }}
            >
              Tournaments
            </Text>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : hasItems ? (
              <Text
                style={{
                  fontSize: w(12),
                  color: colors.tabIconDefault,
                }}
              >
                {items.length} item{items.length === 1 ? "" : "s"}
              </Text>
            ) : null}
          </View>

          {error && !isLoading ? (
            <View
              style={{
                paddingVertical: h(10),
              }}
            >
              <Text
                style={{
                  fontSize: w(12),
                  color: "#dc2626",
                  marginBottom: h(6),
                }}
              >
                {error}
              </Text>
              <Button
                title="Retry"
                variant="outline"
                onPress={() => {
                  void load();
                }}
              />
            </View>
          ) : null}

          {!isLoading && !error && !hasItems ? (
            <View
              style={{
                alignItems: "center",
                paddingVertical: h(18),
              }}
            >
              <FontAwesome
                name="calendar-o"
                size={w(32)}
                color={colors.tabIconDefault}
              />
              <Text
                style={{
                  marginTop: h(8),
                  fontSize: w(14),
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                No tournaments found
              </Text>
              <Text
                style={{
                  marginTop: h(4),
                  fontSize: w(12),
                  color: colors.tabIconDefault,
                  textAlign: "center",
                }}
              >
                Change the status filter or create new lobbies from the
                Tournament screen.
              </Text>
            </View>
          ) : null}

          {grouped.map(([dateKey, rows]) => (
            <View key={dateKey} style={{ marginTop: h(10) }}>
              <Text
                style={{
                  fontSize: w(13),
                  fontWeight: "700",
                  color: colors.tabIconDefault,
                  marginBottom: h(4),
                }}
              >
                {formatDateDdMmYyyy(dateKey) || dateKey}
              </Text>
              {rows.map((row) => {
                const label =
                  row.lobbyName ||
                  row.name ||
                  row.game ||
                  row.mode ||
                  row.id.slice(0, 8).toUpperCase();
                const subtitleParts: string[] = [];
                if (row.game) subtitleParts.push(row.game);
                if (row.mode) subtitleParts.push(row.mode);
                if (row.subMode) subtitleParts.push(row.subMode);
                const subtitle = subtitleParts.join(" · ");

                const startTime =
                  row.startTime && row.startTime.includes("T")
                    ? new Date(row.startTime).toLocaleTimeString("en-IN", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : row.startTime;

                const totalSlots =
                  row.maxTeams != null ? String(row.maxTeams) : undefined;
                const joinedTeamsRaw = (row as { joinedTeams?: unknown }).joinedTeams;
                const joinedFromTeams =
                  Array.isArray(joinedTeamsRaw) && joinedTeamsRaw.length > 0
                    ? joinedTeamsRaw.length
                    : undefined;
                const joinedCount = row.joinedCount ?? joinedFromTeams;
                const joined =
                  joinedCount != null ? String(joinedCount) : undefined;
                const available =
                  row.slotsAvailable != null
                    ? String(row.slotsAvailable)
                    : row.maxTeams != null && joinedCount != null
                      ? String(Math.max(0, row.maxTeams - joinedCount))
                      : undefined;

                const statusColor =
                  row.status === "upcoming"
                    ? "#f97316"
                    : row.status === "live"
                      ? "#22c55e"
                      : row.status === "cancelled"
                        ? "#ef4444"
                        : row.status === "completed"
                          ? "#eab308"
                          : colors.tabIconDefault;

                return (
                  <View
                    key={row.id}
                    style={{
                      paddingVertical: h(10),
                      paddingHorizontal: w(12),
                      borderRadius: w(10),
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.cardBg,
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: h(6),
                    }}
                  >
                    <View
                      style={{
                        width: w(32),
                        height: w(32),
                        borderRadius: w(16),
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.tint + "22",
                        marginRight: w(10),
                      }}
                    >
                      <FontAwesome
                        name="trophy"
                        size={w(16)}
                        color={colors.tint}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: w(14),
                          fontWeight: "600",
                          color: colors.text,
                        }}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                      {subtitle ? (
                        <Text
                          style={{
                            fontSize: w(12),
                            color: colors.tabIconDefault,
                            marginTop: h(2),
                          }}
                          numberOfLines={1}
                        >
                          {subtitle}
                        </Text>
                      ) : null}
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          marginTop: h(6),
                          gap: w(10),
                        }}
                      >
                        {startTime ? (
                          <Text
                            style={{
                              fontSize: w(11),
                              color: colors.tabIconDefault,
                            }}
                          >
                            Start: {startTime}
                          </Text>
                        ) : null}
                        {totalSlots ? (
                          <Text
                            style={{
                              fontSize: w(11),
                              color: colors.tabIconDefault,
                            }}
                          >
                            Slots: {totalSlots}
                          </Text>
                        ) : null}
                        {available ? (
                          <Text
                            style={{
                              fontSize: w(11),
                              color: colors.tabIconDefault,
                            }}
                          >
                            Available: {available}
                          </Text>
                        ) : null}
                        {joined ? (
                          <Text
                            style={{
                              fontSize: w(11),
                              color: colors.tabIconDefault,
                            }}
                          >
                            Joined: {joined}
                          </Text>
                        ) : null}
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          marginTop: h(4),
                          gap: w(10),
                        }}
                      >
                        {row.entryFee != null ? (
                          <Text
                            style={{
                              fontSize: w(11),
                              color: colors.tabIconDefault,
                            }}
                          >
                            Entry fee: ₹{row.entryFee}
                          </Text>
                        ) : null}
                        {row.winnerPrizePool != null ? (
                          <Text
                            style={{
                              fontSize: w(11),
                              color: colors.tabIconDefault,
                            }}
                          >
                            Winner pool: ₹{row.winnerPrizePool}
                          </Text>
                        ) : null}
                        {row.totalPrizePool != null ? (
                          <Text
                            style={{
                              fontSize: w(11),
                              color: colors.tabIconDefault,
                            }}
                          >
                            Total pool: ₹{row.totalPrizePool}
                          </Text>
                        ) : null}
                        {row.totalFees != null ? (
                          <Text
                            style={{
                              fontSize: w(11),
                              color: colors.tabIconDefault,
                            }}
                          >
                            Fees: ₹{row.totalFees}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={{ marginLeft: w(8), alignItems: "flex-end" }}>
                      {row.status ? (
                        <Text
                          style={{
                            fontSize: w(11),
                            color: statusColor,
                            textTransform: "capitalize",
                          }}
                        >
                          {row.status}
                        </Text>
                      ) : null}
                      {row.lobbyCount != null ? (
                        <Text
                          style={{
                            fontSize: w(11),
                            color: colors.tabIconDefault,
                            marginTop: h(2),
                          }}
                        >
                          {row.lobbyCount} lobby
                          {row.lobbyCount === 1 ? "" : "ies"}
                        </Text>
                      ) : null}
                      <View
                        style={{
                          flexDirection: "row",
                          marginTop: h(8),
                          gap: w(8),
                        }}
                      >
                        <Pressable
                          style={{
                            paddingHorizontal: w(10),
                            paddingVertical: h(6),
                            borderRadius: w(8),
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.cardBg,
                          }}
                          onPress={() => openApplicationsModal(row)}
                        >
                          <Text
                            style={{
                              fontSize: w(11),
                              color: colors.tint,
                              fontWeight: "600",
                            }}
                          >
                            View applications
                          </Text>
                        </Pressable>
                        <Pressable
                          style={{
                            paddingHorizontal: w(10),
                            paddingVertical: h(6),
                            borderRadius: w(8),
                            borderWidth: 1,
                            borderColor: "#b91c1c",
                            backgroundColor: "#450a0a",
                          }}
                          onPress={() => {
                            Toast.show({
                              type: "info",
                              text1: "Cancel lobby not wired yet",
                            });
                          }}
                        >
                          <Text
                            style={{
                              fontSize: w(11),
                              color: "#fca5a5",
                              fontWeight: "600",
                            }}
                          >
                            Cancel
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </Card>
      </ScrollView>

      {gamePickerOpen ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setGamePickerOpen(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              paddingHorizontal: w(20),
              paddingVertical: h(24),
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close game filter"
              onPress={() => setGamePickerOpen(false)}
              style={StyleSheet.absoluteFillObject}
            />
            <View
              pointerEvents="box-none"
              style={{
                width: "100%",
                maxWidth: 440,
                alignSelf: "center",
                borderRadius: w(16),
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.cardBg ?? colors.background,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: w(16),
                  paddingVertical: h(12),
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: w(16),
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  Filter by game
                </Text>
                <Pressable
                  onPress={() => setGamePickerOpen(false)}
                  hitSlop={12}
                >
                  <Text
                    style={{
                      color: colors.tint,
                      fontWeight: "600",
                      fontSize: w(15),
                    }}
                  >
                    Close
                  </Text>
                </Pressable>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: h(320) }}
              >
                {gameOptions.map((g) => {
                  const isSelected = g.value === selectedGame;
                  return (
                    <Pressable
                      key={g.label}
                      onPress={() => {
                        setSelectedGame(g.value);
                        setGamePickerOpen(false);
                      }}
                      style={{
                        paddingHorizontal: w(16),
                        paddingVertical: h(12),
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border,
                        backgroundColor: isSelected
                          ? colors.tint + "18"
                          : "transparent",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: w(15),
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {g.label}
                      </Text>
                      {isSelected ? (
                        <FontAwesome
                          name="check"
                          size={w(16)}
                          color={colors.tint}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}

      {applicationsModalOpen && applicationsTournament ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setApplicationsModalOpen(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              paddingHorizontal: w(20),
              paddingVertical: h(24),
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close applications"
              onPress={() => setApplicationsModalOpen(false)}
              style={StyleSheet.absoluteFillObject}
            />
            <View
              pointerEvents="box-none"
              style={{
                width: "100%",
                maxWidth: 520,
                alignSelf: "center",
                borderRadius: w(16),
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.cardBg ?? colors.background,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  paddingHorizontal: w(16),
                  paddingVertical: h(12),
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: h(6),
                  }}
                >
                  <Text
                    style={{
                      fontSize: w(16),
                      fontWeight: "700",
                      color: colors.text,
                    }}
                    numberOfLines={1}
                  >
                    {applicationsTournament.lobbyName ||
                      applicationsTournament.name ||
                      "Tournament applications"}
                  </Text>
                  <Pressable
                    onPress={() => setApplicationsModalOpen(false)}
                    hitSlop={12}
                  >
                    <Text
                      style={{
                        color: colors.tint,
                        fontWeight: "600",
                        fontSize: w(15),
                      }}
                    >
                      Close
                    </Text>
                  </Pressable>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    borderRadius: w(8),
                    borderWidth: 1,
                    borderColor: colors.border,
                    overflow: "hidden",
                  }}
                >
                  {["applications", "availableHosts"].map((key) => {
                    const value = key as typeof applicationsTab;
                    const selected = applicationsTab === value;
                    const label =
                      value === "applications"
                        ? "Applications"
                        : "Available hosts";
                    return (
                      <Pressable
                        key={value}
                        onPress={() => setApplicationsTab(value)}
                        style={{
                          flex: 1,
                          paddingVertical: h(8),
                          alignItems: "center",
                          backgroundColor: selected
                            ? colors.tint + "22"
                            : colors.cardBg ?? colors.background,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: w(13),
                            fontWeight: "600",
                            color: selected ? colors.tint : colors.text,
                          }}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: h(420) }}
                contentContainerStyle={{ paddingHorizontal: w(16), paddingVertical: h(10) }}
              >
                {applicationsTab === "applications" ? (
                  <>
                    {applicationsLoading ? (
                      <View
                        style={{
                          alignItems: "center",
                          paddingVertical: h(16),
                        }}
                      >
                        <ActivityIndicator size="small" color={colors.tint} />
                      </View>
                    ) : null}
                    {applicationsError && !applicationsLoading ? (
                      <View
                        style={{
                          paddingVertical: h(10),
                        }}
                      >
                        <Text
                          style={{
                            fontSize: w(12),
                            color: "#dc2626",
                            marginBottom: h(6),
                          }}
                        >
                          {applicationsError}
                        </Text>
                        <Button
                          title="Retry"
                          variant="outline"
                          onPress={() => {
                            void loadApplications();
                          }}
                        />
                      </View>
                    ) : null}
                    {!applicationsLoading &&
                    !applicationsError &&
                    applications.length === 0 ? (
                      <View
                        style={{
                          alignItems: "center",
                          paddingVertical: h(18),
                        }}
                      >
                        <FontAwesome
                          name="users"
                          size={w(28)}
                          color={colors.tabIconDefault}
                        />
                        <Text
                          style={{
                            marginTop: h(8),
                            fontSize: w(14),
                            fontWeight: "600",
                            color: colors.text,
                          }}
                        >
                          No host applications yet
                        </Text>
                        <Text
                          style={{
                            marginTop: h(4),
                            fontSize: w(12),
                            color: colors.tabIconDefault,
                            textAlign: "center",
                          }}
                        >
                          Hosts can apply from their panel. New requests will show
                          here automatically after refresh.
                        </Text>
                      </View>
                    ) : null}
                    {applications.map((app) => {
                      const statusLabel = app.status ?? "pending";
                      const isPending =
                        !app.status || app.status.toLowerCase() === "pending";
                      const statusColor =
                        statusLabel.toLowerCase() === "approved"
                          ? "#22c55e"
                          : statusLabel.toLowerCase() === "rejected"
                            ? "#ef4444"
                            : colors.tabIconDefault;
                      return (
                        <View
                          key={app.id}
                          style={{
                            marginBottom: h(8),
                            paddingVertical: h(10),
                            paddingHorizontal: w(12),
                            borderRadius: w(10),
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.cardBg,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: w(14),
                              fontWeight: "600",
                              color: colors.text,
                            }}
                          >
                            {app.hostName || app.hostEmail || "Unknown host"}
                          </Text>
                          {app.hostEmail ? (
                            <Text
                              style={{
                                fontSize: w(12),
                                color: colors.tabIconDefault,
                                marginTop: h(2),
                              }}
                            >
                              {app.hostEmail}
                            </Text>
                          ) : null}
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginTop: h(8),
                            }}
                          >
                            <Text
                              style={{
                                fontSize: w(11),
                                color: statusColor,
                                textTransform: "capitalize",
                              }}
                            >
                              {statusLabel}
                            </Text>
                            {isPending ? (
                              <View
                                style={{
                                  flexDirection: "row",
                                  gap: w(8),
                                }}
                              >
                                <Pressable
                                  onPress={() => {
                                    void handleRejectApplication(app);
                                  }}
                                  style={{
                                    paddingHorizontal: w(10),
                                    paddingVertical: h(6),
                                    borderRadius: w(8),
                                    borderWidth: 1,
                                    borderColor: "#b91c1c",
                                    backgroundColor: "#450a0a",
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: w(11),
                                      color: "#fecaca",
                                      fontWeight: "600",
                                    }}
                                  >
                                    Reject
                                  </Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => {
                                    void handleApproveApplication(app);
                                  }}
                                  style={{
                                    paddingHorizontal: w(10),
                                    paddingVertical: h(6),
                                    borderRadius: w(8),
                                    borderWidth: 1,
                                    borderColor: colors.tint,
                                    backgroundColor: colors.tint + "22",
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: w(11),
                                      color: colors.tint,
                                      fontWeight: "600",
                                    }}
                                  >
                                    Approve & assign
                                  </Text>
                                </Pressable>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </>
                ) : (
                  <>
                    {hostsLoading ? (
                      <View
                        style={{
                          alignItems: "center",
                          paddingVertical: h(16),
                        }}
                      >
                        <ActivityIndicator size="small" color={colors.tint} />
                      </View>
                    ) : null}
                    {hostsError && !hostsLoading ? (
                      <View
                        style={{
                          paddingVertical: h(10),
                        }}
                      >
                        <Text
                          style={{
                            fontSize: w(12),
                            color: "#dc2626",
                            marginBottom: h(6),
                          }}
                        >
                          {hostsError}
                        </Text>
                        <Button
                          title="Retry"
                          variant="outline"
                          onPress={() => {
                            void loadAvailableHosts();
                          }}
                        />
                      </View>
                    ) : null}
                    {!hostsLoading && !hostsError && hosts.length === 0 ? (
                      <View
                        style={{
                          alignItems: "center",
                          paddingVertical: h(18),
                        }}
                      >
                        <FontAwesome
                          name="user-o"
                          size={w(28)}
                          color={colors.tabIconDefault}
                        />
                        <Text
                          style={{
                            marginTop: h(8),
                            fontSize: w(14),
                            fontWeight: "600",
                            color: colors.text,
                          }}
                        >
                          No hosts found
                        </Text>
                        <Text
                          style={{
                            marginTop: h(4),
                            fontSize: w(12),
                            color: colors.tabIconDefault,
                            textAlign: "center",
                          }}
                        >
                          Use admin users screen to create or manage hosts.
                        </Text>
                      </View>
                    ) : null}
                    {hosts.map((host) => (
                      <View
                        key={host.id}
                        style={{
                          marginBottom: h(8),
                          paddingVertical: h(10),
                          paddingHorizontal: w(12),
                          borderRadius: w(10),
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.cardBg,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: w(14),
                            fontWeight: "600",
                            color: colors.text,
                          }}
                        >
                          {host.displayName || host.fullName || host.name || host.email}
                        </Text>
                        <Text
                          style={{
                            fontSize: w(12),
                            color: colors.tabIconDefault,
                            marginTop: h(2),
                          }}
                        >
                          {host.email}
                        </Text>
                        <Text
                          style={{
                            fontSize: w(11),
                            color: colors.tabIconDefault,
                            marginTop: h(4),
                          }}
                        >
                          Assigning a host directly may depend on backend support; approving
                          an application is the primary flow.
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
  },
});

