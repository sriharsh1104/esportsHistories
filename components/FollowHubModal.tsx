import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FollowHubModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function FollowHubModal({ visible, onClose }: FollowHubModalProps) {
  const { isAuthenticated } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();

  const row = useMemo(
    () => ({
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: h(16),
      paddingHorizontal: w(16),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    }),
    [w, h, colors.border]
  );

  const go = (path: string) => {
    onClose();
    router.push(path as any);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            backgroundColor: colors.cardBg,
            borderTopLeftRadius: w(20),
            borderTopRightRadius: w(20),
            paddingBottom: Math.max(insets.bottom, h(16)),
            maxHeight: '85%',
          }}
        >
          <View
            style={{
              width: w(40),
              height: h(4),
              borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: 'center',
              marginTop: h(10),
              marginBottom: h(8),
            }}
          />
          <Text
            style={{
              fontSize: w(18),
              fontWeight: '700',
              color: colors.text,
              textAlign: 'center',
              marginBottom: h(8),
              paddingHorizontal: w(20),
            }}
          >
            Follow more
          </Text>
          <Text
            style={{
              fontSize: w(13),
              color: colors.tabIconDefault,
              textAlign: 'center',
              marginBottom: h(12),
              paddingHorizontal: w(24),
            }}
          >
            Games, players, or orgs — news filters to what you follow (like All Football).
          </Text>

          {!isAuthenticated ? (
            <View style={{ paddingHorizontal: w(20), paddingBottom: h(8) }}>
              <Pressable
                onPress={() => go(ROUTES.LOGIN)}
                style={{
                  backgroundColor: colors.tint,
                  paddingVertical: h(14),
                  borderRadius: w(12),
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: w(16) }}>Sign in</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Pressable onPress={() => go(ROUTES.FOLLOW_EXPLORE_GAMES)} style={row}>
                <FontAwesome name="gamepad" size={w(22)} color={colors.tint} style={{ marginRight: w(14) }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: w(16), fontWeight: '600', color: colors.text }}>Follow a game</Text>
                  <Text style={{ fontSize: w(12), color: colors.tabIconDefault, marginTop: h(2) }}>
                    API list (game-options) — Free Fire, BGMI…
                  </Text>
                </View>
                <FontAwesome name="chevron-right" size={w(14)} color={colors.tabIconDefault} />
              </Pressable>

              <Pressable onPress={() => go(ROUTES.FOLLOW_EXPLORE_PERSON)} style={row}>
                <FontAwesome name="user" size={w(22)} color={colors.tint} style={{ marginRight: w(14) }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: w(16), fontWeight: '600', color: colors.text }}>
                    Follow a player / personality
                  </Text>
                  <Text style={{ fontSize: w(12), color: colors.tabIconDefault, marginTop: h(2) }}>
                    API se famous personalities
                  </Text>
                </View>
                <FontAwesome name="chevron-right" size={w(14)} color={colors.tabIconDefault} />
              </Pressable>

              <Pressable onPress={() => go(ROUTES.FOLLOW_EXPLORE_ORG)} style={row}>
                <FontAwesome name="building" size={w(22)} color={colors.tint} style={{ marginRight: w(14) }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: w(16), fontWeight: '600', color: colors.text }}>
                    Follow a team / org
                  </Text>
                  <Text style={{ fontSize: w(12), color: colors.tabIconDefault, marginTop: h(2) }}>
                    API se teams / orgs
                  </Text>
                </View>
                <FontAwesome name="chevron-right" size={w(14)} color={colors.tabIconDefault} />
              </Pressable>

              <Pressable
                onPress={() => go(ROUTES.FOLLOW)}
                style={[row, { borderBottomWidth: 0 }]}
              >
                <FontAwesome name="newspaper-o" size={w(22)} color={colors.accent} style={{ marginRight: w(14) }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: w(16), fontWeight: '600', color: colors.text }}>Open follow feed</Text>
                  <Text style={{ fontSize: w(12), color: colors.tabIconDefault, marginTop: h(2) }}>
                    Full follow hub & news
                  </Text>
                </View>
                <FontAwesome name="chevron-right" size={w(14)} color={colors.tabIconDefault} />
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
