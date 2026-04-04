import { Button, Card, ClassicEmptyState, Input, Screen } from "@/components/ui";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/context/ResponsiveContext";
import {
  fetchAdminGamesCatalog,
  generateAdminLobbies,
  type AdminGenerateLobbiesBody,
} from "@/services/admin.service";
import { ApiError } from "@/services/api.service";
import { useAppDispatch } from "@/store/hooks";
import { hideLoader, showLoader } from "@/store/slices/loaderSlice";
import type { AdminCatalogGame } from "@/types/admin";
import { isAdminUser } from "@/utils/adminUser";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Redirect } from "expo-router";
import React, {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { formatDateDdMmYyyy } from "@/utils/date";

const PRICE_OPTIONS = [25, 50, 75, 100, 150, 200, 400, 500] as const;
const BR_MATCH_OPTIONS = [6, 3] as const;
const DEFAULT_LOBBY_FEE = 100;

/** Quick-add lobby times (display + 24h). */
const QUICK_TIME_SLOTS: { label: string; h: number; m: number }[] = [
  { label: "12 PM", h: 12, m: 0 },
  { label: "3 PM", h: 15, m: 0 },
  { label: "6 PM", h: 18, m: 0 },
  { label: "9 PM", h: 21, m: 0 },
];

/** Next 12/3/6/9 PM from *now* (local). After 9 PM → defaults to 12 PM (next day’s first slot). */
function defaultLobbySlotFromNow(): { h: number; m: number } {
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  for (const s of QUICK_TIME_SLOTS) {
    const slotM = s.h * 60 + s.m;
    if (slotM >= nowM) return { h: s.h, m: s.m };
  }
  return { h: 12, m: 0 };
}

type TimeRow = { id: string; h: number; m: number; price: number };

const SUB_MODES = ["solo", "duo", "squad"] as const;
const MODES = ["BR", "CS"] as const;

function defaultYmdToday(): string {
  return ymdFromDate(new Date());
}

function ymdFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmdToDate(s: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const mo = Number(match[2]);
  const day = Number(match[3]);
  const d = new Date(y, mo - 1, day);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

function isValidYmd(s: string): boolean {
  return parseYmdToDate(s) != null;
}

function formatDisplayDateFromYmd(ymd: string): string {
  return formatDateDdMmYyyy(ymd) || ymd;
}

function dateToHtmlInputValue(d: Date): string {
  return ymdFromDate(d);
}

function htmlInputValueToDate(value: string): Date | null {
  return parseYmdToDate(value);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTime12h(hour: number, minute: number): string {
  const d = new Date(2000, 0, 1, hour, minute);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function rowToHtmlTimeValue(r: TimeRow): string {
  return `${pad2(r.h)}:${pad2(r.m)}`;
}

function parseHtmlTimeValue(s: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59)
    return null;
  return { h, m };
}

function timeRowFromDate(d: Date): Pick<TimeRow, "h" | "m"> {
  return { h: d.getHours(), m: d.getMinutes() };
}

function dateFromRowParts(dateYmd: string, h: number, m: number): Date {
  const base = parseYmdToDate(dateYmd);
  if (!base) return new Date();
  base.setHours(h, m, 0, 0);
  return base;
}

function newRowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toggleInList<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((x) => x !== value)
    : [...list, value];
}

function isAllowedFee(n: number): boolean {
  return PRICE_OPTIONS.includes(n as (typeof PRICE_OPTIONS)[number]);
}

function Chip({
  label,
  selected,
  onPress,
  colors,
  w,
  h,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: (typeof Colors)["light"];
  w: (n: number) => number;
  h: (n: number) => number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          paddingHorizontal: w(12),
          paddingVertical: h(8),
          borderRadius: w(8),
          borderWidth: 1,
          borderColor: selected ? colors.tint : colors.border,
          backgroundColor: selected ? colors.tint + "22" : "transparent",
        },
      ]}
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
}

function brTierLabel(matches: number): string {
  if (matches >= 6) return "Big (6)";
  return "Mini (3)";
}

