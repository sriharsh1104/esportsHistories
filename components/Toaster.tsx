import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Toast, { BaseToastProps } from 'react-native-toast-message';

type AppToastProps = BaseToastProps & { type: 'success' | 'error' | 'info' };

function AppToast({ type, text1 }: AppToastProps) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const isSuccess = type === 'success';
  const isInfo = type === 'info';
  const icon = isSuccess ? 'check-circle' : isInfo ? 'info-circle' : 'times-circle';
  const accent = isSuccess ? '#22C55E' : isInfo ? '#3B82F6' : '#EF4444';

  if (!text1) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <FontAwesome name={icon} size={18} color={accent} />
        <Text style={[styles.text, { color: colors.text }]} numberOfLines={3}>
          {text1}
        </Text>
      </View>
    </View>
  );
}

export function Toaster() {
  const config = useMemo(
    () => ({
      success: (props: BaseToastProps) => <AppToast {...(props as any)} type="success" />,
      error: (props: BaseToastProps) => <AppToast {...(props as any)} type="error" />,
      info: (props: BaseToastProps) => <AppToast {...(props as any)} type="info" />,
    }),
    []
  );

  return (
    <Toast
      config={config}
      position="top"
      topOffset={56}
      visibilityTime={3000}
      autoHide
    />
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '92%',
    alignSelf: 'flex-end',
    marginRight: 16,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  content: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
});

