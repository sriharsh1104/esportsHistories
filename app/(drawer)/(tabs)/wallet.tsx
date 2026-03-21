import { WalletSection } from '@/components/dashboard';
import { Button, Card, Input, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    Text,
    View
} from 'react-native';


function validateUpiId(v: string): boolean {
  return /^[\w.-]+@[\w.-]+$/.test(v.trim());
}

import { useWallet } from '@/context/WalletContext';

export default function WalletScreen() {
  const { user, isAuthenticated, updateUpiIds } = useAuth();
  const { transactions, fetchTransactions, refreshWallet, isLoading: isWalletLoading } = useWallet();
  const dispatch = useAppDispatch();
  const [showAddUpi, setShowAddUpi] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'topup' | 'withdrawal'>('all');
  const [datePreset, setDatePreset] = useState<'all' | '7' | '30'>('all');
  const [newUpiId, setNewUpiId] = useState('');
  const [upiError, setUpiError] = useState('');
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const upiIds = user?.upiIds ?? [];

  const styles = useMemo(
    () => ({
      sectionTitle: { fontSize: w(16), fontWeight: '600' as const, marginBottom: h(12), color: colors.text },
      sectionDesc: { fontSize: w(13), color: colors.tabIconDefault, marginBottom: h(12) },
      upiRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: h(12),
        paddingHorizontal: w(16),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.15)',
      },
      addUpiBtn: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: h(12),
        paddingHorizontal: w(16),
        borderTopWidth: 1,
        borderTopColor: 'rgba(128,128,128,0.15)',
      },
    }),
    [w, h, colors]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshWallet();
    void fetchTransactions();
  }, [isAuthenticated, refreshWallet, fetchTransactions]);

  const handleAddUpi = async () => {
    setUpiError('');
    const trimmed = newUpiId.trim();
    if (!trimmed) {
      setUpiError('Enter UPI ID');
      return;
    }
    if (!validateUpiId(trimmed)) {
      setUpiError('Enter valid UPI ID (e.g. user@upi)');
      return;
    }
    if (upiIds.includes(trimmed)) {
      setUpiError('This UPI ID is already saved');
      return;
    }
    dispatch(showLoader());
    try {
      await updateUpiIds([...upiIds, trimmed]);
      setNewUpiId('');
      setShowAddUpi(false);
    } catch (e) {
      setUpiError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleRemoveUpi = (id: string) => {
    Alert.alert('Remove UPI ID', `Remove ${id}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          dispatch(showLoader());
          try {
            await updateUpiIds(upiIds.filter((u) => u !== id));
          } catch (e) {
            Alert.alert('Error', 'Failed to remove UPI ID');
          } finally {
            dispatch(hideLoader());
          }
        },
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <Screen padded maxForm>
        <View style={{ flex: 1, justifyContent: 'center', paddingTop: h(48) }}>
          <Text style={{ fontSize: w(24), fontWeight: '700', color: colors.text, marginBottom: h(8) }}>
            Wallet
          </Text>
          <Text style={{ fontSize: w(16), color: colors.tabIconDefault, marginBottom: h(24) }}>
            Sign in to access your wallet
          </Text>
          <Button
            title="Sign in"
            onPress={() => router.push(ROUTES.LOGIN)}
            fullWidth
            style={{ maxWidth: w(200) }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded maxForm scroll>
      <View style={{ paddingTop: h(16), paddingBottom: h(24) }}>
        <Text style={{ fontSize: w(24), fontWeight: '700', color: colors.text, marginBottom: h(4) }}>
          Wallet
        </Text>
        <Text style={{ fontSize: w(16), color: colors.tabIconDefault }}>
          Top up or withdraw funds
        </Text>
      </View>

      <WalletSection />

      <Card style={{ marginTop: h(24), padding: 0 }} padded={false}>
        <View style={{ paddingHorizontal: w(16), paddingTop: h(16) }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Saved UPI IDs</Text>
          <Text style={styles.sectionDesc}>
            Add UPI IDs here for quick payments. First-time payment UPI IDs are saved automatically.
          </Text>
        </View>
        {upiIds.length === 0 ? (
          <View style={[styles.upiRow, { borderBottomWidth: 0 }]}>
            <Text style={{ fontSize: w(14), color: colors.tabIconDefault, flex: 1 }}>
              No UPI IDs saved yet
            </Text>
          </View>
        ) : (
          upiIds.map((id) => (
            <View key={id} style={styles.upiRow}>
              <FontAwesome name="credit-card" size={w(16)} color={colors.tint} style={{ marginRight: w(12) }} />
              <Text style={{ fontSize: w(14), fontWeight: '500', color: colors.text, flex: 1 }}>{id}</Text>
              <Pressable onPress={() => handleRemoveUpi(id)} style={{ padding: w(8) }}>
                <FontAwesome name="trash" size={w(16)} color="#dc3545" />
              </Pressable>
            </View>
          ))
        )}
        <Pressable
          onPress={() => {
            setShowAddUpi(true);
            setUpiError('');
            setNewUpiId('');
          }}
          style={[styles.addUpiBtn, { flexDirection: 'row', alignItems: 'center' }]}
        >
          <FontAwesome name="plus-circle" size={w(18)} color={colors.tint} style={{ marginRight: w(10) }} />
          <Text style={{ fontSize: w(14), fontWeight: '600', color: colors.tint }}>Add UPI ID</Text>
        </Pressable>
      </Card>

      <Card style={{ marginTop: h(24), padding: 0 }} padded={false}>
        <View style={{ paddingHorizontal: w(16), paddingTop: h(16), paddingBottom: h(12) }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction History</Text>
          <View style={{ flexDirection: 'row', gap: w(8), marginBottom: h(8) }}>
            {(['all', 'topup', 'withdrawal'] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => {
                  setFilterType(type);
                  fetchTransactions(type === 'all' ? {} : { type });
                }}
                style={{
                  paddingVertical: h(6),
                  paddingHorizontal: w(12),
                  borderRadius: w(16),
                  backgroundColor: filterType === type ? colors.tint : colors.border + '40',
                }}
              >
                <Text style={{ 
                  fontSize: w(12), 
                  fontWeight: '600', 
                  color: filterType === type ? '#fff' : colors.text,
                  textTransform: 'capitalize'
                }}>
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: w(8) }}>
            {(['all', '7', '30'] as const).map((preset) => (
              <Pressable
                key={preset}
                onPress={() => {
                  setDatePreset(preset);
                  const filters: any = filterType === 'all' ? {} : { type: filterType };
                  if (preset !== 'all') {
                    const d = new Date();
                    d.setDate(d.getDate() - parseInt(preset));
                    filters.startDate = d.toISOString();
                  }
                  fetchTransactions(filters);
                }}
                style={{
                  paddingVertical: h(4),
                  paddingHorizontal: w(10),
                  borderRadius: w(12),
                  borderWidth: 1,
                  borderColor: datePreset === preset ? colors.tint : colors.border,
                  backgroundColor: datePreset === preset ? colors.tint + '10' : 'transparent',
                }}
              >
                <Text style={{ 
                  fontSize: w(11), 
                  fontWeight: '500', 
                  color: datePreset === preset ? colors.tint : colors.tabIconDefault 
                }}>
                  {preset === 'all' ? 'All Time' : `Last ${preset} Days`}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        
        {transactions.length === 0 ? (
          <View style={{ padding: w(24), alignItems: 'center' }}>
            <FontAwesome name="history" size={w(32)} color={colors.tabIconDefault} style={{ marginBottom: h(12), opacity: 0.3 }} />
            <Text style={{ fontSize: w(14), color: colors.tabIconDefault }}>No transactions yet</Text>
          </View>
        ) : (
          <View style={{ paddingBottom: h(8) }}>
            {transactions.slice(0, 10).map((t) => (
              <View 
                key={t._id} 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  paddingVertical: h(12), 
                  paddingHorizontal: w(16),
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(128,128,128,0.1)'
                }}
              >
                <View style={{ 
                  width: w(40), 
                  height: w(40), 
                  borderRadius: w(20), 
                  backgroundColor: t.type === 'topup' ? '#28a74520' : '#dc354520',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: w(12)
                }}>
                  <FontAwesome 
                    name={t.type === 'topup' ? 'arrow-down' : 'arrow-up'} 
                    size={w(14)} 
                    color={t.type === 'topup' ? '#28a745' : '#dc3545'} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: w(14), fontWeight: '600', color: colors.text }}>
                    {t.type === 'topup' ? 'Top Up' : 'Withdrawal'}
                  </Text>
                  <Text style={{ fontSize: w(12), color: colors.tabIconDefault }}>
                    {new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ 
                    fontSize: w(15), 
                    fontWeight: '700', 
                    color: t.type === 'topup' ? '#28a745' : '#dc3545' 
                  }}>
                    {t.type === 'topup' ? '+' : '-'}₹{t.amount.toFixed(2)}
                  </Text>
                  <Text style={{ 
                    fontSize: w(10), 
                    fontWeight: '600', 
                    color: t.status === 'success' ? '#28a745' : t.status === 'pending' ? '#ffc107' : '#dc3545',
                    textTransform: 'uppercase'
                  }}>
                    {t.status}
                  </Text>
                </View>
              </View>
            ))}
            {transactions.length > 10 && (
              <Button 
                title="View All History" 
                variant="ghost" 
                onPress={() => {}} // Could navigate to a dedicated history page
                style={{ marginTop: h(8) }}
              />
            )}
          </View>
        )}
      </Card>
      <View style={{ height: h(40) }} />

      <Modal visible={showAddUpi} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setShowAddUpi(false)}
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
            <Text style={{ fontSize: w(18), fontWeight: '700', color: colors.text, marginBottom: h(16) }}>
              Add UPI ID
            </Text>
            <Input
              label="UPI ID"
              placeholder="user@upi / 9876543210@paytm"
              value={newUpiId}
              onChangeText={setNewUpiId}
              autoCapitalize="none"
              error={upiError}
              leftIcon="credit-card"
            />
            <View style={{ flexDirection: 'row', gap: w(12), marginTop: h(8) }}>
              <Button title="Cancel" variant="ghost" onPress={() => setShowAddUpi(false)} style={{ flex: 1 }} />
              <Button title="Add" onPress={handleAddUpi} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
