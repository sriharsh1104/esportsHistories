import { Button, ClassicEmptyState } from "@/components/ui";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useResponsive } from "@/context/ResponsiveContext";
import { ApiError } from "@/services/api.service";
import { getToken } from "@/services/common.service";
import {
  applyHostTournament,
  buildHostApplicationsStreamUrl,
  fetchHostAvailableTournaments,
  fetchHostMyLobbiesActive,
  fetchHostMyLobbiesHistory,
  updateHostTournamentRoom,
} from "@/services/host.service";
import { useAppDispatch } from "@/store/hooks";
import { hideLoader, showLoader } from "@/store/slices/loaderSlice";
import type { HostAssignedLobby, HostAvailableTournament } from "@/types/host";
import { formatDateDdMmYyyy } from "@/utils/date";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

type MainTab = "available" | "assigned";
type AssignedSub = "active" | "history";
type AvailFilter = "upcoming" | "locked";
type HistoryStatus = "completed" | "cancelled" | "result_pending";

const HISTORY_OPTIONS: { value: HistoryStatus; label: string }[] = [
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "result_pending", label: "Result pending" },
];

/** Match admin tournament list status pill styling. */
function hostListingStatusMeta(
  status: string | undefined,
  fallbackColor: string,
): { color: string; label: string } {
  const key = (status ?? "").toLowerCase().replace(/_/g, "");
  const color =
    key === "upcoming"
      ? "#f97316"
      : key === "live"
        ? "#22c55e"
        : key === "cancelled"
          ? "#ef4444"
          : key === "completed"
            ? "#eab308"
            : key === "pendingresult"
              ? "#6366f1"
              : key === "locked"
                ? "#a855f7"
                : fallbackColor;
  const labels: Record<string, string> = {
    upcoming: "Upcoming",
    live: "Live",
    completed: "Completed",
    cancelled: "Cancelled",
    pendingresult: "Pending result",
    locked: "Locked",
  };
  const label =
    labels[key] || (status ? status.replace(/([A-Z])/g, " $1").trim() : "");
  return { color, label };
}

export type HostLobbyRecordsProps = {
  /**
   * Use inside a parent `ScrollView` (e.g. Tournament tab). Skips outer scroll + page title
   * so the parent can provide section headings.
   */
  embedded?: boolean;
};

