import {
  AdminFinancialChart,
  AdminUserBlockActionBar,
} from "@/components/admin";
import { Button, Card, Input, Screen } from "@/components/ui";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/context/ResponsiveContext";
import {
  adminFinancialChartHasData,
  blockAdminUsers,
  buildAdminDashboardStreamUrl,
  fetchAdminDashboardStats,
  fetchAdminFinancialSeries,
  fetchAdminUsers,
  normalizeFinancialSeries,
  parseAdminDashboardStreamPayload,
  unblockAdminUsers,
} from "@/services/admin.service";
import { ApiError } from "@/services/api.service";
import { getToken } from "@/services/common.service";
import type {
  AdminDashboardStats,
  AdminFinancePeriod,
  AdminFinancialSeries,
  AdminUserRoleFilter,
  AdminUserRow,
} from "@/types/admin";
import { isAdminUser } from "@/utils/adminUser";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Redirect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

type AdminSection = "overview" | "users";

const FINANCE_PERIODS: { id: AdminFinancePeriod; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

const ROLE_FILTERS: AdminUserRoleFilter[] = [
  "ALL",
  "ADMIN",
  "HOST",
  "USER",
  "ORG_MANAGER",
];

/** Underscores → spaces for role strings from API. */
function humanizeRoleLabel(role: string): string {
  return String(role).replace(/_/g, " ").trim();
}

/** Title-style: each word’s first letter capital (e.g. `sriharsh` → `Sriharsh`, `org manager` → `Org Manager`). */
function capitalizeWords(text: string): string {
  const t = String(text).trim();
  if (!t) return t;
  return t
    .split(/\s+/)
    .map((part) =>
      part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part,
    )
    .join(" ");
}

function formatRoleForDisplay(role: string): string {
  return capitalizeWords(humanizeRoleLabel(role));
}

function roleFilterLabel(r: AdminUserRoleFilter): string {
  return capitalizeWords(humanizeRoleLabel(r));
}

/** Admin role rows cannot be bulk-blocked in this UI. */
function isAdminRoleForBulkBlock(role?: string): boolean {
  const r = String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]/g, "_");
  return r === "admin";
}

