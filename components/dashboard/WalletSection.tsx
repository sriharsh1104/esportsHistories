import { Button, Card } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import { useWallet } from '@/context/WalletContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

type TopUpMethod = 'upi' | 'card' | 'qr';

const TOP_UP_OPTIONS: { id: TopUpMethod; icon: string; label: string; desc: string }[] = [
  { id: 'upi', icon: 'credit-card', label: 'UPI', desc: 'GPay, PhonePe, Paytm' },
  { id: 'card', icon: 'credit-card-alt', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
  { id: 'qr', icon: 'qrcode', label: 'QR Code', desc: 'Scan to pay' },
];

export function WalletSection() {
  const { balance, topUp, withdraw, isLoading } = useWallet();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const [modalType, setModalType] = useState<'topup' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [topUpMethod, setTopUpMethod] = useState<TopUpMethod>('upi');
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
      payOpt: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        padding: w(14),
        borderRadius: w(12),
        borderWidth: 2,
        marginBottom: h(10),
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
    setTopUpMethod('upi');
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
            {modalType === 'topup' && (
              <>
                <Text style={{ fontSize: w(14), fontWeight: '600', color: colors.text, marginBottom: h(10) }}>
                  Payment method
                </Text>
                {TOP_UP_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.id}
                    onPress={() => setTopUpMethod(opt.id)}
                    style={[
                      styles.payOpt,
                      {
                        backgroundColor: colors.cardBg,
                        borderColor: topUpMethod === opt.id ? colors.tint : colors.border,
                      },
                    ]}
                  >
                    <FontAwesome
                      name={opt.icon as any}
                      size={w(22)}
                      color={colors.tint}
                      style={{ marginRight: w(12) }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: w(15), fontWeight: '600', color: colors.text }}>
                        {opt.label}
                      </Text>
                      <Text style={{ fontSize: w(12), color: colors.tabIconDefault }}>{opt.desc}</Text>
                    </View>
                    {topUpMethod === opt.id && (
                      <FontAwesome name="check-circle" size={w(20)} color={colors.tint} />
                    )}
                  </Pressable>
                ))}
                <View style={{ height: h(8) }} />
              </>
            )}
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