export function HostLobbyRecords({ embedded = false }: HostLobbyRecordsProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { w, h, isSmallDevice } = useResponsive();
  const dispatch = useAppDispatch();

  const [mainTab, setMainTab] = useState<MainTab>("available");

  const [availFilter, setAvailFilter] = useState<AvailFilter>("upcoming");
  const [availableItems, setAvailableItems] = useState<
    HostAvailableTournament[]
  >([]);
  const [availLoading, setAvailLoading] = useState(true);
  const [availRefreshing, setAvailRefreshing] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);
  const [availPage, setAvailPage] = useState(1);
  const [availHasMore, setAvailHasMore] = useState(false);

  const [assignedSub, setAssignedSub] = useState<AssignedSub>("active");
  const [activeGrouped, setActiveGrouped] = useState<
    { label: string; items: HostAssignedLobby[] }[]
  >([]);
  const [activeLoading, setActiveLoading] = useState(true);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [activeRefreshing, setActiveRefreshing] = useState(false);

  const [historyStatus, setHistoryStatus] =
    useState<HistoryStatus>("completed");
  const [historyItems, setHistoryItems] = useState<HostAssignedLobby[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);

  const [applyingTournamentId, setApplyingTournamentId] = useState<
    string | null
  >(null);

  const [roomModalLobby, setRoomModalLobby] =
    useState<HostAssignedLobby | null>(null);
  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  /** false = plain text visible by default; tap icon to mask. */
  const [roomPasswordMasked, setRoomPasswordMasked] = useState(false);
  const [roomSaving, setRoomSaving] = useState(false);

  const loadAvailable = useCallback(
    async (opts?: { page?: number; append?: boolean; silent?: boolean }) => {
      const page = opts?.page ?? 1;
      const append = opts?.append === true;
      if (!opts?.silent) {
        if (append) {
          /* spinner inline */
        } else {
          setAvailLoading(true);
        }
      } else {
        setAvailRefreshing(true);
      }
      setAvailError(null);
      const blockLoader = !opts?.silent && !append;
      try {
        if (blockLoader) dispatch(showLoader());
        const res = await fetchHostAvailableTournaments({
          page,
          limit: 10,
          status: availFilter,
        });
        setAvailPage(res.page);
        const more =
          res.totalPages != null
            ? res.page < res.totalPages
            : res.items.length >= res.limit;
        setAvailHasMore(more);
        if (append) {
          setAvailableItems((prev) => {
            const seen = new Set(prev.map((x) => x.id));
            const next = [...prev];
            for (const it of res.items) {
              if (!seen.has(it.id)) {
                seen.add(it.id);
                next.push(it);
              }
            }
            return next;
          });
        } else {
          setAvailableItems(res.items);
        }
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Could not load tournaments";
        setAvailError(msg);
        if (!append) setAvailableItems([]);
        Toast.show({ type: "error", text1: msg });
      } finally {
        setAvailLoading(false);
        setAvailRefreshing(false);
        if (blockLoader) dispatch(hideLoader());
      }
    },
    [availFilter, dispatch],
  );

  const loadActive = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setActiveLoading(true);
      else setActiveRefreshing(true);
      setActiveError(null);
      const blockLoader = !opts?.silent;
      try {
        if (blockLoader) dispatch(showLoader());
        const res = await fetchHostMyLobbiesActive();
        setActiveGrouped(res.sections);
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Could not load your lobbies";
        setActiveError(msg);
        setActiveGrouped([]);
        Toast.show({ type: "error", text1: msg });
      } finally {
        setActiveLoading(false);
        setActiveRefreshing(false);
        if (blockLoader) dispatch(hideLoader());
      }
    },
    [dispatch],
  );

  const loadAvailableRef = useRef(loadAvailable);
  const loadActiveRef = useRef(loadActive);
  loadAvailableRef.current = loadAvailable;
  loadActiveRef.current = loadActive;

  const loadHistory = useCallback(
    async (opts?: { page?: number; append?: boolean }) => {
      const page = opts?.page ?? 1;
      const append = opts?.append === true;
      if (!append) setHistoryLoading(true);
      setHistoryError(null);
      const blockLoader = !append;
      try {
        if (blockLoader) dispatch(showLoader());
        const res = await fetchHostMyLobbiesHistory({
          status: historyStatus,
          page,
          limit: 20,
        });
        setHistoryPage(res.page);
        const more =
          res.totalPages != null
            ? res.page < res.totalPages
            : res.items.length >= res.limit;
        setHistoryHasMore(more);
        if (append) {
          setHistoryItems((prev) => {
            const seen = new Set(prev.map((x) => x.id));
            const next = [...prev];
            for (const it of res.items) {
              if (!seen.has(it.id)) {
                seen.add(it.id);
                next.push(it);
              }
            }
            return next;
          });
        } else {
          setHistoryItems(res.items);
        }
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Could not load history";
        setHistoryError(msg);
        if (!append) setHistoryItems([]);
        Toast.show({ type: "error", text1: msg });
      } finally {
        setHistoryLoading(false);
        if (blockLoader) dispatch(hideLoader());
      }
    },
    [historyStatus, dispatch],
  );

  useEffect(() => {
    if (mainTab !== "available") return;
    setAvailPage(1);
    void loadAvailable({ page: 1 });
  }, [mainTab, availFilter, loadAvailable]);

  useEffect(() => {
    if (mainTab !== "assigned") return;
    if (assignedSub === "active") {
      void loadActive();
      return;
    }
    setHistoryPage(1);
    void loadHistory({ page: 1 });
  }, [mainTab, assignedSub, historyStatus, loadActive, loadHistory]);

  /** Web: SSE `/host/applications/stream`; native: periodic silent refresh. */
  useEffect(() => {
    let es: EventSource | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    const token = getToken();

    const handleHostApplication = (raw: string) => {
      try {
        const msg = JSON.parse(raw) as { type?: string };
        const ev = (msg.type ?? "").toLowerCase();
        if (ev === "approved" || ev === "rejected" || ev === "assigned") {
          if (ev === "rejected") {
            Toast.show({
              type: "info",
              text1: "Application rejected",
            });
          } else if (ev === "approved") {
            Toast.show({
              type: "success",
              text1: "Application approved",
            });
          } else {
            Toast.show({
              type: "success",
              text1: "You were assigned as host",
            });
          }
          void loadAvailableRef.current({ silent: true, page: 1 });
          void loadActiveRef.current({ silent: true });
        }
      } catch {
        /* ignore malformed frame */
      }
    };

    if (Platform.OS === "web" && typeof EventSource !== "undefined" && token) {
      try {
        es = new EventSource(buildHostApplicationsStreamUrl(token));
        es.addEventListener("host_application", (e: MessageEvent) =>
          handleHostApplication(String(e.data)),
        );
        es.onerror = () => {};
      } catch {
        es = null;
      }
    }

    if (!es && token) {
      interval = setInterval(() => {
        void loadAvailableRef.current({ silent: true, page: 1 });
        void loadActiveRef.current({ silent: true });
      }, 90000);
    }

    return () => {
      es?.close();
      if (interval) clearInterval(interval);
    };
  }, []);

  const directApply = async (t: HostAvailableTournament) => {
    const id = t.id;
    if (!id || applyingTournamentId) return;
    setApplyingTournamentId(id);
    try {
      dispatch(showLoader());
      await applyHostTournament(t.applyTournamentId, {
        applicationDetails: {},
      });
      Toast.show({ type: "success", text1: "Application submitted" });
      void loadAvailable({ page: 1 });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Apply failed";
      Toast.show({ type: "error", text1: msg });
    } finally {
      setApplyingTournamentId(null);
      dispatch(hideLoader());
    }
  };

  const tabChip = (active: boolean, label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: h(10),
        borderRadius: w(10),
        backgroundColor: active ? colors.tint : colors.border + "35",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontSize: w(13),
          fontWeight: "700",
          color: active ? "#fff" : colors.text,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );

  const renderAvailableCard = (t: HostAvailableTournament) => {
    const appSt = t.applicationStatus?.trim().toLowerCase() ?? "";
    const hasAppResponse =
      t.hasApplied === true ||
      (appSt.length > 0 && appSt !== "none" && appSt !== "rejected");
    const applicationPhaseDone =
      appSt === "approved" || appSt === "assigned" || appSt === "accepted";
    const applicationCtaLabel = t.applicationStatus?.trim()
      ? t.applicationStatus.trim()
      : hasAppResponse
        ? "Applied"
        : null;

    const label = t.lobbyName || t.title;
    const subtitleParts: string[] = [];
    if (t.game) subtitleParts.push(t.game);
    if (t.mode) subtitleParts.push(t.mode);
    if (t.subMode) subtitleParts.push(t.subMode);
    const subtitle = subtitleParts.join(" · ");

    const dateLine =
      t.date != null && String(t.date).trim()
        ? formatDateDdMmYyyy(t.date)
        : null;
    const metaLine = [subtitle, dateLine].filter(Boolean).join(" · ");

    const startTimeDisplay =
      t.startTime && t.startTime.includes("T")
        ? new Date(t.startTime).toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : t.startTime;

    const totalSlotStr = t.maxTeams != null ? String(t.maxTeams) : undefined;
    let availableSlot: number | undefined;
    if (t.maxTeams != null && t.joinedCount != null) {
      availableSlot = Math.max(0, t.maxTeams - t.joinedCount);
    } else if (t.slotsAvailable != null) {
      availableSlot = t.slotsAvailable;
    }
    const availableSlotStr =
      availableSlot != null ? String(availableSlot) : undefined;

    const { color: listingStatusColor, label: listingStatusLabel } =
      hostListingStatusMeta(t.status, colors.tabIconDefault);

    const statCells: { key: string; caption: string; value: string }[] = [];
    if (startTimeDisplay)
      statCells.push({
        key: "start",
        caption: "Start",
        value: startTimeDisplay,
      });
    if (totalSlotStr)
      statCells.push({
        key: "totalSlot",
        caption: "Total slot",
        value: totalSlotStr,
      });
    if (availableSlotStr)
      statCells.push({
        key: "availSlot",
        caption: "Available slot",
        value: availableSlotStr,
      });
    if (t.playersPerTeam != null)
      statCells.push({
        key: "ppt",
        caption: "Players / team",
        value: String(t.playersPerTeam),
      });
    if (t.maxPlayers != null)
      statCells.push({
        key: "maxp",
        caption: "Max players",
        value: String(t.maxPlayers),
      });
    if (t.entryFee != null)
      statCells.push({
        key: "entry",
        caption: "Entry fee",
        value: `₹${t.entryFee}`,
      });
    if (t.winnerPrizePool != null)
      statCells.push({
        key: "winner",
        caption: "Winner pool",
        value: `₹${t.winnerPrizePool}`,
      });
    if (t.hostFee != null)
      statCells.push({
        key: "hostFee",
        caption: "Host fee",
        value: `₹${t.hostFee}`,
      });

    const statColWidth = isSmallDevice ? "48%" : "31%";
    const showApply = !hasAppResponse;
    const showApplicationFooter =
      showApply || (hasAppResponse && !applicationPhaseDone);

    return (
      <View
        key={t.id}
        style={{
          paddingVertical: h(12),
          paddingHorizontal: w(14),
          borderRadius: w(12),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.cardBg,
          marginBottom: h(8),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
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
            <FontAwesome name="trophy" size={w(18)} color={colors.tint} />
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
            {metaLine ? (
              <Text
                style={{
                  fontSize: w(12),
                  color: colors.tabIconDefault,
                  marginTop: h(4),
                  lineHeight: w(16),
                }}
                numberOfLines={3}
              >
                {metaLine}
              </Text>
            ) : null}
            {t.rulesTitle ? (
              <Text
                style={{
                  fontSize: w(11),
                  color: colors.tabIconDefault,
                  marginTop: h(4),
                }}
                numberOfLines={2}
              >
                {t.rulesTitle}
              </Text>
            ) : null}
          </View>
          {listingStatusLabel ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: listingStatusColor + "55",
                backgroundColor: listingStatusColor + "18",
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
                  color: listingStatusColor,
                }}
                numberOfLines={2}
              >
                {listingStatusLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {t.lobbyCount != null ? (
          <Text
            style={{
              fontSize: w(11),
              color: colors.tabIconDefault,
              marginTop: h(8),
              marginLeft: w(52),
            }}
          >
            {t.lobbyCount} lobby{t.lobbyCount === 1 ? "" : "ies"}
          </Text>
        ) : null}

        {statCells.length > 0 ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginTop: h(12),
              gap: w(10),
            }}
          >
            {statCells.map((cell) => (
              <View key={cell.key} style={{ width: statColWidth }}>
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
                    marginTop: h(2),
                  }}
                  numberOfLines={2}
                >
                  {cell.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {showApplicationFooter ? (
          <View style={{ marginTop: h(14) }}>
            {showApply ? (
              <Pressable
                onPress={() => void directApply(t)}
                disabled={applyingTournamentId != null}
                style={{
                  paddingVertical: h(10),
                  paddingHorizontal: w(12),
                  borderRadius: w(10),
                  borderWidth: 1,
                  borderColor: colors.tint,
                  backgroundColor: colors.tint + "14",
                  alignItems: "center",
                  opacity: applyingTournamentId != null ? 0.55 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: w(12),
                    color: colors.tint,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  {applyingTournamentId === t.id
                    ? "Applying…"
                    : "Apply to host"}
                </Text>
              </Pressable>
            ) : (
              <View
                style={{
                  paddingVertical: h(10),
                  paddingHorizontal: w(12),
                  borderRadius: w(10),
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.border + "20",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: w(12),
                    color: colors.text,
                    fontWeight: "700",
                    textTransform: "capitalize",
                    textAlign: "center",
                  }}
                >
                  {applicationCtaLabel}
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  const renderLobbyCard = (row: HostAssignedLobby) => {
    const label = row.title;
    const subtitleParts: string[] = [];
    if (row.game) subtitleParts.push(row.game);
    if (row.mode) subtitleParts.push(row.mode);
    if (row.subMode) subtitleParts.push(row.subMode);
    const subtitle = subtitleParts.join(" · ");

    const dateLine =
      row.date != null && String(row.date).trim()
        ? formatDateDdMmYyyy(row.date)
        : null;
    const metaLine = [subtitle, dateLine].filter(Boolean).join(" · ");

    const startTimeDisplay =
      row.startTime && row.startTime.includes("T")
        ? new Date(row.startTime).toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : row.startTime;

    const totalSlotStr =
      row.maxTeams != null ? String(row.maxTeams) : undefined;
    let availableSlot: number | undefined;
    if (row.maxTeams != null && row.joinedCount != null) {
      availableSlot = Math.max(0, row.maxTeams - row.joinedCount);
    } else if (row.slotsAvailable != null) {
      availableSlot = row.slotsAvailable;
    }
    const availableSlotStr =
      availableSlot != null ? String(availableSlot) : undefined;

    const { color: listingStatusColor, label: listingStatusLabel } =
      hostListingStatusMeta(row.status, colors.tabIconDefault);

    const statCells: { key: string; caption: string; value: string }[] = [];
    if (startTimeDisplay)
      statCells.push({
        key: "start",
        caption: "Start",
        value: startTimeDisplay,
      });
    if (totalSlotStr)
      statCells.push({
        key: "totalSlot",
        caption: "Total slot",
        value: totalSlotStr,
      });
    if (availableSlotStr)
      statCells.push({
        key: "availSlot",
        caption: "Available slot",
        value: availableSlotStr,
      });
    if (row.playersPerTeam != null)
      statCells.push({
        key: "ppt",
        caption: "Players / team",
        value: String(row.playersPerTeam),
      });
    if (row.maxPlayers != null)
      statCells.push({
        key: "maxp",
        caption: "Max players",
        value: String(row.maxPlayers),
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
        key: "totalPool",
        caption: "Total pool",
        value: `₹${row.totalPrizePool}`,
      });
    if (row.hostFee != null)
      statCells.push({
        key: "hostFee",
        caption: "Host fee",
        value: `₹${row.hostFee}`,
      });

    const statColWidth = isSmallDevice ? "48%" : "31%";

    return (
      <View
        key={`${row.sectionLabel ?? ""}-${row.id}`}
        style={{
          paddingVertical: h(12),
          paddingHorizontal: w(14),
          borderRadius: w(12),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.cardBg,
          marginBottom: h(8),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
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
            <FontAwesome name="trophy" size={w(18)} color={colors.tint} />
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
            {metaLine ? (
              <Text
                style={{
                  fontSize: w(12),
                  color: colors.tabIconDefault,
                  marginTop: h(4),
                  lineHeight: w(16),
                }}
                numberOfLines={3}
              >
                {metaLine}
              </Text>
            ) : null}
            {row.rulesTitle ? (
              <Text
                style={{
                  fontSize: w(11),
                  color: colors.tabIconDefault,
                  marginTop: h(4),
                }}
                numberOfLines={2}
              >
                {row.rulesTitle}
              </Text>
            ) : null}
          </View>
          {listingStatusLabel ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: listingStatusColor + "55",
                backgroundColor: listingStatusColor + "18",
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
                  color: listingStatusColor,
                }}
                numberOfLines={2}
              >
                {listingStatusLabel}
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
            {row.lobbyCount} lobby{row.lobbyCount === 1 ? "" : "ies"}
          </Text>
        ) : null}

        {statCells.length > 0 ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginTop: h(12),
              gap: w(10),
            }}
          >
            {statCells.map((cell) => (
              <View key={cell.key} style={{ width: statColWidth }}>
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
                    marginTop: h(2),
                  }}
                  numberOfLines={2}
                >
                  {cell.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {row.currentRoomId || row.currentRoomPassword ? (
          <View
            style={{
              marginTop: h(10),
              marginLeft: w(52),
              gap: h(6),
            }}
          >
            {row.currentRoomId ? (
              <Text
                selectable
                style={{
                  fontSize: w(12),
                  color: colors.text,
                  fontWeight: "600",
                }}
              >
                Room ID: {row.currentRoomId}
              </Text>
            ) : null}
            {row.currentRoomPassword ? (
              <Text
                selectable
                style={{
                  fontSize: w(12),
                  color: colors.text,
                  fontWeight: "600",
                }}
              >
                Password: {row.currentRoomPassword}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            gap: w(8),
            marginTop: h(14),
          }}
        >
          <Pressable
            onPress={() => {
              setRoomModalLobby(row);
              setRoomId("");
              setRoomPassword("");
              setRoomPasswordMasked(false);
            }}
            style={{
              flex: 1,
              paddingVertical: h(10),
              paddingHorizontal: w(12),
              borderRadius: w(10),
              borderWidth: 1,
              borderColor: colors.tint,
              backgroundColor: colors.tint + "14",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: w(12),
                color: colors.tint,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Update room
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Toast.show({
                type: "info",
                text1: "Chat coming soon",
                text2: "REST: GET /api/tournament/{id}/chat + socket stream.",
              });
            }}
            style={{
              flex: 1,
              paddingVertical: h(10),
              paddingHorizontal: w(12),
              borderRadius: w(10),
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.border + "20",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: w(12),
                color: colors.text,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Chat
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const mainColumn = (
    <>
      {!embedded ? (
        <Text
          style={{
            fontSize: w(20),
            fontWeight: "700",
            color: colors.text,
            marginBottom: h(12),
          }}
        >
          Lobby
        </Text>
      ) : null}

      <View
          style={{
            flexDirection: "row",
            gap: w(8),
            marginBottom: h(16),
          }}
        >
          {tabChip(mainTab === "available", "Available", () =>
            setMainTab("available"),
          )}
          {tabChip(mainTab === "assigned", "Assigned", () =>
            setMainTab("assigned"),
          )}
        </View>

        {mainTab === "available" ? (
          <>
            <Text
              style={{
                fontSize: w(11),
                fontWeight: "700",
                color: colors.tabIconDefault,
                textTransform: "uppercase",
                marginBottom: h(8),
              }}
            >
              Listing filter
            </Text>
            <View
              style={{ flexDirection: "row", gap: w(8), marginBottom: h(12) }}
            >
              {tabChip(availFilter === "upcoming", "Upcoming", () =>
                setAvailFilter("upcoming"),
              )}
              {tabChip(availFilter === "locked", "Locked", () =>
                setAvailFilter("locked"),
              )}
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginBottom: h(8),
              }}
            >
              <Pressable
                onPress={() => {
                  if (!availRefreshing)
                    void loadAvailable({ page: 1, silent: true });
                }}
                hitSlop={8}
                style={{
                  width: w(36),
                  height: w(36),
                  borderRadius: w(18),
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {availRefreshing ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <FontAwesome
                    name="refresh"
                    size={w(16)}
                    color={colors.tint}
                  />
                )}
              </Pressable>
            </View>

            {availLoading ? (
              <ActivityIndicator
                color={colors.tint}
                style={{ marginTop: h(24) }}
              />
            ) : availError ? (
              <ClassicEmptyState
                variant="error"
                title="Couldn't load tournaments"
                message={availError}
              />
            ) : availableItems.length === 0 ? (
              <ClassicEmptyState
                variant="empty"
                title="No tournaments for this filter"
                message="Try switching Upcoming / Locked or refresh the list."
              />
            ) : (
              <>
                {availableItems.map(renderAvailableCard)}
                {availHasMore ? (
                  <Button
                    title="Load more"
                    variant="outline"
                    onPress={() =>
                      void loadAvailable({ page: availPage + 1, append: true })
                    }
                    style={{ marginTop: h(8) }}
                  />
                ) : null}
              </>
            )}
          </>
        ) : (
          <>
            <View
              style={{ flexDirection: "row", gap: w(8), marginBottom: h(14) }}
            >
              {tabChip(assignedSub === "active", "Active", () =>
                setAssignedSub("active"),
              )}
              {tabChip(assignedSub === "history", "History", () =>
                setAssignedSub("history"),
              )}
            </View>

            {assignedSub === "active" ? (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    marginBottom: h(8),
                  }}
                >
                  <Pressable
                    onPress={() => {
                      if (!activeRefreshing) void loadActive({ silent: true });
                    }}
                    style={{
                      width: w(36),
                      height: w(36),
                      borderRadius: w(18),
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {activeRefreshing ? (
                      <ActivityIndicator size="small" color={colors.tint} />
                    ) : (
                      <FontAwesome
                        name="refresh"
                        size={w(16)}
                        color={colors.tint}
                      />
                    )}
                  </Pressable>
                </View>
                {activeLoading ? (
                  <ActivityIndicator color={colors.tint} />
                ) : activeError ? (
                  <ClassicEmptyState
                    variant="error"
                    title="Couldn't load your lobbies"
                    message={activeError}
                  />
                ) : activeGrouped.length === 0 ? (
                  <ClassicEmptyState
                    variant="empty"
                    title="No assigned lobbies yet"
                    message="When you're assigned to a tournament, it will show up here."
                  />
                ) : (
                  activeGrouped.map((sec) => (
                    <View key={sec.label} style={{ marginBottom: h(12) }}>
                      <Text
                        style={{
                          fontSize: w(13),
                          fontWeight: "700",
                          color: colors.tabIconDefault,
                          marginBottom: h(6),
                        }}
                      >
                        {sec.label}
                      </Text>
                      {sec.items.map(renderLobbyCard)}
                    </View>
                  ))
                )}
              </>
            ) : (
              <>
                <Text
                  style={{
                    fontSize: w(11),
                    fontWeight: "700",
                    color: colors.tabIconDefault,
                    marginBottom: h(8),
                  }}
                >
                  History status
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: w(8), marginBottom: h(12) }}
                >
                  {HISTORY_OPTIONS.map((o) => (
                    <Pressable
                      key={o.value}
                      onPress={() => setHistoryStatus(o.value)}
                      style={{
                        paddingVertical: h(8),
                        paddingHorizontal: w(12),
                        borderRadius: w(20),
                        backgroundColor:
                          historyStatus === o.value
                            ? colors.tint
                            : colors.border + "35",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: w(12),
                          fontWeight: "600",
                          color:
                            historyStatus === o.value ? "#fff" : colors.text,
                        }}
                      >
                        {o.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {historyLoading && historyItems.length === 0 ? (
                  <ActivityIndicator color={colors.tint} />
                ) : historyError ? (
                  <ClassicEmptyState
                    variant="error"
                    title="Couldn't load history"
                    message={historyError}
                  />
                ) : historyItems.length === 0 ? (
                  <ClassicEmptyState
                    variant="empty"
                    title="No history for this status"
                    message="Completed, cancelled, or result-pending lobbies will appear when available."
                  />
                ) : (
                  <>
                    {historyItems.map(renderLobbyCard)}
                    {historyHasMore ? (
                      <Button
                        title="Load more"
                        variant="outline"
                        onPress={() =>
                          void loadHistory({
                            page: historyPage + 1,
                            append: true,
                          })
                        }
                      />
                    ) : null}
                  </>
                )}
              </>
            )}
          </>
        )}
    </>
  );

  return (
    <>
      {embedded ? (
        <View style={{ paddingBottom: h(24) }}>{mainColumn}</View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: h(32) }}
        >
          {mainColumn}
        </ScrollView>
      )}

      {roomModalLobby ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!roomSaving) setRoomModalLobby(null);
          }}
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
              accessibilityLabel="Close update room"
              onPress={() => {
                if (!roomSaving) setRoomModalLobby(null);
              }}
              style={{ position: "absolute", inset: 0 }}
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
                paddingHorizontal: w(16),
                paddingVertical: h(12),
              }}
            >
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
                    fontSize: w(16),
                    fontWeight: "700",
                    color: colors.text,
                    flex: 1,
                    marginRight: w(12),
                  }}
                  numberOfLines={2}
                >
                  {roomModalLobby.title}
                </Text>
                <Pressable
                  onPress={() => {
                    if (!roomSaving) setRoomModalLobby(null);
                  }}
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

              <Text
                style={{
                  fontSize: w(11),
                  color: colors.tabIconDefault,
                  marginBottom: h(6),
                }}
              >
                Room ID (required)
              </Text>
              <TextInput
                value={roomId}
                onChangeText={setRoomId}
                placeholder="Room / custom match code"
                placeholderTextColor={colors.tabIconDefault}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
                keyboardType="default"
                {...(Platform.OS === "android"
                  ? { importantForAutofill: "no" as const }
                  : {})}
                {...(Platform.OS === "web"
                  ? ({
                      autoComplete: "off",
                      "data-lpignore": "true",
                      "data-1p-ignore": "true",
                      "data-form-type": "other",
                    } as object)
                  : {})}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: w(10),
                  paddingHorizontal: w(12),
                  paddingVertical: h(9),
                  fontSize: w(14),
                  color: colors.text,
                  backgroundColor: colors.inputBg,
                  marginBottom: h(10),
                }}
              />

              <Text
                style={{
                  fontSize: w(11),
                  color: colors.tabIconDefault,
                  marginBottom: h(6),
                }}
              >
                Password (required)
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: w(10),
                  backgroundColor: colors.inputBg,
                  marginBottom: h(14),
                  paddingLeft: w(12),
                  paddingRight: w(6),
                  minHeight: h(44),
                }}
              >
                <TextInput
                  value={roomPassword}
                  onChangeText={setRoomPassword}
                  placeholder="In-game room password"
                  placeholderTextColor={colors.tabIconDefault}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  textContentType="none"
                  secureTextEntry={roomPasswordMasked}
                  {...(Platform.OS === "android"
                    ? { importantForAutofill: "no" as const }
                    : {})}
                  {...(Platform.OS === "web"
                    ? ({
                        autoComplete: "new-password",
                        "data-lpignore": "true",
                        "data-1p-ignore": "true",
                        "data-form-type": "other",
                      } as object)
                    : {})}
                  style={{
                    flex: 1,
                    paddingVertical: h(9),
                    paddingRight: w(6),
                    fontSize: w(14),
                    color: colors.text,
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    roomPasswordMasked ? "Show password" : "Hide password"
                  }
                  onPress={() => setRoomPasswordMasked((m) => !m)}
                  hitSlop={10}
                  style={{
                    padding: w(8),
                  }}
                >
                  <FontAwesome
                    name={roomPasswordMasked ? "eye" : "eye-slash"}
                    size={w(18)}
                    color={colors.tabIconDefault}
                  />
                </Pressable>
              </View>

              <Button
                title={roomSaving ? "Saving…" : "Save room details"}
                onPress={async () => {
                  if (roomSaving || !roomModalLobby) return;
                  const trimmedRoomId = roomId.trim();
                  if (!trimmedRoomId) {
                    Toast.show({
                      type: "error",
                      text1: "Room ID is required",
                    });
                    return;
                  }
                  const trimmedPassword = roomPassword.trim();
                  if (!trimmedPassword) {
                    Toast.show({
                      type: "error",
                      text1: "Password is required",
                    });
                    return;
                  }
                  setRoomSaving(true);
                  try {
                    dispatch(showLoader());
                    await updateHostTournamentRoom(roomModalLobby.id, {
                      roomId: trimmedRoomId,
                      password: trimmedPassword,
                    });
                    Toast.show({
                      type: "success",
                      text1: "Room updated",
                    });
                    await loadActive({ silent: true });
                    setRoomModalLobby(null);
                  } catch (e) {
                    const msg =
                      e instanceof ApiError
                        ? e.message
                        : e instanceof Error
                          ? e.message
                          : "Failed to update room";
                    Toast.show({ type: "error", text1: msg });
                  } finally {
                    setRoomSaving(false);
                    dispatch(hideLoader());
                  }
                }}
                disabled={roomSaving}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}
