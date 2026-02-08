import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import type { ThemePreference } from '@/context/ThemeContext';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useState } from 'react';
import { Modal, Pressable, Text } from 'react-native';

const OPTIONS: { id: ThemePreference; label: string; icon: string }[] = [
  { id: 'light', label: 'Light', icon: 'sun-o' },
  { id: 'dark', label: 'Dark', icon: 'moon-o' },
  { id: 'system', label: 'System', icon: 'mobile' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const scheme = useColorScheme();
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const [visible, setVisible] = useState(false);

  const current = OPTIONS.find((o) => o.id === theme) ?? OPTIONS[2];

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={({ pressed }) => ({
          padding: w(8),
          marginRight: w(4),
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <FontAwesome name={current.icon as any} size={w(20)} color={colors.text} />
      </Pressable>
      <Modal visible={visible} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setVisible(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.cardBg,
              borderRadius: w(16),
              padding: w(20),
              minWidth: w(200),
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: w(16), fontWeight: '700', color: colors.text, marginBottom: h(16) }}>
              Theme
            </Text>
            {OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => {
                  setTheme(opt.id);
                  setVisible(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: h(12),
                  paddingHorizontal: w(12),
                  borderRadius: w(10),
                  backgroundColor: theme === opt.id ? colors.tint + '25' : 'transparent',
                  marginBottom: h(4),
                }}
              >
                <FontAwesome
                  name={opt.icon as any}
                  size={w(18)}
                  color={theme === opt.id ? colors.tint : colors.tabIconDefault}
                  style={{ marginRight: w(12) }}
                />
                <Text
                  style={{
                    fontSize: w(14),
                    fontWeight: theme === opt.id ? '600' : '500',
                    color: theme === opt.id ? colors.tint : colors.text,
                  }}
                >
                  {opt.label}
                </Text>
                {theme === opt.id && (
                  <FontAwesome name="check" size={w(14)} color={colors.tint} style={{ marginLeft: 'auto' }} />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
