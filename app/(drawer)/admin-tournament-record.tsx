import { Button, Card, Screen } from "@/components/ui";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/context/ResponsiveContext";
import {
  approveAdminHostApplication,
  assignAdminTournamentHost,
  buildAdminHostApplicationsStreamUrl,
  fetchAdminGamesCatalog,
  fetchAdminHostApplications,
  fetchAdminTournaments,
  fetchAdminUsers,
  rejectAdminHostApplication,
  type FetchAdminHostApplicationsParams,
  type FetchAdminUsersParams,
} from "@/services/admin.service";
import { getToken } from "@/services/common.service";
import { ApiError } from "@/services/api.service";
import { useAppDispatch } from "@/store/hooks";
import { hideLoader, showLoader } from "@/store/slices/loaderSlice";
import type {
  AdminHostApplication,
  AdminTournamentRow,
  AdminUserRow,
} from "@/types/admin";
import { canAccessLobbyRecordsUI, isHostUser } from "@/utils/adminUser";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Redirect } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { formatDateDdMmYyyy } from "@/utils/date";
import { HostLobbyRecords } from "@/components/host/HostLobbyRecords";

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

function isHostAssignConflictError(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false;
  const code = e.statusCode;
  if (code === 409 || code === 422) return true;
  const m = e.message.toLowerCase();
  return (
    m.includes("conflict") ||
    m.includes("overlap") ||
    m.includes("already assigned") ||
    m.includes("time slot") ||
    m.includes("scheduling") ||
    m.includes("forceassign")
  );
}

