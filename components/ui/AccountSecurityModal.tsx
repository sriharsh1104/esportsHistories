import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '@/services/api.service';
import { formatDateTimeDdMmYyyyAmPm } from '@/utils';
import {
  disableTwoFactor,
  enableTwoFactor,
  getDeviceHistory,
  getTwoFactorStatus,
  logoutDevice,
  setupTwoFactor,
  type TwoFactorSetup,
} from '@/services/auth.service';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { SettingsRow } from './SettingsRow';

type AccountSecurityModalProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Logout actions call `auth.service.logout()` → POST `/auth/logout` or POST `/auth/logout-all`
 * (paths from `API_ENDPOINTS.AUTH`, resolved against `apiBaseUrl`).
 */
export function AccountSecurityModal({
  visible,
  onClose,
}: AccountSecurityModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutInFlight = useRef(false);

  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [activeDevices, setActiveDevices] = useState<
    Array<{
      sessionId: string;
      label: string;
      ip?: string;
      lastUsedAt?: string;
      expiresAt?: string;
      isCurrent?: boolean;
    }>
  >([]);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      label: string;
      action?: string;
      ip?: string;
      createdAt?: string;
      lastUsedAt?: string;
      expiresAt?: string;
      loggedInAt?: string;
      loggedOutAt?: string;
      logoutReason?: string;
    }>
  >([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [sessionsTableOpen, setSessionsTableOpen] = useState(false);
  const [loginHistoryOpen, setLoginHistoryOpen] = useState(false);
  const [loginHistoryPage, setLoginHistoryPage] = useState(1);
  const [loginHistoryLimit] = useState(20);
  const [loginHistoryTotalPages, setLoginHistoryTotalPages] = useState(1);
  const [loginHistoryTotal, setLoginHistoryTotal] = useState(0);
  const [activeSessionsPage, setActiveSessionsPage] = useState(1);
  const [activeSessionsLimit] = useState(20);
  const [activeSessionsTotalPages, setActiveSessionsTotalPages] = useState(1);

  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState<boolean | null>(null);
  const [twoFaSetup, setTwoFaSetup] = useState<TwoFactorSetup | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaError, setTwoFaError] = useState<string | null>(null);
  const [twoFaModalVisible, setTwoFaModalVisible] = useState(false);

  const formatDeviceLabel = useCallback((deviceInfo: unknown): string => {
    if (!deviceInfo) return 'Unknown device';
    if (typeof deviceInfo === 'string') return deviceInfo.trim() || 'Unknown device';
    if (typeof deviceInfo !== 'object') return 'Unknown device';
    const o = deviceInfo as Record<string, unknown>;
    const parts: string[] = [];
    const brand = String(o.brand ?? o.manufacturer ?? '').trim();
    const model = String(o.model ?? o.deviceModel ?? o.device ?? '').trim();
    const os = String(o.os ?? o.platform ?? o.osName ?? '').trim();
    const osVersion = String(o.osVersion ?? o.systemVersion ?? o.version ?? '').trim();
    const ua = String(o.userAgent ?? '').trim();
    if (brand) parts.push(brand);
    if (model && model !== brand) parts.push(model);
    if (os) parts.push(os + (osVersion ? ` ${osVersion}` : ''));
    const out = parts.join(' • ').trim();
    if (out) return out;
    if (ua) return ua.length > 48 ? `${ua.slice(0, 48)}…` : ua;
    return 'Unknown device';
  }, []);

  const refreshDevices = useCallback(
    async (opts?: {
      page?: number;
      limit?: number;
      includeHistory?: boolean;
      includeActive?: boolean;
    }) => {
    setDevicesError(null);
    setDevicesLoading(true);
    try {
      const res = await getDeviceHistory(opts);
      setActiveDevices(
        (res.activeDevices ?? []).map((d) => ({
          sessionId: d.sessionId,
          label: (d.deviceLabel ?? '').trim() || formatDeviceLabel(d.deviceInfo),
          ip: d.ip,
          lastUsedAt: d.lastUsedAt,
          expiresAt: d.expiresAt,
          isCurrent: d.isCurrent === true,
        }))
      );
      if (opts?.includeHistory) {
        setHistoryLoaded(true);
        setHistory(
          (res.history ?? []).map((h, idx) => ({
            id: String(h.id ?? `${h.sessionId ?? 'event'}-${idx}`),
            label: (h.deviceLabel ?? '').trim() || formatDeviceLabel(h.deviceInfo),
            action: h.action,
            ip: h.ip,
            createdAt: h.createdAt,
            lastUsedAt: h.lastUsedAt,
            expiresAt: h.expiresAt,
            loggedInAt: h.loggedInAt,
            loggedOutAt: h.loggedOutAt,
            logoutReason: h.logoutReason,
          }))
        );
        if (res.historyMeta) {
          setLoginHistoryPage(res.historyMeta.page);
          setLoginHistoryTotalPages(res.historyMeta.totalPages);
          setLoginHistoryTotal(res.historyMeta.total);
        } else {
          // Non-paginated response fallback.
          setLoginHistoryTotalPages(1);
          setLoginHistoryTotal((res.history ?? []).length);
        }
      } else {
        // Default: server doesn't send history. Keep it unloaded/empty until explicitly requested.
        setHistoryLoaded(false);
        setHistory([]);
        setLoginHistoryPage(1);
        setLoginHistoryTotalPages(1);
        setLoginHistoryTotal(0);
      }

      if (res.activeDevicesMeta) {
        setActiveSessionsPage(res.activeDevicesMeta.page);
        setActiveSessionsTotalPages(res.activeDevicesMeta.totalPages);
      } else {
        setActiveSessionsPage(1);
        setActiveSessionsTotalPages(1);
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load device history';
      setDevicesError(msg);
      setActiveDevices([]);
      setHistory([]);
      setHistoryLoaded(false);
      setLoginHistoryTotalPages(1);
      setLoginHistoryTotal(0);
      setActiveSessionsPage(1);
      setActiveSessionsTotalPages(1);
    } finally {
      setDevicesLoading(false);
    }
    },
    [formatDeviceLabel]
  );

  const twoFaVisibleValue = useMemo(() => {
    if (twoFaEnabled === null) return '…';
    return twoFaEnabled ? 'Enabled' : 'Off';
  }, [twoFaEnabled]);

  const refreshTwoFa = useCallback(async () => {
    setTwoFaError(null);
    setTwoFaLoading(true);
    try {
      const status = await getTwoFactorStatus();
      setTwoFaEnabled(status.enabled);
      if (status.enabled) {
        setTwoFaSetup(null);
        setTwoFaCode('');
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load 2FA status';
      setTwoFaError(msg);
      setTwoFaEnabled(null);
    } finally {
      setTwoFaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void refreshTwoFa();
    // Default load: only active sessions (no history).
    void refreshDevices({ includeHistory: false });
  }, [visible, refreshTwoFa]);

  const onPressTwoFa = useCallback(async () => {
    if (twoFaLoading) return;
    setTwoFaError(null);
    setTwoFaModalVisible(true);
    if (twoFaEnabled === true) return;
    if (twoFaSetup) return;
    setTwoFaError(null);
    setTwoFaLoading(true);
    try {
      const setup = await setupTwoFactor();
      setTwoFaSetup(setup);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to setup 2FA';
      setTwoFaError(msg);
    } finally {
      setTwoFaLoading(false);
    }
  }, [twoFaEnabled, twoFaLoading, twoFaSetup]);

  const onPressEnable2fa = useCallback(async () => {
    const code = twoFaCode.trim();
    if (code.length < 6) {
      setTwoFaError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setTwoFaError(null);
    setTwoFaLoading(true);
    try {
      await enableTwoFactor(code);
      setTwoFaSetup(null);
      setTwoFaCode('');
      await refreshTwoFa();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to enable 2FA';
      setTwoFaError(msg);
    } finally {
      setTwoFaLoading(false);
    }
  }, [twoFaCode, refreshTwoFa]);

  const onPressDisable2fa = useCallback(async () => {
    const code = twoFaCode.trim();
    if (code.length < 6) {
      setTwoFaError('Enter the current 6-digit code to disable 2FA.');
      return;
    }
    setTwoFaError(null);
    setTwoFaLoading(true);
    try {
      await disableTwoFactor(code);
      setTwoFaSetup(null);
      setTwoFaCode('');
      await refreshTwoFa();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to disable 2FA';
      setTwoFaError(msg);
    } finally {
      setTwoFaLoading(false);
    }
  }, [twoFaCode, refreshTwoFa]);

  const runLogout = useCallback(
    async (allDevices: boolean) => {
      if (logoutInFlight.current) return;
      logoutInFlight.current = true;
      setLoggingOut(true);
      try {
        await logout(allDevices ? { allDevices: true } : undefined);
        onClose();
        router.replace(ROUTES.LOGIN);
      } finally {
        logoutInFlight.current = false;
        setLoggingOut(false);
      }
    },
    [logout, onClose]
  );

  /** Tap → `POST /auth/logout` (via `auth.service.logout`) */
  const onPressLogoutThisDevice = useCallback(() => {
    void runLogout(false);
  }, [runLogout]);

  /** Tap → `POST /auth/logout-all` (via `auth.service.logout({ allDevices: true })`) */
  const onPressLogoutAllDevices = useCallback(() => {
    void runLogout(true);
  }, [runLogout]);

  const onPressLogoutSession = useCallback(
    async (sessionId: string, isCurrent?: boolean) => {
      if (loggingOut || devicesLoading) return;
      if (isCurrent) {
        void runLogout(false);
        return;
      }
      setDevicesError(null);
      setDevicesLoading(true);
      try {
        await logoutDevice(sessionId);
        await refreshDevices();
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Failed to logout device';
        setDevicesError(msg);
      } finally {
        setDevicesLoading(false);
      }
    },
    [devicesLoading, loggingOut, refreshDevices, runLogout]
  );

  const sectionTitle = {
    fontSize: w(14),
    fontWeight: '600' as const,
    marginBottom: h(8),
    color: colors.tabIconDefault,
  };
  const cardStyle = { padding: 0, overflow: 'hidden' as const };
  const modalCardStyle = useMemo(
    () => ({
      backgroundColor: colors.cardBg,
      borderRadius: w(20),
      borderWidth: 1,
      borderColor: colors.border,
      paddingTop: h(12),
      paddingHorizontal: w(16),
      paddingBottom: h(16),
      maxHeight: '92%' as const,
      width: '100%' as const,
      maxWidth: w(720),
      alignSelf: 'center' as const,
    }),
    [colors.border, colors.cardBg, h, w]
  );

  const ModalShell = useCallback(
    ({
      open,
      title,
      onCloseModal,
      children,
    }: {
      open: boolean;
      title: string;
      onCloseModal: () => void;
      children: React.ReactNode;
    }) => (
      <Modal visible={open} transparent animationType="fade" onRequestClose={onCloseModal}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'flex-start',
            paddingTop: Math.max(insets.top + h(12), h(20)),
            paddingHorizontal: w(14),
            paddingBottom: Math.max(insets.bottom, h(14)),
          }}
          onPress={onCloseModal}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={modalCardStyle}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: h(12),
                gap: w(10),
              }}
            >
              <Text style={{ fontSize: w(18), fontWeight: '700', color: colors.text, flex: 1 }}>
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onCloseModal}
                hitSlop={12}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: w(8) })}
              >
                <FontAwesome name="times" size={w(20)} color={colors.tabIconDefault} />
              </Pressable>
            </View>
            {children}
          </Pressable>
        </Pressable>
      </Modal>
    ),
    [colors.cardBg, colors.tabIconDefault, colors.text, h, insets.bottom, insets.top, modalCardStyle, w]
  );

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'flex-end',
          }}
          onPress={onClose}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.cardBg,
              borderTopLeftRadius: w(20),
              borderTopRightRadius: w(20),
              borderWidth: 1,
              borderBottomWidth: 0,
              borderColor: colors.border,
              paddingTop: h(12),
              paddingHorizontal: w(20),
              paddingBottom: Math.max(insets.bottom, h(16)),
              maxHeight: '88%',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: h(16),
              }}
            >
              <Text
                style={{
                  fontSize: w(20),
                  fontWeight: '700',
                  color: colors.text,
                  flex: 1,
                }}
              >
                Account security
              </Text>
              {loggingOut ? (
                <ActivityIndicator color={colors.tint} style={{ marginRight: w(8) }} />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close account security"
                  onPress={onClose}
                  hitSlop={12}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: w(8) })}
                >
                  <FontAwesome name="times" size={w(22)} color={colors.tabIconDefault} />
                </Pressable>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ marginBottom: h(20) }}>
              <Text style={sectionTitle}>LOGOUT</Text>
              <Card style={cardStyle} padded={false}>
                <SettingsRow
                  icon="sign-out"
                  label="Log out from this device"
                  onPress={loggingOut ? undefined : onPressLogoutThisDevice}
                  destructive
                />
                <SettingsRow
                  icon="power-off"
                  label="Log out from all devices"
                  onPress={loggingOut ? undefined : onPressLogoutAllDevices}
                  destructive
                />
              </Card>
            </View>

            <View style={{ marginBottom: h(20) }}>
              <Text style={sectionTitle}>SECURITY</Text>
              <Card style={cardStyle} padded={false}>
                <SettingsRow
                  icon="key"
                  label="Two-factor authentication (2FA)"
                  value={twoFaVisibleValue}
                  showArrow={!twoFaLoading}
                  onPress={onPressTwoFa}
                />
                <SettingsRow
                  icon="mobile"
                  label="Authenticator app"
                  value={twoFaEnabled ? 'Configured' : 'Not set'}
                  showArrow={false}
                />
                <SettingsRow
                  icon="shield"
                  label="Login alerts"
                  value="Coming soon"
                  showArrow={false}
                />
                <SettingsRow
                  icon="history"
                  label="Login History"
                  value={
                    devicesLoading
                      ? 'Loading…'
                      : historyLoaded
                        ? history.length > 0
                          ? `${history.length}`
                          : 'None'
                        : 'Tap to load'
                  }
                  showArrow={!devicesLoading}
                  onPress={() => {
                    setLoginHistoryOpen(true);
                    void refreshDevices({ page: 1, limit: loginHistoryLimit, includeHistory: true });
                  }}
                />
              </Card>
            </View>

            <View style={{ marginBottom: h(8) }}>
              <Text style={sectionTitle}>SESSIONS</Text>
              <Card style={cardStyle} padded={false}>
                <SettingsRow
                  icon="desktop"
                  label="Active sessions"
                  value={
                    devicesLoading
                      ? 'Loading…'
                      : activeDevices.length > 0
                        ? `${activeDevices.length}`
                        : 'None'
                  }
                  showArrow={!devicesLoading}
                  onPress={() => {
                    setSessionsTableOpen(true);
                    void refreshDevices({ page: activeSessionsPage, limit: activeSessionsLimit });
                  }}
                />
                {devicesLoading && activeDevices.length === 0 ? (
                  <View style={{ paddingHorizontal: w(16), paddingVertical: h(14) }}>
                    <Text style={{ color: colors.tabIconDefault, fontSize: w(13) }}>
                      Loading sessions…
                    </Text>
                  </View>
                ) : activeDevices.length === 0 ? (
                  <View style={{ paddingHorizontal: w(16), paddingVertical: h(14) }}>
                    <Text style={{ color: colors.tabIconDefault, fontSize: w(13) }}>
                      No active sessions found.
                    </Text>
                  </View>
                ) : (
                  activeDevices.map((item, index) => (
                    <View
                      key={item.sessionId}
                      style={{
                        paddingHorizontal: w(16),
                        paddingVertical: h(14),
                        borderBottomWidth: index === activeDevices.length - 1 ? 0 : 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: w(10) }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontSize: w(15), fontWeight: '600' }}>
                            {item.label}
                            {item.isCurrent ? ' (Current)' : ''}
                          </Text>
                          {!!item.ip && (
                            <Text
                              style={{
                                color: colors.tabIconDefault,
                                fontSize: w(12),
                                marginTop: h(2),
                              }}
                            >
                              IP: {item.ip}
                            </Text>
                          )}
                          {!!item.lastUsedAt && (
                            <Text
                              style={{
                                color: colors.tabIconDefault,
                                fontSize: w(12),
                                marginTop: h(2),
                              }}
                            >
                              Last used: {formatDateTimeDdMmYyyyAmPm(item.lastUsedAt)}
                            </Text>
                          )}
                          {!!item.expiresAt && (
                            <Text
                              style={{
                                color: colors.tabIconDefault,
                                fontSize: w(12),
                                marginTop: h(2),
                              }}
                            >
                              Expires: {formatDateTimeDdMmYyyyAmPm(item.expiresAt)}
                            </Text>
                          )}
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Logout device"
                          onPress={() => void onPressLogoutSession(item.sessionId, item.isCurrent)}
                          style={({ pressed }) => ({
                            alignSelf: 'flex-start',
                            paddingVertical: h(6),
                            paddingHorizontal: w(10),
                            borderRadius: w(10),
                            borderWidth: 1,
                            borderColor: colors.border,
                            opacity: pressed ? 0.7 : 1,
                            backgroundColor: 'transparent',
                          })}
                        >
                          <Text style={{ color: '#dc3545', fontWeight: '700', fontSize: w(12) }}>
                            {item.isCurrent ? 'Logout' : 'Logout'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </Card>
              {!!devicesError && (
                <Text style={{ color: '#dc3545', marginTop: h(10) }}>{devicesError}</Text>
              )}
            </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ModalShell
        open={sessionsTableOpen}
        title="Active Sessions"
        onCloseModal={() => setSessionsTableOpen(false)}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {activeDevices.length === 0 ? (
            <Text style={{ color: colors.tabIconDefault }}>No active sessions found.</Text>
          ) : (
            activeDevices.map((s, idx) => (
              <View
                key={s.sessionId}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: w(16),
                  padding: w(12),
                  marginBottom: h(10),
                  backgroundColor: 'rgba(127,127,127,0.05)',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: w(10) }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.tabIconDefault, fontSize: w(12), marginBottom: h(4) }}>
                      #{idx + 1} {s.isCurrent ? '• Current' : ''}
                    </Text>
                    <Text style={{ color: colors.text, fontSize: w(14), fontWeight: '700' }}>
                      {s.label}
                    </Text>
                    <Text style={{ color: colors.tabIconDefault, fontSize: w(12), marginTop: h(6) }}>
                      Last used: {formatDateTimeDdMmYyyyAmPm(s.lastUsedAt)}
                    </Text>
                    <Text style={{ color: colors.tabIconDefault, fontSize: w(12), marginTop: h(2) }}>
                      Expires: {formatDateTimeDdMmYyyyAmPm(s.expiresAt)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Logout session"
                    onPress={() => void onPressLogoutSession(s.sessionId, s.isCurrent)}
                    style={({ pressed }) => ({
                      alignSelf: 'flex-start',
                      opacity: pressed ? 0.75 : 1,
                      paddingVertical: h(8),
                      paddingHorizontal: w(12),
                      borderRadius: w(12),
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: 'transparent',
                    })}
                  >
                    <Text style={{ color: '#dc3545', fontWeight: '800', fontSize: w(12) }}>
                      Logout
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
          {activeSessionsTotalPages > 1 && (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  marginTop: h(4),
                }}
              >
                <Text style={{ color: colors.tabIconDefault, fontSize: w(12) }}>
                  {activeSessionsPage}/{activeSessionsTotalPages}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: w(10), marginTop: h(10) }}>
                <Button
                  title="Prev"
                  onPress={() => {
                    const nextPage = Math.max(1, activeSessionsPage - 1);
                    if (nextPage === activeSessionsPage) return;
                    void refreshDevices({ page: nextPage, limit: activeSessionsLimit });
                  }}
                  disabled={devicesLoading || activeSessionsPage <= 1}
                  fullWidth
                />
                <Button
                  title="Next"
                  onPress={() => {
                    const nextPage = Math.min(activeSessionsTotalPages, activeSessionsPage + 1);
                    if (nextPage === activeSessionsPage) return;
                    void refreshDevices({ page: nextPage, limit: activeSessionsLimit });
                  }}
                  disabled={devicesLoading || activeSessionsPage >= activeSessionsTotalPages}
                  fullWidth
                />
              </View>
            </>
          )}
        </ScrollView>
      </ModalShell>

      <ModalShell
        open={loginHistoryOpen}
        title="Login History"
        onCloseModal={() => setLoginHistoryOpen(false)}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {devicesLoading && history.length === 0 ? (
            <Text style={{ color: colors.tabIconDefault }}>Loading…</Text>
          ) : history.length === 0 ? (
            <Text style={{ color: colors.tabIconDefault }}>No history.</Text>
          ) : (
            history.map((row, idx) => (
              <View
                key={row.id}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: w(16),
                  padding: w(12),
                  marginBottom: h(10),
                  backgroundColor: 'rgba(127,127,127,0.05)',
                }}
              >
                <Text style={{ color: colors.tabIconDefault, fontSize: w(12), marginBottom: h(4) }}>
                  #{(loginHistoryPage - 1) * loginHistoryLimit + idx + 1}
                </Text>
                <Text style={{ color: colors.text, fontSize: w(14), fontWeight: '800' }}>
                  {row.label}
                </Text>
                <View style={{ marginTop: h(8) }}>
                  <Text style={{ color: colors.tabIconDefault, fontSize: w(12) }}>
                    Logged in: {formatDateTimeDdMmYyyyAmPm(row.loggedInAt)}
                  </Text>
                  <Text style={{ color: colors.tabIconDefault, fontSize: w(12), marginTop: h(2) }}>
                    Logged out: {formatDateTimeDdMmYyyyAmPm(row.loggedOutAt)}
                  </Text>
                  <Text style={{ color: colors.tabIconDefault, fontSize: w(12), marginTop: h(2) }}>
                    Logout reason: {String(row.logoutReason ?? '').trim() || '-'}
                  </Text>
                </View>
              </View>
            ))
          )}

          {loginHistoryTotalPages > 1 && (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  marginTop: h(4),
                }}
              >
                <Text style={{ color: colors.tabIconDefault, fontSize: w(12) }}>
                  {loginHistoryPage}/{loginHistoryTotalPages}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: w(10), marginTop: h(10) }}>
                <Button
                  title="Prev"
                  onPress={() => {
                    const nextPage = Math.max(1, loginHistoryPage - 1);
                    if (nextPage === loginHistoryPage) return;
                    void refreshDevices({ page: nextPage, limit: loginHistoryLimit, includeHistory: true });
                  }}
                  disabled={devicesLoading || loginHistoryPage <= 1}
                  fullWidth
                />
                <Button
                  title="Next"
                  onPress={() => {
                    const nextPage = Math.min(loginHistoryTotalPages, loginHistoryPage + 1);
                    if (nextPage === loginHistoryPage) return;
                    void refreshDevices({ page: nextPage, limit: loginHistoryLimit, includeHistory: true });
                  }}
                  disabled={devicesLoading || loginHistoryPage >= loginHistoryTotalPages}
                  fullWidth
                />
              </View>
            </>
          )}
        </ScrollView>
      </ModalShell>

      {/* Keep this Modal last so it always overlays the account sheet */}
      <Modal
        visible={twoFaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTwoFaModalVisible(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss 2FA"
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'flex-start',
            paddingTop: Math.max(insets.top + h(12), h(20)),
            paddingHorizontal: w(14),
            paddingBottom: Math.max(insets.bottom, h(14)),
          }}
          onPress={() => setTwoFaModalVisible(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.cardBg,
              borderRadius: w(20),
              borderWidth: 1,
              borderColor: colors.border,
              paddingTop: h(12),
              paddingHorizontal: w(20),
              paddingBottom: h(16),
              maxHeight: '92%',
              width: '100%',
              maxWidth: w(520),
              alignSelf: 'center',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: h(16),
              }}
            >
              <Text
                style={{
                  fontSize: w(20),
                  fontWeight: '700',
                  color: colors.text,
                  flex: 1,
                }}
              >
                Two-factor authentication
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close 2FA modal"
                onPress={() => setTwoFaModalVisible(false)}
                hitSlop={12}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: w(8) })}
              >
                <FontAwesome name="times" size={w(22)} color={colors.tabIconDefault} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Card style={{ padding: w(14) }} padded>
                {twoFaLoading && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: h(10) }}>
                    <ActivityIndicator color={colors.tint} />
                    <Text style={{ marginLeft: w(10), color: colors.tabIconDefault }}>
                      Updating 2FA…
                    </Text>
                  </View>
                )}

                {!!twoFaError && (
                  <Text style={{ color: '#dc3545', marginBottom: h(10) }}>
                    {twoFaError}
                  </Text>
                )}

                {twoFaEnabled === false && twoFaSetup && (
                  <View>
                    <Text style={{ color: colors.text, fontWeight: '700', marginBottom: h(8) }}>
                      Set up authenticator
                    </Text>
                    {!!twoFaSetup.qrCodeDataUrl && (
                      <View style={{ alignItems: 'center', marginBottom: h(10) }}>
                        <Image
                          source={{ uri: twoFaSetup.qrCodeDataUrl }}
                          style={{
                            width: w(180),
                            height: w(180),
                            borderRadius: w(12),
                            backgroundColor: '#fff',
                          }}
                          resizeMode="contain"
                        />
                      </View>
                    )}
                    {!!twoFaSetup.secret && (
                      <Text style={{ color: colors.tabIconDefault, marginBottom: h(10) }}>
                        Secret: <Text style={{ color: colors.text }}>{twoFaSetup.secret}</Text>
                      </Text>
                    )}
                    <Input
                      label="Enter 6-digit code"
                      placeholder="000000"
                      value={twoFaCode}
                      onChangeText={setTwoFaCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      leftIcon="shield"
                    />
                    <Button
                      title="Enable 2FA"
                      onPress={onPressEnable2fa}
                      fullWidth
                      disabled={twoFaLoading}
                    />
                  </View>
                )}

                {twoFaEnabled === false && !twoFaSetup && (
                  <Text style={{ color: colors.tabIconDefault }}>
                    Loading setup… if it doesn’t appear, close and open again.
                  </Text>
                )}

                {twoFaEnabled === true && (
                  <View>
                    <Text style={{ color: colors.text, fontWeight: '700', marginBottom: h(8) }}>
                      2FA is enabled
                    </Text>
                    <Text style={{ color: colors.tabIconDefault, marginBottom: h(10) }}>
                      To disable 2FA, enter a current code from your authenticator app.
                    </Text>
                    <Input
                      label="Current 6-digit code"
                      placeholder="000000"
                      value={twoFaCode}
                      onChangeText={setTwoFaCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      leftIcon="shield"
                    />
                    <Button
                      title="Disable 2FA"
                      onPress={onPressDisable2fa}
                      fullWidth
                      variant="destructive"
                      disabled={twoFaLoading}
                    />
                  </View>
                )}
              </Card>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
