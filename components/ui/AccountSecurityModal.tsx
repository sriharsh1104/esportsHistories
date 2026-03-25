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
import {
  disableTwoFactor,
  enableTwoFactor,
  getTwoFactorStatus,
  setupTwoFactor,
  type TwoFactorSetup,
} from '@/services/auth.service';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { SettingsRow } from './SettingsRow';

export type DeviceHistoryItem = {
  id: string;
  deviceLabel: string;
  location?: string;
  lastSeen?: string;
  isCurrent?: boolean;
};

type AccountSecurityModalProps = {
  visible: boolean;
  onClose: () => void;
  deviceHistory: DeviceHistoryItem[];
};

/**
 * Logout actions call `auth.service.logout()` → POST `/auth/logout` or POST `/auth/logout-all`
 * (paths from `API_ENDPOINTS.AUTH`, resolved against `apiBaseUrl`).
 */
export function AccountSecurityModal({
  visible,
  onClose,
  deviceHistory,
}: AccountSecurityModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutInFlight = useRef(false);

  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState<boolean | null>(null);
  const [twoFaSetup, setTwoFaSetup] = useState<TwoFactorSetup | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaError, setTwoFaError] = useState<string | null>(null);
  const [twoFaModalVisible, setTwoFaModalVisible] = useState(false);

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

  const sectionTitle = {
    fontSize: w(14),
    fontWeight: '600' as const,
    marginBottom: h(8),
    color: colors.tabIconDefault,
  };
  const cardStyle = { padding: 0, overflow: 'hidden' as const };

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
              </Card>
            </View>

            <View style={{ marginBottom: h(8) }}>
              <Text style={sectionTitle}>DEVICE HISTORY</Text>
              <Card style={cardStyle} padded={false}>
                {deviceHistory.length === 0 ? (
                  <View style={{ paddingHorizontal: w(16), paddingVertical: h(14) }}>
                    <Text style={{ color: colors.tabIconDefault, fontSize: w(13) }}>
                      No device history available.
                    </Text>
                  </View>
                ) : (
                  deviceHistory.map((item, index) => (
                    <View
                      key={item.id}
                      style={{
                        paddingHorizontal: w(16),
                        paddingVertical: h(14),
                        borderBottomWidth: index === deviceHistory.length - 1 ? 0 : 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: w(15), fontWeight: '600' }}>
                        {item.deviceLabel}
                        {item.isCurrent ? ' (Current)' : ''}
                      </Text>
                      {!!item.location && (
                        <Text
                          style={{
                            color: colors.tabIconDefault,
                            fontSize: w(12),
                            marginTop: h(2),
                          }}
                        >
                          {item.location}
                        </Text>
                      )}
                      {!!item.lastSeen && (
                        <Text
                          style={{
                            color: colors.tabIconDefault,
                            fontSize: w(12),
                            marginTop: h(2),
                          }}
                        >
                          Last seen: {item.lastSeen}
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </Card>
            </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