export default function AdminTournamentRecordScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { w, h, isSmallDevice } = useResponsive();
  const { user, isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();

  const [status, setStatus] = useState<StatusFilter>("upcoming");
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
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
  const [assigningHostId, setAssigningHostId] = useState<string | null>(null);

  const applicationsTournamentRef = useRef<AdminTournamentRow | null>(null);
  const applicationsModalOpenRef = useRef(false);
  const loadRef = useRef<(opts?: { silent?: boolean }) => Promise<void>>(
    async () => {},
  );
  const loadApplicationsRef = useRef<
    (opts?: Partial<FetchAdminHostApplicationsParams> & {
      forTournament?: AdminTournamentRow | null;
    }) => Promise<void>
  >(async () => {});

  useEffect(() => {
    applicationsTournamentRef.current = applicationsTournament;
  }, [applicationsTournament]);

  useEffect(() => {
    applicationsModalOpenRef.current = applicationsModalOpen;
  }, [applicationsModalOpen]);

  const load = async (opts?: { silent?: boolean }) => {
    if (!isAuthenticated || !canAccessLobbyRecordsUI(user) || isHostUser(user))
      return;
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

  loadRef.current = load;

  useEffect(() => {
    if (isHostUser(user)) return;
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

  const selectedStatusLabel =
    STATUS_OPTIONS.find((s) => s.value === status)?.label ?? "Upcoming";

  useEffect(() => {
    if (
      !isAuthenticated ||
      !canAccessLobbyRecordsUI(user) ||
      isHostUser(user)
    )
      return;
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
    opts?: Partial<FetchAdminHostApplicationsParams> & {
      forTournament?: AdminTournamentRow | null;
    },
  ) => {
    const { forTournament, ...apiOpts } = opts ?? {};
    const tournament = forTournament ?? applicationsTournament;
    if (!tournament) return;
    setApplicationsLoading(true);
    setApplicationsError(null);
    try {
      const list = await fetchAdminHostApplications({
        page: 1,
        limit: 50,
        status: "pending",
        ...apiOpts,
      });
      const filtered = tournament.id
        ? list.filter(
            (app) =>
              !app.tournamentId ||
              app.tournamentId === tournament.id,
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

  loadApplicationsRef.current = loadApplications;

  /** Web: SSE host-application events; native: periodic silent list refresh. */
  useEffect(() => {
    if (!isAuthenticated || !canAccessLobbyRecordsUI(user) || isHostUser(user))
      return;

    let es: EventSource | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    const token = getToken();

    const handleHostApplicationEvent = (raw: string) => {
      let msg: { type?: string } = {};
      try {
        msg = JSON.parse(raw) as { type?: string };
      } catch {
        return;
      }
      if (msg.type === "submitted") {
        Toast.show({
          type: "info",
          text1: "New host application",
        });
      }
      void loadRef.current({ silent: true });
      if (applicationsModalOpenRef.current) {
        const t = applicationsTournamentRef.current;
        if (t) void loadApplicationsRef.current({ forTournament: t });
      }
    };

    if (Platform.OS === "web" && typeof EventSource !== "undefined" && token) {
      try {
        es = new EventSource(buildAdminHostApplicationsStreamUrl(token));
        es.addEventListener("host_application", (ev: MessageEvent) =>
          handleHostApplicationEvent(String(ev.data)),
        );
        es.onerror = () => {};
      } catch {
        es = null;
      }
    }

    if (!es && token) {
      interval = setInterval(() => {
        void loadRef.current({ silent: true });
        if (applicationsModalOpenRef.current) {
          const t = applicationsTournamentRef.current;
          if (t) void loadApplicationsRef.current({ forTournament: t });
        }
      }, 60000);
    }

    return () => {
      es?.close();
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, user?.id]);

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
      await load({ silent: true });
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

  const runAssignHost = async (host: AdminUserRow, forceAssign: boolean) => {
    const tid = applicationsTournament?.id;
    if (!tid) return;
    setAssigningHostId(host.id);
    dispatch(showLoader());
    try {
      await assignAdminTournamentHost({
        tournamentId: tid,
        hostId: host.id,
        forceAssign,
      });
      Toast.show({ type: "success", text1: "Host assigned" });
      await load({ silent: true });
      await loadApplications();
    } catch (e) {
      if (!forceAssign && isHostAssignConflictError(e)) {
        const detail =
          e instanceof ApiError
            ? e.message
            : "This host may have another assignment at this time.";
        Alert.alert("Scheduling conflict", `${detail}\n\nAssign anyway?`, [
          { text: "No", style: "cancel" },
          {
            text: "Yes",
            onPress: () => {
              void runAssignHost(host, true);
            },
          },
        ]);
      } else {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Failed to assign host";
        Toast.show({ type: "error", text1: msg });
      }
    } finally {
      dispatch(hideLoader());
      setAssigningHostId(null);
    }
  };

  const promptAssignHost = (host: AdminUserRow) => {
    if (!applicationsTournament?.id) return;
    const label =
      host.displayName || host.fullName || host.name || host.email || "this host";
    Alert.alert(
      "Assign host",
      `Assign ${label} to this tournament?`,
      [
        { text: "No", style: "cancel" },
        { text: "Yes", onPress: () => void runAssignHost(host, false) },
      ],
    );
  };

  if (!isAuthenticated || !canAccessLobbyRecordsUI(user)) {
    return <Redirect href={ROUTES.HOME} />;
  }

  if (isHostUser(user)) {
    return (
      <Screen scroll keyboardAvoid padded>
        <HostLobbyRecords />
      </Screen>
    );
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
              {!isSmallDevice ? (
                <Text
                  style={{
                    fontSize: w(11),
                    color: colors.tabIconDefault,
                    marginTop: h(2),
                  }}
                >
                  Filter tournaments by game (e.g. Free Fire, BGMI).
                </Text>
              ) : null}
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
              marginTop: h(10),
              marginBottom: h(6),
            }}
          >
            Status
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tournament status filter"
            onPress={() => setStatusPickerOpen(true)}
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
            <Text
              style={{
                fontSize: w(14),
                fontWeight: "700",
                color: colors.text,
                flex: 1,
                marginRight: w(8),
              }}
              numberOfLines={1}
            >
              {selectedStatusLabel}
            </Text>
            <FontAwesome
              name="chevron-down"
              size={w(16)}
              color={colors.tabIconDefault}
            />
          </Pressable>
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
                  joinedCount != null
                    ? String(joinedCount)
                    : row.maxTeams != null
                      ? "0"
                      : undefined;
                const availableSlots =
                  row.maxTeams != null && row.slotsAvailable != null
                    ? String(row.slotsAvailable)
                    : row.maxTeams != null
                      ? String(
                          Math.max(
                            0,
                            row.maxTeams - (joinedCount ?? 0),
                          ),
                        )
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

                const rowStatus = row.status as StatusFilter | undefined;
                const statusLabel =
                  (rowStatus &&
                    STATUS_OPTIONS.find((o) => o.value === rowStatus)?.label) ??
                  (row.status
                    ? row.status.replace(/([A-Z])/g, " $1").trim()
                    : "");

                const statCells: { key: string; caption: string; value: string }[] =
                  [];
                if (startTime)
                  statCells.push({
                    key: "start",
                    caption: "Start",
                    value: startTime,
                  });
                if (totalSlots)
                  statCells.push({
                    key: "slots",
                    caption: "Total slots",
                    value: totalSlots,
                  });
                if (joined)
                  statCells.push({
                    key: "joined",
                    caption: "Joined",
                    value: joined,
                  });
                if (availableSlots)
                  statCells.push({
                    key: "available",
                    caption: "Available slots",
                    value: availableSlots,
                  });
                if (row.entryFee != null)
                  statCells.push({
                    key: "entry",
                    caption: "Entry fee",
                    value: `₹${row.entryFee}`,
                  });
                if (row.winnerPrizePool != null)
                  statCells.push({
                    key: "winner",
                    caption: "Winner pool",
                    value: `₹${row.winnerPrizePool}`,
                  });
                if (row.totalPrizePool != null)
                  statCells.push({
                    key: "total",
                    caption: "Total pool",
                    value: `₹${row.totalPrizePool}`,
                  });
                if (row.totalFees != null)
                  statCells.push({
                    key: "fees",
                    caption: "Fees",
                    value: `₹${row.totalFees}`,
                  });

                const statColWidth = isSmallDevice ? "48%" : "31%";

                const hasAssignedHost = Boolean(
                  row.assignedHostId ||
                    row.assignedHostName ||
                    row.assignedHostEmail,
                );
                const assignedHostLine =
                  row.assignedHostName || row.assignedHostEmail
                    ? [row.assignedHostName, row.assignedHostEmail]
                        .filter(Boolean)
                        .join(" · ")
                    : "Host confirmed";

                return (
                  <View
                    key={row.id}
                    style={{
                      paddingVertical: h(14),
                      paddingHorizontal: w(14),
                      borderRadius: w(12),
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.cardBg,
                      marginBottom: h(10),
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                      }}
                    >
                      <View
                        style={{
                          width: w(40),
                          height: w(40),
                          borderRadius: w(20),
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: colors.tint + "22",
                          marginRight: w(12),
                        }}
                      >
                        <FontAwesome
                          name="trophy"
                          size={w(18)}
                          color={colors.tint}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, paddingRight: w(6) }}>
                        <Text
                          style={{
                            fontSize: w(15),
                            fontWeight: "700",
                            color: colors.text,
                            lineHeight: w(20),
                          }}
                          numberOfLines={2}
                        >
                          {label}
                        </Text>
                        {subtitle ? (
                          <Text
                            style={{
                              fontSize: w(12),
                              color: colors.tabIconDefault,
                              marginTop: h(4),
                              lineHeight: w(16),
                            }}
                            numberOfLines={2}
                          >
                            {subtitle}
                          </Text>
                        ) : null}
                      </View>
                      {statusLabel ? (
                        <View
                          style={{
                            borderWidth: 1,
                            borderColor: statusColor + "55",
                            backgroundColor: statusColor + "18",
                            paddingHorizontal: w(8),
                            paddingVertical: h(4),
                            borderRadius: w(8),
                            maxWidth: "42%",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: w(11),
                              fontWeight: "700",
                              color: statusColor,
                            }}
                            numberOfLines={2}
                          >
                            {statusLabel}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {row.lobbyCount != null ? (
                      <Text
                        style={{
                          fontSize: w(11),
                          color: colors.tabIconDefault,
                          marginTop: h(8),
                          marginLeft: w(52),
                        }}
                      >
                        {row.lobbyCount} lobby
                        {row.lobbyCount === 1 ? "" : "ies"}
                      </Text>
                    ) : null}

                    {statCells.length > 0 ? (
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          marginTop: h(14),
                          paddingTop: h(4),
                          gap: w(10),
                        }}
                      >
                        {statCells.map((cell) => (
                          <View
                            key={cell.key}
                            style={{ width: statColWidth }}
                          >
                            <Text
                              style={{
                                fontSize: w(11),
                                color: colors.tabIconDefault,
                                fontWeight: "600",
                              }}
                              numberOfLines={1}
                            >
                              {cell.caption}
                            </Text>
                            <Text
                              style={{
                                fontSize: w(13),
                                fontWeight: "600",
                                color: colors.text,
                                marginTop: h(4),
                              }}
                              numberOfLines={2}
                            >
                              {cell.value}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {hasAssignedHost ? (
                      <View
                        style={{
                          marginTop: h(16),
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: h(12),
                          paddingHorizontal: w(12),
                          borderRadius: w(10),
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: "#22c55e59",
                          backgroundColor: scheme === "dark" ? "#14532d38" : "#22c55e14",
                          gap: w(12),
                        }}
                      >
                        <View
                          style={{
                            width: w(40),
                            height: w(40),
                            borderRadius: w(20),
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#22c55e28",
                          }}
                        >
                          <FontAwesome
                            name="user"
                            size={w(18)}
                            color="#4ade80"
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={{
                              fontSize: w(10),
                              fontWeight: "700",
                              color: "#4ade80",
                              textTransform: "uppercase",
                              letterSpacing: 0.7,
                            }}
                            numberOfLines={1}
                          >
                            Assigned host
                          </Text>
                          <Text
                            style={{
                              fontSize: w(14),
                              fontWeight: "700",
                              color: colors.text,
                              marginTop: h(5),
                              lineHeight: w(19),
                            }}
                            numberOfLines={3}
                          >
                            {assignedHostLine}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    <View
                      style={{
                        flexDirection: isSmallDevice ? "column" : "row",
                        marginTop: hasAssignedHost ? h(12) : h(16),
                        gap: h(10),
                      }}
                    >
                      {!hasAssignedHost ? (
                      <Pressable
                        style={{
                          flex: isSmallDevice ? undefined : 1,
                          paddingVertical: h(12),
                          paddingHorizontal: w(12),
                          borderRadius: w(10),
                          borderWidth: 1,
                          borderColor: colors.tint,
                          backgroundColor: colors.tint + "18",
                          alignItems: "center",
                        }}
                        onPress={() => openApplicationsModal(row)}
                      >
                        <Text
                          style={{
                            fontSize: w(12),
                            color: colors.tint,
                            fontWeight: "700",
                            textAlign: "center",
                          }}
                        >
                          View applications
                        </Text>
                      </Pressable>
                      ) : null}
                      <Pressable
                        style={{
                          flex: isSmallDevice ? undefined : 1,
                          paddingVertical: h(11),
                          paddingHorizontal: w(12),
                          borderRadius: w(10),
                          borderWidth: 1,
                          borderColor: hasAssignedHost
                            ? "#f8717188"
                            : "#b91c1c",
                          backgroundColor: hasAssignedHost
                            ? "transparent"
                            : "#450a0a",
                          alignItems: "center",
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
                            fontSize: w(12),
                            color: hasAssignedHost ? "#f87171" : "#fca5a5",
                            fontWeight: "700",
                            textAlign: "center",
                          }}
                        >
                          Cancel lobby
                        </Text>
                      </Pressable>
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

      {statusPickerOpen ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setStatusPickerOpen(false)}
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
              accessibilityLabel="Close status filter"
              onPress={() => setStatusPickerOpen(false)}
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
                  Filter by status
                </Text>
                <Pressable
                  onPress={() => setStatusPickerOpen(false)}
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
                style={{ maxHeight: h(280) }}
              >
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = status === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        setStatus(opt.value);
                        setStatusPickerOpen(false);
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
                        {opt.label}
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
                          Hosts can apply from their panel. On web, new
                          requests appear in real time; pull to refresh on
                          mobile.
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
                        <View style={{ marginTop: h(10) }}>
                          <Button
                            title={
                              assigningHostId === host.id ? "Assigning…" : "Assign"
                            }
                            variant="outline"
                            disabled={assigningHostId !== null}
                            onPress={() => promptAssignHost(host)}
                          />
                        </View>
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

