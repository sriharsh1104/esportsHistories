import { Button } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export type AdminUserBlockActionBarProps = {
  selectedCount: number;
  onBlock: () => void;
  onUnblock: () => void;
  pendingAction?: 'block' | 'unblock' | null;
};

/**
 * Side-by-side Block / Unblock actions for admin user bulk operations.
 * Intended with multi-select on the user list; buttons stay disabled until at least one row is selected.
 */
export function AdminUserBlockActionBar({
  selectedCount,
  onBlock,
  onUnblock,
  pendingAction,
}: AdminUserBlockActionBarProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { w, h } = useResponsive();
  const busy = pendingAction != null;
  const disabled = selectedCount === 0 || busy;

  return (
    <View style={{ marginBottom: h(12) }}>
      <Text
        style={{
          color: colors.tabIconDefault,
          fontSize: w(12),
          marginBottom: h(8),
        }}
      >
        Select users below, then block or unblock login. Admin accounts cannot be blocked (lock icon).
      </Text>
      <View style={[styles.row, { gap: w(10) }]}>
        <View style={styles.btnWrap}>
          <Button title="Block" variant="destructive" disabled={disabled} onPress={onBlock} style={styles.btn} />
        </View>
        <View style={styles.btnWrap}>
          <Button title="Unblock" variant="outline" disabled={disabled} onPress={onUnblock} style={styles.btn} />
        </View>
      </View>
      {busy ? (
        <View style={[styles.busyRow, { marginTop: h(10), gap: w(8) }]}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={{ color: colors.tabIconDefault, fontSize: w(12) }}>
            {pendingAction === 'block' ? 'Blocking…' : 'Unblocking…'}
          </Text>
        </View>
      ) : selectedCount > 0 ? (
        <Text
          style={{
            color: colors.tabIconDefault,
            fontSize: w(12),
            marginTop: h(8),
          }}
        >
          {selectedCount} selected
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  btnWrap: {
    flex: 1,
    minWidth: 0,
  },
  btn: {
    paddingHorizontal: 8,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
