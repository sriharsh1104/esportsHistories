import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAppSelector } from '@/store/hooks';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  View,
} from 'react-native';

export function GlobalLoader() {
  const visible = useAppSelector((s) => s.loader.visible);
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.cardBg }]}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    borderRadius: 16,
  },
});
