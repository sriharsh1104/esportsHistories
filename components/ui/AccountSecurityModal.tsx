import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from './Card';
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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
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

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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
                  value="Coming soon"
                  showArrow={false}
                />
                <SettingsRow
                  icon="mobile"
                  label="Authenticator app"
                  value="Coming soon"
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
  );
}