export default function AdminTournamentScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { w, h } = useResponsive();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();

  const [date, setDate] = useState(defaultYmdToday);
  const [tournamentDate, setTournamentDate] = useState<Date>(() => {
    const p = parseYmdToDate(defaultYmdToday());
    return p ?? new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [timeRows, setTimeRows] = useState<TimeRow[]>(() => [
    { id: newRowId(), ...defaultLobbySlotFromNow(), price: DEFAULT_LOBBY_FEE },
  ]);
  const [editingTimeRowId, setEditingTimeRowId] = useState<string | null>(null);
  const [feePickerRowId, setFeePickerRowId] = useState<string | null>(null);
  const [bulkFeePickerOpen, setBulkFeePickerOpen] = useState(false);

  const [mode, setMode] = useState<(typeof MODES)[number]>("BR");
  const [subModes, setSubModes] = useState<string[]>(["squad"]);
  const [totalMatches, setTotalMatches] =
    useState<(typeof BR_MATCH_OPTIONS)[number]>(6);
  const [catalogGames, setCatalogGames] = useState<AdminCatalogGame[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedGameSlug, setSelectedGameSlug] = useState("");
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [gameSearchQuery, setGameSearchQuery] = useState("");
  const [lobbyName, setLobbyName] = useState("");

  const totalMatchesEffective = mode === "CS" ? 1 : totalMatches;

  useEffect(() => {
    if (!isAuthenticated || !isAdminUser(user)) return;
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    fetchAdminGamesCatalog()
      .then((list) => {
        if (cancelled) return;
        setCatalogGames(list);
        setSelectedGameSlug((prev) => {
          if (prev && list.some((g) => g.slug === prev)) return prev;
          const bgmi = list.find((g) => g.slug.toLowerCase() === "bgmi");
          return bgmi?.slug ?? list[0]?.slug ?? "";
        });
      })
      .catch(() => {
        if (cancelled) return;
        setCatalogError("Could not load catalog");
        Toast.show({ type: "error", text1: "Failed to load games catalog" });
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id ?? ""]);

  const selectedGame = useMemo(
    () => catalogGames.find((x) => x.slug === selectedGameSlug),
    [catalogGames, selectedGameSlug],
  );
  const selectedGameTitle = selectedGame?.title ?? (selectedGameSlug || "");

  const filteredCatalogGames = useMemo(() => {
    const q = gameSearchQuery.trim().toLowerCase();
    if (!q) return catalogGames;
    return catalogGames.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.slug.toLowerCase().includes(q) ||
        (g.platform?.toLowerCase().includes(q) ?? false),
    );
  }, [catalogGames, gameSearchQuery]);

  /** When every lobby has the same fee, bulk chips show that selection. */
  const bulkFeeIfAllMatch = useMemo(() => {
    if (timeRows.length === 0) return null;
    const first = timeRows[0].price;
    return timeRows.every((r) => r.price === first) ? first : null;
  }, [timeRows]);

  const reloadCatalog = useCallback(() => {
    if (!isAuthenticated || !isAdminUser(user)) return;
    setCatalogLoading(true);
    setCatalogError(null);
    fetchAdminGamesCatalog()
      .then((list) => {
        setCatalogGames(list);
        setSelectedGameSlug((prev) => {
          if (prev && list.some((g) => g.slug === prev)) return prev;
          const bgmi = list.find((g) => g.slug.toLowerCase() === "bgmi");
          return bgmi?.slug ?? list[0]?.slug ?? "";
        });
      })
      .catch(() => {
        setCatalogError("Could not load catalog");
        Toast.show({ type: "error", text1: "Failed to load games catalog" });
      })
      .finally(() => setCatalogLoading(false));
  }, [isAuthenticated, user?.id ?? ""]);

  const applyPickedDate = useCallback((d: Date) => {
    setTournamentDate(d);
    setDate(ymdFromDate(d));
  }, []);

  const handleDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === "android") {
        setShowDatePicker(false);
      }
      if (event.type !== "set" || !selectedDate) return;
      applyPickedDate(selectedDate);
    },
    [applyPickedDate],
  );

  const openDatePicker = useCallback(() => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: tournamentDate,
        mode: "date",
        minimumDate: startOfToday(),
        onChange: handleDateChange,
      });
      return;
    }
    setShowDatePicker(true);
  }, [tournamentDate, handleDateChange]);

  const editingRow = editingTimeRowId
    ? timeRows.find((r) => r.id === editingTimeRowId)
    : undefined;
  const feePickerRow = feePickerRowId
    ? timeRows.find((r) => r.id === feePickerRowId)
    : undefined;

  const handleTimeChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === "android") {
        setEditingTimeRowId(null);
      }
      if (event.type !== "set" || !selectedDate || !editingTimeRowId) return;
      const { h: hh, m: mm } = timeRowFromDate(selectedDate);
      setTimeRows((prev) =>
        prev.map((r) =>
          r.id === editingTimeRowId
            ? { ...r, h: hh, m: mm, price: r.price }
            : r,
        ),
      );
    },
    [editingTimeRowId],
  );

  const openTimePickerForRow = useCallback(
    (rowId: string) => {
      const row = timeRows.find((r) => r.id === rowId);
      if (!row) return;
      const value = dateFromRowParts(date, row.h, row.m);
      if (Platform.OS === "android") {
        DateTimePickerAndroid.open({
          value,
          mode: "time",
          is24Hour: false,
          onChange: (ev, d) => {
            if (ev.type !== "set" || !d) return;
            const { h: hh, m: mm } = timeRowFromDate(d);
            setTimeRows((prev) =>
              prev.map((r) =>
                r.id === rowId ? { ...r, h: hh, m: mm, price: r.price } : r,
              ),
            );
          },
        });
        return;
      }
      setEditingTimeRowId(rowId);
    },
    [timeRows, date],
  );

  const addPresetTime = useCallback((h: number, m: number) => {
    setTimeRows((prev) => {
      const last = prev[prev.length - 1];
      return [
        ...prev,
        {
          id: newRowId(),
          h,
          m,
          price: last?.price ?? DEFAULT_LOBBY_FEE,
        },
      ];
    });
  }, []);

  const applyFeeToAllLobbies = useCallback((fee: number) => {
    setTimeRows((prev) => prev.map((r) => ({ ...r, price: fee })));
  }, []);

  const submit = useCallback(async () => {
    if (!isValidYmd(date)) {
      Toast.show({ type: "error", text1: "Pick a valid date" });
      return;
    }
    if (timeRows.length === 0) {
      Toast.show({ type: "error", text1: "Add at least one time slot" });
      return;
    }
    if (subModes.length === 0) {
      Toast.show({ type: "error", text1: "Select at least one sub-mode" });
      return;
    }
    const badFee = timeRows.find((r) => !isAllowedFee(r.price));
    if (badFee) {
      Toast.show({
        type: "error",
        text1: "Each lobby needs a valid ₹ tier (25–500 presets)",
      });
      return;
    }
    const matchesNum = Number(totalMatchesEffective);
    if (!Number.isFinite(matchesNum) || matchesNum < 1) {
      Toast.show({ type: "error", text1: "Enter a valid total matches count" });
      return;
    }
    const primarySlug = selectedGameSlug.trim();
    if (!primarySlug) {
      Toast.show({ type: "error", text1: "Select a game from the list" });
      return;
    }

    const entryFeesOrdered = timeRows.map((r) => r.price);
    const body: AdminGenerateLobbiesBody = {
      date: date.trim(),
      timeSlots: timeRows.map((r) => formatTime12h(r.h, r.m)),
      mode,
      subModes: [...subModes],
      price: entryFeesOrdered[0] ?? DEFAULT_LOBBY_FEE,
      entryFees: entryFeesOrdered,
      totalMatches: matchesNum,
      game: primarySlug,
      games: [primarySlug],
    };
    const trimmedLobby = lobbyName.trim();
    if (trimmedLobby) body.lobbyName = trimmedLobby;

    dispatch(showLoader());
    try {
      await generateAdminLobbies(body);
      Toast.show({ type: "success", text1: "Lobbies generated" });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Request failed";
      Toast.show({ type: "error", text1: msg });
    } finally {
      dispatch(hideLoader());
    }
  }, [
    date,
    timeRows,
    mode,
    subModes,
    totalMatchesEffective,
    selectedGameSlug,
    lobbyName,
    dispatch,
  ]);

  const slotPreviewByTime = useMemo(() => {
    const map = new Map<string, number[]>();
    timeRows.forEach((row, idx) => {
      const k = formatTime12h(row.h, row.m);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(idx);
    });
    return map;
  }, [timeRows]);

  if (!isAuthenticated || !isAdminUser(user)) {
    return <Redirect href={ROUTES.HOME} />;
  }

  return (
    <>
      <Screen scroll keyboardAvoid padded>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: h(32) }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              fontSize: w(22),
              fontWeight: "700",
              color: colors.text,
              marginBottom: h(16),
            }}
          >
            Generate lobbies
          </Text>

          <Card style={{ marginBottom: h(12) }}>
            <Text
              style={{
                fontSize: w(15),
                fontWeight: "700",
                color: colors.text,
                marginBottom: h(6),
              }}
            >
              Game
            </Text>
            <Text
              style={{
                fontSize: w(12),
                color: colors.tabIconDefault,
                marginBottom: h(12),
                lineHeight: w(17),
              }}
            >
              Choose from the admin catalog first (slug is sent when
              generating).
            </Text>
            {catalogLoading ? (
              <View style={{ alignItems: "center", paddingVertical: h(12) }}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : null}
            {catalogError && !catalogLoading ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: w(10),
                  marginBottom: h(10),
                  flexWrap: "wrap",
                }}
              >
                <Text style={{ color: "#dc2626", fontSize: w(12), flex: 1 }}>
                  {catalogError}
                </Text>
                <Pressable onPress={reloadCatalog} hitSlop={8}>
                  <Text
                    style={{
                      color: colors.tint,
                      fontSize: w(13),
                      fontWeight: "700",
                    }}
                  >
                    Retry
                  </Text>
                </Pressable>
              </View>
            ) : null}
            <Pressable
              onPress={() => {
                if (catalogGames.length === 0 || catalogLoading) return;
                setGameSearchQuery("");
                setShowGamePicker(true);
              }}
              disabled={catalogLoading || catalogGames.length === 0}
              style={{
                opacity: catalogLoading || catalogGames.length === 0 ? 0.55 : 1,
                borderWidth: 1.5,
                borderColor: colors.border,
                borderRadius: w(12),
                minHeight: h(52),
                paddingHorizontal: w(16),
                paddingVertical: h(10),
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: colors.inputBg,
              }}
            >
              <View style={{ flex: 1, paddingRight: w(8) }}>
                <Text
                  style={{
                    fontSize: w(16),
                    color: selectedGameTitle
                      ? colors.text
                      : colors.tabIconDefault,
                  }}
                  numberOfLines={1}
                >
                  {selectedGameTitle || "Tap to select game"}
                </Text>
                {selectedGame ? (
                  <Text
                    style={{
                      fontSize: w(11),
                      color: colors.tabIconDefault,
                      marginTop: h(3),
                    }}
                    numberOfLines={1}
                  >
                    {selectedGame.platform
                      ? `${selectedGame.platform.charAt(0).toUpperCase()}${selectedGame.platform.slice(1)} · `
                      : ""}
                    {selectedGame.slug}
                  </Text>
                ) : null}
              </View>
              <FontAwesome
                name="chevron-down"
                size={w(18)}
                color={colors.tabIconDefault}
              />
            </Pressable>
            {!catalogLoading && catalogGames.length === 0 && !catalogError ? (
              <Text
                style={{
                  fontSize: w(12),
                  color: colors.tabIconDefault,
                  marginTop: h(8),
                }}
              >
                Catalog is empty. Fix API or permissions (admin JWT).
              </Text>
            ) : null}
            <Input
              label="Lobby name (optional)"
              value={lobbyName}
              onChangeText={setLobbyName}
              placeholder="Empty = auto (index + time)"
              style={{ marginTop: h(12) }}
            />
          </Card>

          <Card style={{ marginBottom: h(12) }}>
            <Text
              style={{
                fontSize: w(15),
                fontWeight: "700",
                color: colors.text,
                marginBottom: h(4),
              }}
            >
              Schedule
            </Text>
            <Text
              style={{
                fontSize: w(12),
                color: colors.tabIconDefault,
                marginBottom: h(14),
                lineHeight: w(17),
              }}
            >
              Default first row uses the next 12 / 3 / 6 / 9 PM from when you
              open this screen.
            </Text>

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
              Date
            </Text>
            <Pressable
              onPress={openDatePicker}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: w(12),
                paddingVertical: h(14),
                paddingHorizontal: w(16),
                backgroundColor: colors.inputBg,
              }}
            >
              <Text
                style={{
                  fontSize: w(17),
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {formatDisplayDateFromYmd(date)}
              </Text>
              <Text
                style={{
                  fontSize: w(12),
                  color: colors.tabIconDefault,
                  marginTop: h(4),
                }}
              >
                {date} · Tap to change
              </Text>
            </Pressable>

            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: colors.border,
                marginVertical: h(16),
              }}
            />

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
              Lobby times · one row = one lobby
            </Text>
            <Text
              style={{
                fontSize: w(11),
                color: colors.tabIconDefault,
                marginBottom: h(10),
                lineHeight: w(16),
              }}
            >
              One fee for everyone below, or set ₹ per lobby on each card.
            </Text>

            <Text
              style={{
                fontSize: w(11),
                fontWeight: "700",
                color: colors.tabIconDefault,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: h(8),
              }}
            >
              Set fee for all lobbies
            </Text>
            <Pressable
              onPress={() => setBulkFeePickerOpen(true)}
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
                marginBottom: h(14),
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
                  {bulkFeeIfAllMatch != null ? `₹${bulkFeeIfAllMatch}` : "Mixed"}
                </Text>
                <Text
                  style={{
                    fontSize: w(11),
                    color: colors.tabIconDefault,
                    marginTop: h(2),
                  }}
                >
                  Tap to set one fee for all lobbies
                </Text>
              </View>
              <FontAwesome
                name="chevron-down"
                size={w(16)}
                color={colors.tabIconDefault}
              />
            </Pressable>

            {timeRows.map((row, index) => (
              <View
                key={row.id}
                style={{
                  marginBottom: h(10),
                  paddingVertical: h(12),
                  paddingHorizontal: w(14),
                  borderRadius: w(12),
                  backgroundColor: colors.cardBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: w(10),
                  }}
                >
                  <View style={{ flex: 1, minWidth: w(100) }}>
                    <Text
                      style={{
                        fontSize: w(11),
                        color: colors.tabIconDefault,
                        marginBottom: 2,
                      }}
                    >
                      Lobby {index + 1}
                    </Text>
                    <Text
                      style={{
                        fontSize: w(17),
                        fontWeight: "700",
                        color: colors.text,
                      }}
                    >
                      {formatTime12h(row.h, row.m)}
                    </Text>
                    <Text
                      style={{
                        fontSize: w(11),
                        color: colors.tabIconDefault,
                        marginTop: 4,
                      }}
                    >
                      {mode === "BR" ? brTierLabel(totalMatches) : "CS"} · ₹
                      {row.price}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => openTimePickerForRow(row.id)}
                    style={{
                      paddingHorizontal: w(14),
                      paddingVertical: h(10),
                      borderRadius: w(10),
                      backgroundColor: colors.tint + "20",
                    }}
                  >
                    <Text
                      style={{
                        color: colors.tint,
                        fontSize: w(13),
                        fontWeight: "700",
                      }}
                    >
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      setTimeRows((prev) => prev.filter((r) => r.id !== row.id))
                    }
                    hitSlop={8}
                    disabled={timeRows.length <= 1}
                    style={{
                      paddingHorizontal: w(10),
                      paddingVertical: h(10),
                      opacity: timeRows.length <= 1 ? 0.35 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: "#dc2626",
                        fontSize: w(13),
                        fontWeight: "700",
                      }}
                    >
                      Remove
                    </Text>
                  </Pressable>
                </View>
                <Text
                  style={{
                    fontSize: w(10),
                    fontWeight: "700",
                    color: colors.tabIconDefault,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginTop: h(12),
                    marginBottom: h(6),
                  }}
                >
                  Fee · this lobby
                </Text>
                <Pressable
                  onPress={() => setFeePickerRowId(row.id)}
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
                      ₹{row.price}
                    </Text>
                    <Text
                      style={{
                        fontSize: w(11),
                        color: colors.tabIconDefault,
                        marginTop: h(2),
                      }}
                    >
                      Tap to change fee
                    </Text>
                  </View>
                  <FontAwesome
                    name="chevron-down"
                    size={w(16)}
                    color={colors.tabIconDefault}
                  />
                </Pressable>
              </View>
            ))}
            <Button
              title="Add another time"
              variant="outline"
              onPress={() =>
                setTimeRows((prev) => {
                  const last = prev[prev.length - 1];
                  const fallback = defaultLobbySlotFromNow();
                  return [
                    ...prev,
                    {
                      id: newRowId(),
                      h: last?.h ?? fallback.h,
                      m: last?.m ?? fallback.m,
                      price: last?.price ?? DEFAULT_LOBBY_FEE,
                    },
                  ];
                })
              }
            />

            <Text
              style={{
                fontSize: w(11),
                fontWeight: "700",
                color: colors.tabIconDefault,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginTop: h(16),
                marginBottom: h(8),
              }}
            >
              Quick add
            </Text>
            <Text
              style={{
                fontSize: w(11),
                color: colors.tabIconDefault,
                marginBottom: h(10),
              }}
            >
              Adds a new row at 12 PM, 3 PM, 6 PM, or 9 PM
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: w(8),
              }}
            >
              {QUICK_TIME_SLOTS.map((p) => (
                <Pressable
                  key={p.label}
                  onPress={() => addPresetTime(p.h, p.m)}
                  style={{
                    flexGrow: 1,
                    minWidth: w(72),
                    maxWidth: "48%" as const,
                    paddingVertical: h(12),
                    paddingHorizontal: w(8),
                    borderRadius: w(12),
                    alignItems: "center",
                    backgroundColor: colors.inputBg,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: w(15),
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {p.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: w(10),
                      color: colors.tint,
                      marginTop: 2,
                      fontWeight: "600",
                    }}
                  >
                    add row
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text
              style={{
                fontSize: w(11),
                fontWeight: "700",
                color: colors.tabIconDefault,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginTop: h(16),
                marginBottom: h(8),
              }}
            >
              Summary
            </Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: w(12),
                padding: w(14),
                gap: h(12),
                backgroundColor: colors.inputBg,
              }}
            >
              {[...slotPreviewByTime.entries()].map(([timeLabel, indices]) => (
                <View key={timeLabel}>
                  <Text
                    style={{
                      fontSize: w(14),
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {timeLabel}
                    {indices.length > 1 ? (
                      <Text
                        style={{
                          fontWeight: "600",
                          color: colors.tabIconDefault,
                        }}
                      >
                        {" "}
                        · {indices.length} lobbies
                      </Text>
                    ) : null}
                  </Text>
                  {indices.map((i) => (
                    <Text
                      key={i}
                      style={{
                        fontSize: w(12),
                        color: colors.tabIconDefault,
                        marginTop: h(4),
                        paddingLeft: w(2),
                      }}
                    >
                      {lobbyName.trim()
                        ? `${lobbyName.trim()} (${i + 1})`
                        : `Lobby ${i + 1}`}
                      {mode === "BR"
                        ? ` · ${brTierLabel(totalMatches)}`
                        : " · CS (1)"}{" "}
                      · ₹{timeRows[i]?.price ?? "—"}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </Card>

          <Card style={{ marginBottom: h(12) }}>
            <Text
              style={{
                fontSize: w(15),
                fontWeight: "700",
                color: colors.text,
                marginBottom: h(14),
              }}
            >
              Mode & format
            </Text>

            <Text
              style={{
                fontSize: w(11),
                fontWeight: "700",
                color: colors.tabIconDefault,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: h(8),
              }}
            >
              Mode
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: w(8) }}>
              {MODES.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  selected={mode === m}
                  onPress={() => {
                    setMode(m);
                  }}
                  colors={colors}
                  w={w}
                  h={h}
                />
              ))}
            </View>

            <Text
              style={{
                fontSize: w(11),
                fontWeight: "700",
                color: colors.tabIconDefault,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginTop: h(14),
                marginBottom: h(8),
              }}
            >
              Sub-modes
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: w(8) }}>
              {SUB_MODES.map((sm) => (
                <Chip
                  key={sm}
                  label={sm}
                  selected={subModes.includes(sm)}
                  onPress={() =>
                    setSubModes((prev) => toggleInList([...prev], sm))
                  }
                  colors={colors}
                  w={w}
                  h={h}
                />
              ))}
            </View>

            {mode === "BR" ? (
              <>
                <Text
                  style={{
                    fontSize: w(11),
                    fontWeight: "700",
                    color: colors.tabIconDefault,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    marginTop: h(14),
                    marginBottom: h(8),
                  }}
                >
                  BR · total matches
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: w(8) }}
                >
                  {BR_MATCH_OPTIONS.map((n) => (
                    <Chip
                      key={n}
                      label={n === 6 ? "Big · 6" : "Mini · 3"}
                      selected={totalMatches === n}
                      onPress={() => setTotalMatches(n)}
                      colors={colors}
                      w={w}
                      h={h}
                    />
                  ))}
                </View>
              </>
            ) : (
              <Input
                label="Total matches (CS)"
                value="1"
                editable={false}
                style={{ marginTop: h(14), opacity: 0.7 }}
              />
            )}
          </Card>

          <Button title="Generate lobbies" onPress={submit} fullWidth />
        </ScrollView>
      </Screen>

      {Platform.OS !== "android" && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          {...(Platform.OS === "ios"
            ? { presentationStyle: "overFullScreen" as const }
            : {})}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss date picker"
              onPress={() => setShowDatePicker(false)}
              style={StyleSheet.absoluteFillObject}
            />
            <View
              pointerEvents="box-none"
              style={{
                backgroundColor: colors.cardBg ?? colors.background,
                borderTopLeftRadius: w(16),
                borderTopRightRadius: w(16),
                paddingBottom: Math.max(insets.bottom, h(12)),
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: w(16),
                  paddingVertical: h(12),
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                }}
              >
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  hitSlop={12}
                >
                  <Text
                    style={{ color: colors.tabIconDefault, fontSize: w(16) }}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  hitSlop={12}
                >
                  <Text
                    style={{
                      color: colors.accent ?? colors.tint,
                      fontSize: w(16),
                      fontWeight: "600",
                    }}
                  >
                    Done
                  </Text>
                </Pressable>
              </View>
              <View
                style={{
                  width: "100%",
                  minHeight: Platform.OS === "web" ? h(72) : 216,
                  height: Platform.OS === "web" ? undefined : 216,
                  alignItems: "stretch",
                  justifyContent: "center",
                  paddingHorizontal: w(16),
                  paddingBottom: Platform.OS === "web" ? h(16) : 0,
                }}
              >
                {Platform.OS === "web" ? (
                  createElement("input", {
                    type: "date",
                    "aria-label": "Tournament date",
                    value: dateToHtmlInputValue(tournamentDate),
                    min: dateToHtmlInputValue(startOfToday()),
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                      const next = htmlInputValueToDate(e.target.value);
                      if (next) applyPickedDate(next);
                    },
                    style: {
                      width: "100%",
                      boxSizing: "border-box",
                      padding: 14,
                      fontSize: 16,
                      borderRadius: 12,
                      border: `1.5px solid ${colors.border}`,
                      backgroundColor: colors.inputBg ?? colors.background,
                      color: colors.text,
                    },
                  })
                ) : (
                  <DateTimePicker
                    value={tournamentDate}
                    mode="date"
                    display="spinner"
                    themeVariant={scheme === "dark" ? "dark" : "light"}
                    textColor={colors.text}
                    minimumDate={startOfToday()}
                    onChange={handleDateChange}
                    style={{ width: "100%", height: 216 }}
                  />
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS !== "android" && editingRow ? (
        <Modal
          visible
          transparent
          animationType="slide"
          {...(Platform.OS === "ios"
            ? { presentationStyle: "overFullScreen" as const }
            : {})}
          onRequestClose={() => setEditingTimeRowId(null)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          >
            <Pressable
              onPress={() => setEditingTimeRowId(null)}
              style={StyleSheet.absoluteFillObject}
            />
            <View
              pointerEvents="box-none"
              style={{
                backgroundColor: colors.cardBg ?? colors.background,
                borderTopLeftRadius: w(16),
                borderTopRightRadius: w(16),
                paddingBottom: Math.max(insets.bottom, h(12)),
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: w(16),
                  paddingVertical: h(12),
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                }}
              >
                <Pressable
                  onPress={() => setEditingTimeRowId(null)}
                  hitSlop={12}
                >
                  <Text
                    style={{ color: colors.tabIconDefault, fontSize: w(16) }}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setEditingTimeRowId(null)}
                  hitSlop={12}
                >
                  <Text
                    style={{
                      color: colors.accent ?? colors.tint,
                      fontSize: w(16),
                      fontWeight: "600",
                    }}
                  >
                    Done
                  </Text>
                </Pressable>
              </View>
              <View
                style={{
                  width: "100%",
                  minHeight: Platform.OS === "web" ? h(72) : 216,
                  height: Platform.OS === "web" ? undefined : 216,
                  paddingHorizontal: w(16),
                  paddingBottom: Platform.OS === "web" ? h(16) : 0,
                }}
              >
                {Platform.OS === "web" ? (
                  createElement("input", {
                    type: "time",
                    "aria-label": "Lobby time",
                    value: rowToHtmlTimeValue(editingRow),
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                      const parsed = parseHtmlTimeValue(e.target.value);
                      if (!parsed || !editingTimeRowId) return;
                      setTimeRows((prev) =>
                        prev.map((r) =>
                          r.id === editingTimeRowId
                            ? { ...r, h: parsed.h, m: parsed.m }
                            : r,
                        ),
                      );
                    },
                    style: {
                      width: "100%",
                      boxSizing: "border-box",
                      padding: 14,
                      fontSize: 16,
                      borderRadius: 12,
                      border: `1.5px solid ${colors.border}`,
                      backgroundColor: colors.inputBg ?? colors.background,
                      color: colors.text,
                    },
                  })
                ) : (
                  <DateTimePicker
                    value={dateFromRowParts(date, editingRow.h, editingRow.m)}
                    mode="time"
                    display="spinner"
                    themeVariant={scheme === "dark" ? "dark" : "light"}
                    textColor={colors.text}
                    onChange={handleTimeChange}
                    style={{ width: "100%", height: 216 }}
                  />
                )}
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {feePickerRow ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setFeePickerRowId(null)}
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
              accessibilityLabel="Close fee picker"
              onPress={() => setFeePickerRowId(null)}
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
                  Select fee
                </Text>
                <Pressable onPress={() => setFeePickerRowId(null)} hitSlop={12}>
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
                {PRICE_OPTIONS.map((p) => {
                  const isSelected = feePickerRow.price === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => {
                        setTimeRows((prev) =>
                          prev.map((r) =>
                            r.id === feePickerRow.id ? { ...r, price: p } : r,
                          ),
                        );
                        setFeePickerRowId(null);
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
                        ₹{p}
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

      {bulkFeePickerOpen ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setBulkFeePickerOpen(false)}
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
              accessibilityLabel="Close bulk fee picker"
              onPress={() => setBulkFeePickerOpen(false)}
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
                  Set fee for all lobbies
                </Text>
                <Pressable
                  onPress={() => setBulkFeePickerOpen(false)}
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
                {PRICE_OPTIONS.map((p) => {
                  const isSelected = bulkFeeIfAllMatch === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => {
                        applyFeeToAllLobbies(p);
                        setBulkFeePickerOpen(false);
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
                        ₹{p}
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

      <Modal
        visible={showGamePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGamePicker(false)}
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
            accessibilityLabel="Close game list"
            onPress={() => setShowGamePicker(false)}
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
              backgroundColor: colors.cardBg,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: w(16),
                paddingVertical: h(14),
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: w(17),
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                Select game
              </Text>
              <Pressable onPress={() => setShowGamePicker(false)} hitSlop={12}>
                <Text
                  style={{
                    color: colors.tint,
                    fontWeight: "600",
                    fontSize: w(15),
                  }}
                >
                  Done
                </Text>
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: w(16), paddingVertical: h(10) }}>
              <TextInput
                value={gameSearchQuery}
                onChangeText={setGameSearchQuery}
                placeholder="Search name, slug, platform…"
                placeholderTextColor={colors.tabIconDefault}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: w(10),
                  paddingHorizontal: w(12),
                  paddingVertical: h(11),
                  fontSize: w(15),
                  color: colors.text,
                  backgroundColor: colors.inputBg,
                }}
              />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: h(400) }}
            >
              {filteredCatalogGames.length === 0 ? (
                <View style={{ paddingHorizontal: w(12), paddingVertical: h(8) }}>
                  <ClassicEmptyState
                    title="No matches"
                    message="Try another search term."
                    icon="search"
                    style={{ marginVertical: 0, paddingVertical: h(14) }}
                  />
                </View>
              ) : (
                filteredCatalogGames.map((g, idx) => {
                  const isLast = idx === filteredCatalogGames.length - 1;
                  const plat =
                    g.platform && g.platform.length > 0
                      ? g.platform.charAt(0).toUpperCase() +
                        g.platform.slice(1).toLowerCase()
                      : "";
                  return (
                    <Pressable
                      key={g.slug}
                      onPress={() => {
                        setSelectedGameSlug(g.slug);
                        setShowGamePicker(false);
                      }}
                      style={{
                        paddingVertical: h(14),
                        paddingHorizontal: w(16),
                        borderBottomWidth: isLast
                          ? 0
                          : StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border,
                        backgroundColor:
                          g.slug === selectedGameSlug
                            ? colors.tint + "18"
                            : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: w(16),
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {g.title}
                      </Text>
                      <Text
                        style={{
                          fontSize: w(12),
                          color: colors.tabIconDefault,
                          marginTop: h(4),
                        }}
                      >
                        {plat ? `${plat} · ` : ""}
                        {g.slug}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
  },
});
