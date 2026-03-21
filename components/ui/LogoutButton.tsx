import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Button } from './Button';

export function LogoutButton() {
  const { isAuthenticated, logout } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthenticated) return null;

  const closeModal = () => {
    if (!submitting) setVisible(false);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await logout();
      setVisible(false);
      router.replace(ROUTES.LOGIN);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out"
        onPress={() => setVisible(true)}
        style={({ pressed }) => ({
          padding: w(8),
          marginRight: w(8),
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <FontAwesome name="sign-out" size={w(22)} color={colors.text} />
      </Pressable>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: w(20),
          }}
          onPress={closeModal}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.cardBg,
              borderRadius: w(16),
              padding: w(20),
              width: '100%',
              maxWidth: w(340),
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: w(18),
                fontWeight: '700',
                color: colors.text,
                marginBottom: h(8),
              }}
            >
              Log out?
            </Text>
            <Text
              style={{
                fontSize: w(14),
                color: colors.tabIconDefault,
                marginBottom: h(20),
                lineHeight: w(20),
              }}
            >
              You will be signed out on this device. Continue?
            </Text>
            <View style={{ flexDirection: 'row', gap: w(12) }}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={closeModal}
                disabled={submitting}
                style={{ flex: 1 }}
              />
              <Button
                title={submitting ? 'Signing out…' : 'Log out'}
                variant="destructive"
                onPress={handleConfirm}
                disabled={submitting}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