function formatINR(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${n.toFixed(0)}`;
  }
}

function formatNum(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
}

/** Wallet: user self vs admin manual vs sum; host fee credits stay in “Host fees paid”. */
const STAT_DEFS: {
  key: keyof AdminDashboardStats;
  label: string;
  format: "int" | "inr";
}[] = [
  { key: "totalUsers", label: "Total users", format: "int" },
  {
    key: "userSelfTopupsINR",
    label: "User self top-ups (INR)",
    format: "inr",
  },
  {
    key: "adminManualTopupsINR",
    label: "Admin manual top-ups (INR)",
    format: "inr",
  },
  {
    key: "totalTopupsINR",
    label: "Total top-ups — user + admin (INR)",
    format: "inr",
  },
  {
    key: "prizePoolDistributed",
    label: "Prize pool paid (INR)",
    format: "inr",
  },
  {
    key: "platformProfit",
    label: "Tournament fee profit — platform + caster (INR)",
    format: "inr",
  },
  {
    key: "walletNetFlowINR",
    label: "Wallet net flow — user top-ups minus prizes (INR)",
    format: "inr",
  },
  { key: "platformFeeCollected", label: "Platform fees (INR)", format: "inr" },
  { key: "casterFeeCollected", label: "Caster fees (INR)", format: "inr" },
  {
    key: "totalHostFeePaid",
    label: "Host fees paid — system credits (INR)",
    format: "inr",
  },
];

function feesBreakdownHasValues(
  fee: NonNullable<AdminDashboardStats["feesBreakdown"]>,
): boolean {
  const nums = [
    fee.platformFeeINR,
    fee.platformFeeGC,
    fee.casterFeeINR,
    fee.casterFeeGC,
    fee.hostFeeINR,
    fee.hostFeeGC,
    fee.totalFeesINR,
    fee.totalFeesGC,
    fee.winnerPoolPaidINR,
    fee.winnerPoolPaidGC,
  ];
  return nums.some((n) => n != null && Number.isFinite(n));
}

function StatRow({
  label,
  value,
  colors,
  w,
  isLast,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)["light"];
  w: (n: number) => number;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.statRow,
        {
          paddingVertical: w(12),
          borderBottomColor: colors.border,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Text style={{ color: colors.tabIconDefault, fontSize: w(14), flex: 1 }}>
        {label}
      </Text>
      <Text style={{ color: colors.text, fontSize: w(15), fontWeight: "600" }}>
        {value}
      </Text>
    </View>
  );
}

function UserRow({
  row,
  colors,
  w,
  isLast,
  selectable,
  selected,
  onToggleSelect,
  reserveSelectSlot,
}: {
  row: AdminUserRow;
  colors: (typeof Colors)["light"];
  w: (n: number) => number;
  isLast?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  /** When bulk-select is shown on the screen but this row isn’t selectable, keep column alignment. */
  reserveSelectSlot?: boolean;
}) {
  const rawTitle = row.displayName || row.fullName || row.name || row.email;
  const title = rawTitle === row.email ? rawTitle : capitalizeWords(rawTitle);
  return (
    <View
      style={[
        styles.userRow,
        {
          paddingVertical: w(12),
          borderBottomColor: colors.border,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {selectable && onToggleSelect ? (
        <Pressable
          onPress={onToggleSelect}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!selected }}
          hitSlop={8}
          style={{ marginRight: w(10), paddingTop: w(2) }}
        >
          <FontAwesome
            name={selected ? "check-square" : "square-o"}
            size={w(22)}
            color={selected ? colors.tint : colors.tabIconDefault}
          />
        </Pressable>
      ) : reserveSelectSlot ? (
        <View
          style={{
            width: w(22),
            marginRight: w(10),
            paddingTop: w(2),
            alignItems: "center",
          }}
          accessibilityElementsHidden
        >
          <FontAwesome
            name="lock"
            size={w(16)}
            color={colors.tabIconDefault + "99"}
          />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text
          style={{ color: colors.text, fontSize: w(15), fontWeight: "600" }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={{
            color: colors.tabIconDefault,
            fontSize: w(13),
            marginTop: w(4),
          }}
          numberOfLines={1}
        >
          {row.email}
        </Text>
        {row.isBlocked ? (
          <Text
            style={{
              color: "#c62828",
              fontSize: w(11),
              marginTop: w(4),
              fontWeight: "600",
            }}
            numberOfLines={1}
          >
            Blocked — cannot log in
          </Text>
        ) : null}
      </View>
      <View
        style={{ alignItems: "flex-end", marginLeft: w(8), maxWidth: "40%" }}
      >
        {row.role ? (
          <Text
            style={{ color: colors.tint, fontSize: w(12), fontWeight: "600" }}
            numberOfLines={1}
          >
            {formatRoleForDisplay(String(row.role))}
          </Text>
        ) : null}
        {row.status ? (
          <Text
            style={{
              color: colors.tabIconDefault,
              fontSize: w(11),
              marginTop: w(4),
            }}
            numberOfLines={1}
          >
            {capitalizeWords(String(row.status))}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function AdminScreen() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { w, h } = useResponsive();
  const [section, setSection] = useState<AdminSection>("overview");

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<AdminUserRoleFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [userRows, setUserRows] = useState<AdminUserRow[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [userBlockPending, setUserBlockPending] = useState<
    "block" | "unblock" | null
  >(null);

  const selectedCount = selectedUserIds.size;
  const selectedIdsList = useMemo(
    () => [...selectedUserIds],
    [selectedUserIds],
  );

  const [financePeriod, setFinancePeriod] =
    useState<AdminFinancePeriod>("daily");
  const [financeLoading, setFinanceLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsError(null);
    setStatsLoading(true);
    try {
      const s = await fetchAdminDashboardStats();
      setStats(s);
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Failed to load dashboard stats";
      setStatsError(msg);
      Toast.show({ type: "error", text1: msg });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadFinanceSeries = useCallback(async () => {
    setFinanceLoading(true);
    try {
      return await fetchAdminFinancialSeries(financePeriod);
    } catch {
      return { labels: [], totalIncome: [], netProfit: [] };
    } finally {
      setFinanceLoading(false);
    }
  }, [financePeriod]);

  const [financeSeries, setFinanceSeries] = useState<AdminFinancialSeries>({
    labels: [],
    totalIncome: [],
    netProfit: [],
  });

  const loadUsers = useCallback(async () => {
    setUsersError(null);
    setUsersLoading(true);
    try {
      const res = await fetchAdminUsers({
        page,
        limit,
        search: searchApplied || undefined,
        role: roleFilter,
      });
      setUserRows(res.items);
      setUserTotal(res.total);
      setUserTotalPages(res.totalPages);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load users";
      setUsersError(msg);
      Toast.show({ type: "error", text1: msg });
    } finally {
      setUsersLoading(false);
    }
  }, [page, limit, searchApplied, roleFilter]);

  useEffect(() => {
    if (!isAuthenticated || !isAdminUser(user)) return;
    loadStats();
  }, [isAuthenticated, user, loadStats]);

  useEffect(() => {
    if (!isAuthenticated || !isAdminUser(user)) return;
    if (section !== "overview") return;
    let cancelled = false;
    void (async () => {
      const s = await loadFinanceSeries();
      if (!cancelled) setFinanceSeries(s);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, section, loadFinanceSeries]);

  /** Web: SSE `/admin/dashboard/stream`. Native: poll stats every 45s while on Dashboard tab. */
  useEffect(() => {
    if (!isAuthenticated || !isAdminUser(user)) return;
    if (section !== "overview") return;

    let es: EventSource | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    const token = getToken();

    const applySseData = (raw: string) => {
      try {
        const parsed = JSON.parse(raw) as unknown;
        const next = parseAdminDashboardStreamPayload(parsed);
        if (next) setStats(next);
        const fs = normalizeFinancialSeries(parsed);
        if (adminFinancialChartHasData(fs)) setFinanceSeries(fs);
      } catch {
        /* invalid frame */
      }
    };

    if (Platform.OS === "web" && typeof EventSource !== "undefined" && token) {
      try {
        es = new EventSource(buildAdminDashboardStreamUrl(token));
        es.onmessage = (ev) => applySseData(String(ev.data));
        es.addEventListener("stats", (ev: MessageEvent) =>
          applySseData(String(ev.data)),
        );
        es.addEventListener("dashboard", (ev: MessageEvent) =>
          applySseData(String(ev.data)),
        );
      } catch {
        es = null;
      }
    }

    if (!es) {
      interval = setInterval(() => {
        void fetchAdminDashboardStats()
          .then(setStats)
          .catch(() => {});
      }, 45000);
    }

    return () => {
      es?.close();
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, user, section]);

  useEffect(() => {
    if (section !== "users") return;
    if (!isAuthenticated || !isAdminUser(user)) return;
    loadUsers();
  }, [section, isAuthenticated, user, loadUsers]);

  useEffect(() => {
    setSelectedUserIds(new Set());
  }, [page, roleFilter, searchApplied]);

  useEffect(() => {
    setSelectedUserIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        const row = userRows.find((r) => r.id === id);
        if (row && isAdminRoleForBulkBlock(row.role)) {
          changed = true;
          continue;
        }
        next.add(id);
      }
      return changed ? next : prev;
    });
  }, [userRows]);

  const toggleSelectUser = useCallback((id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const runBulkBlockUnblock = useCallback(
    async (mode: "block" | "unblock") => {
      const selfId = user?.id;
      const idsBase = selectedIdsList.filter((id) => id !== selfId);
      const ids =
        mode === "block"
          ? idsBase.filter((id) => {
              const row = userRows.find((r) => r.id === id);
              return !row || !isAdminRoleForBulkBlock(row.role);
            })
          : idsBase;
      if (ids.length === 0) {
        if (selectedIdsList.length === 0) {
          Toast.show({ type: "info", text1: "Select one or more users" });
          return;
        }
        if (idsBase.length === 0) {
          Toast.show({
            type: "info",
            text1: "Cannot include your own account in this action",
          });
          return;
        }
        if (
          mode === "block" &&
          idsBase.every((id) => {
            const row = userRows.find((r) => r.id === id);
            return row != null && isAdminRoleForBulkBlock(row.role);
          })
        ) {
          Toast.show({
            type: "info",
            text1: "Admin accounts cannot be blocked here",
          });
          return;
        }
        Toast.show({
          type: "info",
          text1:
            mode === "block"
              ? "No eligible users to block"
              : "No eligible users to unblock",
        });
        return;
      }
      setUserBlockPending(mode);
      try {
        if (mode === "block") await blockAdminUsers(ids);
        else await unblockAdminUsers(ids);
        Toast.show({
          type: "success",
          text1:
            mode === "block"
              ? "Selected users blocked"
              : "Selected users unblocked",
        });
        setSelectedUserIds(new Set());
        await loadUsers();
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.message
            : mode === "block"
              ? "Block request failed"
              : "Unblock request failed";
        Toast.show({ type: "error", text1: msg });
      } finally {
        setUserBlockPending(null);
      }
    },
    [selectedIdsList, user?.id, userRows, loadUsers],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (section === "overview") {
        await loadStats();
        const s = await loadFinanceSeries();
        setFinanceSeries(s);
      } else await loadUsers();
    } finally {
      setRefreshing(false);
    }
  }, [section, loadStats, loadUsers, loadFinanceSeries]);

  if (authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!isAuthenticated || !isAdminUser(user)) {
    return <Redirect href={ROUTES.HOME} />;
  }

  const fee = stats?.feesBreakdown;

  return (
    <Screen
      scroll={false}
      padded
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: h(32), paddingTop: h(4) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
      >
        <View
          style={[
            styles.tabs,
            { borderBottomColor: colors.border, marginBottom: h(16) },
          ]}
        >
          {([{ id: "overview" as const, label: "Dashboard" }] as const).map(
            (t) => {
              const active = section === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setSection(t.id)}
                  style={[
                    styles.tab,
                    {
                      paddingVertical: h(12),
                      paddingHorizontal: w(16),
                      borderBottomColor: active ? colors.tint : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: w(15),
                      fontWeight: active ? "600" : "400",
                      color: active ? colors.text : colors.tabIconDefault,
                    }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>

        {section === "overview" && (
          <View>
            {statsLoading ? (
              <ActivityIndicator
                color={colors.tint}
                style={{ marginVertical: h(24) }}
              />
            ) : statsError ? (
              <Text style={{ color: colors.accent }}>{statsError}</Text>
            ) : (
              <>
                <Card style={{ marginBottom: h(16) }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: w(16),
                      fontWeight: "700",
                      marginBottom: w(8),
                    }}
                  >
                    Summary
                  </Text>
                  {STAT_DEFS.map((def, i) => {
                    const v = stats?.[def.key] as number | undefined;
                    const text =
                      def.format === "inr" ? formatINR(v) : formatNum(v);
                    return (
                      <StatRow
                        key={String(def.key)}
                        label={def.label}
                        value={text}
                        colors={colors}
                        w={w}
                        isLast={i === STAT_DEFS.length - 1}
                      />
                    );
                  })}
                </Card>

                <Card style={{ marginBottom: h(16) }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: h(10),
                      flexWrap: "wrap",
                      gap: h(8),
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: w(16),
                        fontWeight: "700",
                      }}
                    >
                      Financial analytics
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: w(6),
                      }}
                    >
                      {FINANCE_PERIODS.map((p) => {
                        const active = financePeriod === p.id;
                        return (
                          <Pressable
                            key={p.id}
                            onPress={() => setFinancePeriod(p.id)}
                            style={({ pressed }) => ({
                              paddingVertical: w(6),
                              paddingHorizontal: w(12),
                              borderRadius: w(10),
                              borderWidth: 1,
                              borderColor: active ? colors.tint : colors.border,
                              backgroundColor: active
                                ? colors.tint + "22"
                                : colors.cardBg,
                              opacity: pressed ? 0.85 : 1,
                            })}
                          >
                            <Text
                              style={{
                                fontSize: w(12),
                                fontWeight: "600",
                                color: active
                                  ? colors.tint
                                  : colors.tabIconDefault,
                              }}
                            >
                              {p.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  <Text
                    style={{
                      color: colors.tabIconDefault,
                      fontSize: w(11),
                      marginBottom: h(10),
                    }}
                  >
                    From admin analytics API (or dashboard stats with period).
                    Violet = total income, amber = net profit — matches app
                    theme, not a 1:1 copy of third-party UIs.
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: w(16),
                      marginBottom: h(8),
                    }}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <View
                        style={{
                          width: w(10),
                          height: w(10),
                          borderRadius: w(2),
                          backgroundColor: colors.tint,
                          marginRight: w(6),
                        }}
                      />
                      <Text
                        style={{
                          color: colors.tabIconDefault,
                          fontSize: w(12),
                        }}
                      >
                        Total income
                      </Text>
                    </View>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <View
                        style={{
                          width: w(10),
                          height: w(10),
                          borderRadius: w(2),
                          backgroundColor: colors.accent,
                          marginRight: w(6),
                        }}
                      />
                      <Text
                        style={{
                          color: colors.tabIconDefault,
                          fontSize: w(12),
                        }}
                      >
                        Net profit
                      </Text>
                    </View>
                  </View>
                  {financeLoading ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: h(8),
                        gap: w(8),
                      }}
                    >
                      <ActivityIndicator size="small" color={colors.tint} />
                      <Text
                        style={{
                          color: colors.tabIconDefault,
                          fontSize: w(12),
                        }}
                      >
                        Updating {financePeriod}…
                      </Text>
                    </View>
                  ) : null}
                  <AdminFinancialChart
                    period={financePeriod}
                    labels={financeSeries.labels}
                    income={financeSeries.totalIncome}
                    profit={financeSeries.netProfit}
                    incomeColor={colors.tint}
                    profitColor={colors.accent}
                    gridColor={colors.border + "99"}
                    axisLabelColor={colors.tabIconDefault}
                    height={h(220)}
                  />
                </Card>

                <Card style={{ marginBottom: h(16) }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: w(16),
                      fontWeight: "700",
                      marginBottom: w(8),
                    }}
                  >
                    Lobbies (all time)
                  </Text>
                  <Text
                    style={{
                      color: colors.tabIconDefault,
                      fontSize: w(12),
                      marginBottom: w(12),
                    }}
                  >
                    Tournament collection: created, finished (completed /
                    result_published), cancelled, running — running matches
                    active lobby count.
                  </Text>
                  {(
                    [
                      ["Total created", stats?.lobbyStats?.totalCreated],
                      [
                        "Finished (completed or result published)",
                        stats?.lobbyStats?.finishedSuccessful,
                      ],
                      ["Cancelled", stats?.lobbyStats?.cancelled],
                      [
                        "Running now",
                        stats?.lobbyStats?.running ?? stats?.activeLobbyCount,
                      ],
                    ] as [string, number | undefined][]
                  ).map(([label, val], i, arr) => (
                    <StatRow
                      key={label}
                      label={label}
                      value={formatNum(val)}
                      colors={colors}
                      w={w}
                      isLast={i === arr.length - 1}
                    />
                  ))}
                </Card>
                {fee && feesBreakdownHasValues(fee) ? (
                  <Card>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: w(16),
                        fontWeight: "700",
                        marginBottom: w(8),
                      }}
                    >
                      Fees breakdown (INR, all time)
                    </Text>
                    {(
                      [
                        ["Platform", fee.platformFeeINR ?? fee.platformFeeGC],
                        ["Caster", fee.casterFeeINR ?? fee.casterFeeGC],
                        ["Host", fee.hostFeeINR ?? fee.hostFeeGC],
                        ["Total fees", fee.totalFeesINR ?? fee.totalFeesGC],
                        [
                          "Winners paid",
                          fee.winnerPoolPaidINR ?? fee.winnerPoolPaidGC,
                        ],
                      ] as [string, number | undefined][]
                    ).map(([label, val], i, arr) => (
                      <StatRow
                        key={label}
                        label={label}
                        value={formatINR(val)}
                        colors={colors}
                        w={w}
                        isLast={i === arr.length - 1}
                      />
                    ))}
                  </Card>
                ) : null}
              </>
            )}
          </View>
        )}

        {section === "users" && (
          <View>
            <Text
              style={{
                color: colors.tabIconDefault,
                fontSize: w(14),
                marginBottom: h(8),
              }}
            >
              Total users (reported): {userTotal.toLocaleString("en-IN")}
            </Text>

            <Text
              style={{
                color: colors.tabIconDefault,
                fontSize: w(12),
                marginBottom: h(6),
              }}
            >
              Role
            </Text>
            <View style={[styles.roleRow, { gap: w(8), marginBottom: h(12) }]}>
              {ROLE_FILTERS.map((r) => {
                const active = roleFilter === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => {
                      setRoleFilter(r);
                      setPage(1);
                    }}
                    style={({ pressed }) => ({
                      paddingVertical: w(8),
                      paddingHorizontal: w(12),
                      borderRadius: w(10),
                      borderWidth: 1,
                      borderColor: active ? colors.tint : colors.border,
                      backgroundColor: active ? colors.tint : colors.cardBg,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontSize: w(12),
                        fontWeight: "600",
                        color: active ? "#fff" : colors.text,
                      }}
                    >
                      {roleFilterLabel(r)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Input
              label="Search"
              placeholder="Name or email"
              value={searchInput}
              onChangeText={setSearchInput}
              autoCapitalize="none"
              leftIcon="search"
            />
            <Button
              title="Search"
              onPress={() => {
                setSearchApplied(searchInput.trim());
                setPage(1);
              }}
              fullWidth
              style={{ marginTop: h(12) }}
            />

            <AdminUserBlockActionBar
              selectedCount={selectedCount}
              pendingAction={userBlockPending}
              onBlock={() => void runBulkBlockUnblock("block")}
              onUnblock={() => void runBulkBlockUnblock("unblock")}
            />

            <Card style={{ marginTop: h(16) }} padded>
              {usersLoading ? (
                <ActivityIndicator
                  color={colors.tint}
                  style={{ marginVertical: h(16) }}
                />
              ) : usersError ? (
                <Text style={{ color: colors.accent }}>{usersError}</Text>
              ) : userRows.length === 0 ? (
                <Text style={{ color: colors.tabIconDefault }}>
                  No users for this query.
                </Text>
              ) : (
                userRows.map((item, i) => {
                  const canBulkSelect = !isAdminRoleForBulkBlock(item.role);
                  return (
                    <UserRow
                      key={item.id}
                      row={item}
                      colors={colors}
                      w={w}
                      isLast={i === userRows.length - 1}
                      selectable={canBulkSelect}
                      reserveSelectSlot={!canBulkSelect}
                      selected={canBulkSelect && selectedUserIds.has(item.id)}
                      onToggleSelect={
                        canBulkSelect
                          ? () => toggleSelectUser(item.id)
                          : undefined
                      }
                    />
                  );
                })
              )}
            </Card>

            {userTotalPages > 1 && !usersLoading && (
              <View style={[styles.pager, { marginTop: h(16), gap: w(12) }]}>
                <Button
                  title="Previous"
                  variant="outline"
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                />
                <Text style={{ color: colors.tabIconDefault, fontSize: w(14) }}>
                  {page} / {userTotalPages}
                </Text>
                <Button
                  title="Next"
                  variant="outline"
                  disabled={page >= userTotalPages}
                  onPress={() =>
                    setPage((p) => Math.min(userTotalPages, p + 1))
                  }
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { borderBottomWidth: 2, marginRight: 8 },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
});
