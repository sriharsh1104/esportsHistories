import { Button, Card } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useWallet } from '@/context/WalletContext';
import { useResponsive } from '@/context/ResponsiveContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';

export function WalletSection() {
  const { balance, topUp, withdraw, isLoading } = useWallet();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const [modalType, setModalType] = useState<'topup' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = useMemo(
    () => ({
      card: { padding: w(20) },
      row: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        marginBottom: h(16),
      },
      icon: { marginRight: w(12) },
      balanceLabel: { fontSize: w(14), color: colors.tabIconDefault },
      balanceValue: { fontSize: w(28), fontWeight: '700' as const },
      actions: {
        flexDirection: 'row' as const,
        gap: w(12),
      },
      btn: { flex: 1 },
      input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: w(12),
        padding: w(16),
        fontSize: w(16),
        color: colors.text,
        marginBottom: h(16),
      },
    }),
    [w, h, colors]
  );

  const handleSubmit = async () => {
    setError('');
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('Enter valid amount');
      return;
    }
    setLoading(true);
    try {
      if (modalType === 'topup') {
        await topUp(val);
      } else {
        await withdraw(val);
      }
      setAmount('');
      setModalType(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setAmount('');
    setError('');
  };

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.row}>
          <FontAwesome
            name="wallet"
            size={w(24)}
            color={colors.tint}
            style={styles.icon}
          />
          <View>
            <Text style={[styles.balanceLabel, { color: colors.tabIconDefault }]}>
              Wallet Balance
            </Text>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Text style={[styles.balanceValue, { color: colors.text }]}>
                ₹{balance.toFixed(2)}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.actions}>
          <Button
            title="Top Up"
            onPress={() => setModalType('topup')}
            style={styles.btn}
          />
          <Button
            title="Withdraw"
            variant="outline"
            onPress={() => setModalType('withdraw')}
            style={styles.btn}
          />
        </View>
      </Card>

      <Modal visible={!!modalType} transparent animationType="slide">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
          onPress={closeModal}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.cardBg,
              borderTopLeftRadius: w(20),
              borderTopRightRadius: w(20),
              padding: w(24),
            }}
          >
            <Text
              style={{
                fontSize: w(20),
                fontWeight: '700',
                color: colors.text,
                marginBottom: h(16),
              }}
            >
              {modalType === 'topup' ? 'Top Up Wallet' : 'Withdraw'}
            </Text>
            <TextInput
              placeholder="Enter amount (₹)"
              placeholderTextColor={colors.tabIconDefault}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: error ? '#dc3545' : colors.border,
                },
              ]}
            />
            {error && (
              <Text style={{ color: '#dc3545', fontSize: w(12), marginBottom: h(8) }}>
                {error}
              </Text>
            )}
            <View style={styles.actions}>
              <Button title="Cancel" variant="ghost" onPress={closeModal} style={styles.btn} />
              <Button
                title={modalType === 'topup' ? 'Add' : 'Withdraw'}
                onPress={handleSubmit}
                loading={loading}
                style={styles.btn}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
