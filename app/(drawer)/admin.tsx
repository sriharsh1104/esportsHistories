import { Button, Card, Input, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import {
  buildAdminDashboardStreamUrl,
  fetchAdminDashboardStats,
  fetchAdminUsers,
  parseAdminDashboardStreamPayload,
} from '@/services/admin.service';
import { ApiError } from '@/services/api.service';
import type { AdminDashboardStats, AdminUserRoleFilter, AdminUserRow } from '@/types/admin';
import { isAdminUser } from '@/utils/adminUser';
import { Redirect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getToken } from '@/services/common.service';
import Toast from 'react-native-toast-message';

type AdminSection = 'overview' | 'users';

const ROLE_FILTERS: AdminUserRoleFilter[] = ['ALL', 'ADMIN', 'HOST', 'USER', 'ORG_MANAGER'];

/** Chip / list: show `ORG MANAGER` instead of `ORG_MANAGER`, `org manager` instead of `org_manager`. */
function humanizeRoleLabel(role: string): string {
  return role.replace(/_/g, ' ');
}

function roleFilterLabel(r: AdminUserRoleFilter): string {
  return humanizeRoleLabel(r);
}

function formatINR(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${n.toFixed(0)}`;
  }
}

function formatNum(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-IN');
}

/** Wallet: user self vs admin manual vs sum; host fee credits stay in “Host fees paid”. */
const STAT_DEFS: { key: keyof AdminDashboardStats; label: string; format: 'int' | 'inr' }[] = [
  { key: 'totalUsers', label: 'Total users', format: 'int' },
  {
    key: 'userSelfTopupsINR',
    label: 'User self top-ups (INR)',
    format: 'inr',
  },
  {
    key: 'adminManualTopupsINR',
    label: 'Admin manual top-ups (INR)',
    format: 'inr',
  },
  {
    key: 'totalTopupsINR',
    label: 'Total top-ups — user + admin (INR)',
    format: 'inr',
  },
  { key: 'prizePoolDistributed', label: 'Prize pool paid (INR)', format: 'inr' },
  { key: 'platformProfit', label: 'Platform profit (INR)', format: 'inr' },
  { key: 'platformFeeCollected', label: 'Platform fees (INR)', format: 'inr' },
  { key: 'casterFeeCollected', label: 'Caster fees (INR)', format: 'inr' },
  {
    key: 'totalHostFeePaid',
    label: 'Host fees paid — system credits (INR)',
    format: 'inr',
  },
];

function feesBreakdownHasValues(
  fee: NonNullable<AdminDashboardStats['feesBreakdown']>
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
  colors: (typeof Colors)['light'];
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
      <Text style={{ color: colors.tabIconDefault, fontSize: w(14), flex: 1 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: w(15), fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function UserRow({
  row,
  colors,
  w,
  isLast,
}: {
  row: AdminUserRow;
  colors: (typeof Colors)['light'];
  w: (n: number) => number;
  isLast?: boolean;
}) {
  const title = row.displayName || row.fullName || row.name || row.email;
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
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: w(15), fontWeight: '600' }} numberOfLines={1}>
          {title}
        </Text>
        <Text style={{ color: colors.tabIconDefault, fontSize: w(13), marginTop: w(4) }} numberOfLines={1}>
          {row.email}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', marginLeft: w(8), maxWidth: '40%' }}>
        {row.role ? (
          <Text style={{ color: colors.tint, fontSize: w(12), fontWeight: '600' }} numberOfLines={1}>
            {humanizeRoleLabel(String(row.role))}
          </Text>
        ) : null}
        {row.status ? (
          <Text style={{ color: colors.tabIconDefault, fontSize: w(11), marginTop: w(4) }} numberOfLines={1}>
            {row.status}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function AdminScreen() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { w, h } = useResponsive();
  const [section, setSection] = useState<AdminSection>('overview');

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<AdminUserRoleFilter>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [userRows, setUserRows] = useState<AdminUserRow[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsError(null);
    setStatsLoading(true);
    try {
      const s = await fetchAdminDashboardStats();
      setStats(s);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load dashboard stats';
      setStatsError(msg);
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setStatsLoading(false);
    }
  }, []);

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
      const msg = e instanceof ApiError ? e.message : 'Failed to load users';
      setUsersError(msg);
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setUsersLoading(false);
    }
  }, [page, limit, searchApplied, roleFilter]);

  useEffect(() => {
    if (!isAuthenticated || !isAdminUser(user)) return;
    loadStats();
  }, [isAuthenticated, user, loadStats]);

  /** Web: SSE `/admin/dashboard/stream`. Native: poll stats every 45s while on Dashboard tab. */
  useEffect(() => {
    if (!isAuthenticated || !isAdminUser(user)) return;
    if (section !== 'overview') return;

    let es: EventSource | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    const token = getToken();

    const applySseData = (raw: string) => {
      const next = parseAdminDashboardStreamPayload(raw);
      if (next) setStats(next);
    };

    if (Platform.OS === 'web' && typeof EventSource !== 'undefined' && token) {
      try {
        es = new EventSource(buildAdminDashboardStreamUrl(token));
        es.onmessage = (ev) => applySseData(String(ev.data));
        es.addEventListener('stats', (ev: MessageEvent) => applySseData(String(ev.data)));
        es.addEventListener('dashboard', (ev: MessageEvent) => applySseData(String(ev.data)));
      } catch {
        es = null;
      }
    }

    if (!es) {
      interval = setInterval(() => {
        void fetchAdminDashboardStats().then(setStats).catch(() => {});
      }, 45000);
    }

    return () => {
      es?.close();
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, user, section]);

  useEffect(() => {
    if (section !== 'users') return;
    if (!isAuthenticated || !isAdminUser(user)) return;
    loadUsers();
  }, [section, isAuthenticated, user, loadUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (section === 'overview') await loadStats();
      else await loadUsers();
    } finally {
      setRefreshing(false);
    }
  }, [section, loadStats, loadUsers]);

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
    <Screen scroll={false} padded style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: h(32), paddingTop: h(4) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      >
        <View style={[styles.tabs, { borderBottomColor: colors.border, marginBottom: h(16) }]}>
          {(
            [
              { id: 'overview' as const, label: 'Dashboard' },
              { id: 'users' as const, label: 'Users' },
            ] as const
          ).map((t) => {
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
                    borderBottomColor: active ? colors.tint : 'transparent',
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: w(15),
                    fontWeight: active ? '600' : '400',
                    color: active ? colors.text : colors.tabIconDefault,
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {section === 'overview' && (
          <View>
            {statsLoading ? (
              <ActivityIndicator color={colors.tint} style={{ marginVertical: h(24) }} />
            ) : statsError ? (
              <Text style={{ color: colors.accent }}>{statsError}</Text>
            ) : (
              <>
                <Card style={{ marginBottom: h(16) }}>
                  <Text style={{ color: colors.text, fontSize: w(16), fontWeight: '700', marginBottom: w(8) }}>
                    Summary
                  </Text>
                  <Text
                    style={{
                      color: colors.tabIconDefault,
                      fontSize: w(12),
                      lineHeight: w(18),
                      marginBottom: w(12),
                    }}
                  >
                    User self top-ups = wallet top-up rows (success, addedBy user). Admin manual = addedBy admin.
                    Total top-ups = both; system / host-fee lines are excluded from that sum and appear under host
                    fees.
                  </Text>
                  {STAT_DEFS.map((def, i) => {
                    const v = stats?.[def.key] as number | undefined;
                    const text = def.format === 'inr' ? formatINR(v) : formatNum(v);
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
                  <Text style={{ color: colors.text, fontSize: w(16), fontWeight: '700', marginBottom: w(8) }}>
                    Lobbies (all time)
                  </Text>
                  <Text
                    style={{
                      color: colors.tabIconDefault,
                      fontSize: w(12),
                      marginBottom: w(12),
                    }}
                  >
                    Tournament collection: created, finished (completed / result_published), cancelled, running —
                    running matches active lobby count.
                  </Text>
                  {(
                    [
                      ['Total created', stats?.lobbyStats?.totalCreated],
                      [
                        'Finished (completed or result published)',
                        stats?.lobbyStats?.finishedSuccessful,
                      ],
                      ['Cancelled', stats?.lobbyStats?.cancelled],
                      [
                        'Running now',
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
                    <Text style={{ color: colors.text, fontSize: w(16), fontWeight: '700', marginBottom: w(8) }}>
                      Fees breakdown (INR, all time)
                    </Text>
                    {(
                      [
                        ['Platform', fee.platformFeeINR ?? fee.platformFeeGC],
                        ['Caster', fee.casterFeeINR ?? fee.casterFeeGC],
                        ['Host', fee.hostFeeINR ?? fee.hostFeeGC],
                        ['Total fees', fee.totalFeesINR ?? fee.totalFeesGC],
                        ['Winners paid', fee.winnerPoolPaidINR ?? fee.winnerPoolPaidGC],
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

        {section === 'users' && (
          <View>
            <Text style={{ color: colors.tabIconDefault, fontSize: w(14), marginBottom: h(8) }}>
              Total users (reported): {userTotal.toLocaleString('en-IN')}
            </Text>

            <Text style={{ color: colors.tabIconDefault, fontSize: w(12), marginBottom: h(6) }}>Role</Text>
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
                        fontWeight: '600',
                        color: active ? '#fff' : colors.text,
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

            <Card style={{ marginTop: h(16) }} padded>
              {usersLoading ? (
                <ActivityIndicator color={colors.tint} style={{ marginVertical: h(16) }} />
              ) : usersError ? (
                <Text style={{ color: colors.accent }}>{usersError}</Text>
              ) : userRows.length === 0 ? (
                <Text style={{ color: colors.tabIconDefault }}>No users for this query.</Text>
              ) : (
                userRows.map((item, i) => (
                  <UserRow
                    key={item.id}
                    row={item}
                    colors={colors}
                    w={w}
                    isLast={i === userRows.length - 1}
                  />
                ))
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
                  onPress={() => setPage((p) => Math.min(userTotalPages, p + 1))}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { borderBottomWidth: 2, marginRight: 8 },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
});
