import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAppSelector } from '@/store/hooks';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export function GlobalLoader() {
  const visible = useAppSelector((s) => s.loader.visible);
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const pulse = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (!visible) {
      pulse.setValue(0.9);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [visible, pulse]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.38)' }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulse,
            {
              backgroundColor: colors.tint + '22',
              transform: [{ scale: pulse }],
            },
          ]}
        />
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.title, { color: colors.text }]}>Loading</Text>
          <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
            Please wait a moment...
          </Text>
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
    minWidth: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: -82,
  },
  title: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
