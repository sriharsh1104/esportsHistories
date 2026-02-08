import { useResponsive } from '@/context/ResponsiveContext';
import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  keyboardAvoid?: boolean;
  padded?: boolean;
  maxContent?: boolean;
  maxForm?: boolean;
  style?: ViewStyle;
};

export function Screen({
  children,
  scroll = true,
  keyboardAvoid = false,
  padded = true,
  maxContent = false,
  maxForm = false,
  style,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { w, formMaxWidth, contentMaxWidth } = useResponsive();

  const maxWidth = maxForm ? formMaxWidth : maxContent ? contentMaxWidth : undefined;
  const horizontalPadding = padded ? w(24) : 0;

  const content = (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: horizontalPadding,
        },
        style,
      ]}
    >
      {maxWidth ? (
        <View style={[styles.maxWrapper, { maxWidth }]}>{children}</View>
      ) : (
        children
      )}
    </View>
  );

  const wrapped = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  ) : (
    content
  );

  if (keyboardAvoid) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {wrapped}
      </KeyboardAvoidingView>
    );
  }

  return wrapped;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  maxWrapper: {
    width: '100%',
    alignSelf: 'center',
  },
});
