import { Button, Card, Input } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useWallet } from '@/context/WalletContext';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import type { CashfreeOrderResult } from '@/types/payment';
import { cashfreeModeFromEnvironment, loadCashfreeFactory } from '@/utils/cashfreeWeb';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import * as walletService from '@/services/wallet.service';
import { WebView } from 'react-native-webview';

function validateUpiId(v: string): boolean {
  return /^[\w.-]+@[\w.-]+$/.test(v.trim());
}

export function WalletSection() {
  const { user, updateUpiIds } = useAuth();
  const { balance, withdraw, isLoading, refreshWallet, fetchTransactions } = useWallet();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const savedUpiList = React.useMemo(() => {
    const p = user?.paymentUPI?.trim();
    if (p) return [p];
    const ids = user?.upiIds?.filter(Boolean) ?? [];
    return ids.length ? ids : [];
  }, [user?.paymentUPI, user?.upiIds]);

  const [modalType, setModalType] = useState<'topup' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [selectedUpiId, setSelectedUpiId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showAddUpiModal, setShowAddUpiModal] = useState(false);
  const [newUpiId, setNewUpiId] = useState('');
  const [upiFormError, setUpiFormError] = useState('');
  const [editingUpiId, setEditingUpiId] = useState<string | null>(null);
  const [deleteUpiConfirmId, setDeleteUpiConfirmId] = useState<string | null>(null);
  /*
  const [qrPaySession, setQrPaySession] = useState<{
    amount: number;
    result: CreatePaymentQrResult;
  } | null>(null);
  */
  const [cashfreeSession, setCashfreeSession] = useState<{
    amountINR: number;
    order: CashfreeOrderResult;
  } | null>(null);
  // const [qrGenLoading, setQrGenLoading] = useState(false);
  const [cashfreeError, setCashfreeError] = useState<string>('');

  const dispatch = useAppDispatch();

  useEffect(() => {
    if (savedUpiList.length === 1 && !selectedUpiId) {
      setSelectedUpiId(savedUpiList[0]);
    }
  }, [savedUpiList, selectedUpiId]);

  /* Manual QR: poll GET /payment/qr-status/:id
  useEffect(() => {
    const id = qrPaySession?.result.qrCodeId;
    if (!id || modalType !== 'topup') return;
    const tick = async () => { ... };
    void tick();
    const interval = setInterval(() => void tick(), 4000);
    return () => clearInterval(interval);
  }, [qrPaySession?.result.qrCodeId, modalType, refreshWallet, fetchTransactions]);
  */

  useEffect(() => {
    if (!cashfreeSession || modalType !== 'topup') return;
    setCashfreeError('');
  }, [cashfreeSession, modalType]);

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

  /* Manual QR: POST /payment/close-qr/:id
  const dismissQrOnServer = (result: CreatePaymentQrResult | null) => {
    const qid = result?.qrCodeId;
    if (!qid) return;
    void walletService.closePaymentQr(qid).catch(() => {});
  };
  */

  const closeModal = () => {
    // if (qrPaySession?.result) dismissQrOnServer(qrPaySession.result);
    // setQrPaySession(null);
    setCashfreeSession(null);
    setModalType(null);
    setAmount('');
    setSelectedUpiId(null);
    setError('');
    // setQrGenLoading(false);
    setCashfreeError('');
  };

  function cashfreeCheckoutErrorMessage(result: unknown): string | null {
    if (!result || typeof result !== 'object') return null;
    const err = (result as { error?: { message?: string; toString?: () => string } }).error;
    if (!err) return null;
    if (typeof err === 'string') return err;
    if (typeof err.message === 'string' && err.message.trim()) return err.message;
    return 'Payment could not be completed';
  }

  const finalizeCashfreeTopUp = async (orderId: string) => {
    const verified = await walletService.verifyCashfreePaymentWithPoll(orderId);
    if (verified.status === 'success') {
      return;
    }
    if (verified.status === 'failed') {
      throw new Error(verified.message?.trim() || 'Payment failed');
    }
    throw new Error(
      verified.message?.trim() || 'Payment not completed yet. Check your wallet or try again.'
    );
  };

  const startWebCashfreePayment = async (order: CashfreeOrderResult, amountINR: number) => {
    if (Platform.OS !== 'web') return;
    const Cashfree = await loadCashfreeFactory();
    const mode = cashfreeModeFromEnvironment(order.environment);
    const cf = Cashfree({ mode });
    const result = await cf.checkout({
      paymentSessionId: order.paymentSessionId,
      redirectTarget: '_modal',
      mode,
    });

    const errMsg = cashfreeCheckoutErrorMessage(result);
    if (errMsg) {
      const lower = errMsg.toLowerCase();
      if (lower.includes('aborted') || lower.includes('cancel')) {
        throw new Error('Payment cancelled.');
      }
      throw new Error(errMsg);
    }

    await finalizeCashfreeTopUp(order.orderId);
  };

  const buildCashfreeCheckoutHtml = (session: { amountINR: number; order: CashfreeOrderResult }) => {
    const mode = cashfreeModeFromEnvironment(session.order.environment);
    const sessionIdJson = JSON.stringify(session.order.paymentSessionId);
    const orderIdJson = JSON.stringify(session.order.orderId);
    const modeJson = JSON.stringify(mode);
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cashfree Checkout</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; background: #0b1220; color: #e6eefc; }
      .wrap { padding: 18px; }
      .card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10); border-radius: 14px; padding: 16px; }
      .title { font-size: 16px; font-weight: 700; margin: 0 0 8px; }
      .sub { font-size: 12px; opacity: 0.8; margin: 0 0 14px; }
      .muted { font-size: 11px; opacity: 0.7; margin-top: 12px; word-break: break-all; }
    </style>
    <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <p class="title">Complete payment</p>
        <p class="sub">Opening Cashfree secure checkout…</p>
        <div class="muted">Order: ${String(session.order.orderId).replace(/</g, '&lt;')}</div>
        <div class="muted">Amount: ₹${session.amountINR.toFixed(2)}</div>
      </div>
    </div>
    <script>
      function post(payload) {
        try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
      }
      function runCheckout() {
        if (!window.Cashfree) {
          post({ type: 'error', message: 'Cashfree SDK failed to load' });
          return;
        }
        var mode = ${modeJson};
        var paymentSessionId = ${sessionIdJson};
        var merchantOrderId = ${orderIdJson};
        try {
          var cf = Cashfree({ mode: mode });
          cf.checkout({ paymentSessionId: paymentSessionId, redirectTarget: '_modal', mode: mode })
            .then(function (result) {
              if (result && result.error) {
                var m = result.error && result.error.message ? result.error.message : 'Payment failed';
                post({ type: 'failed', message: String(m) });
                return;
              }
              post({ type: 'checkout_done', orderId: merchantOrderId });
            })
            .catch(function (e) {
              post({ type: 'error', message: (e && e.message) ? e.message : 'Checkout error' });
            });
        } catch (e) {
          post({ type: 'error', message: (e && e.message) ? e.message : 'Checkout error' });
        }
      }
      setTimeout(runCheckout, 80);
    </script>
  </body>
</html>`;
  };

  const handleAddUpiFromSheet = async () => {
    setUpiFormError('');
    const trimmed = newUpiId.trim();
    if (!trimmed) {
      setUpiFormError('Enter UPI ID');
      return;
    }
    if (!validateUpiId(trimmed)) {
      setUpiFormError('Enter valid UPI ID (e.g. user@upi)');
      return;
    }
    if (savedUpiList.includes(trimmed) && trimmed !== editingUpiId) {
      setUpiFormError('This UPI ID is already saved');
      return;
    }
    dispatch(showLoader());
    try {
      await updateUpiIds([trimmed]);
      setNewUpiId('');
      setShowAddUpiModal(false);
      setSelectedUpiId(trimmed);
      setEditingUpiId(null);
      await refreshWallet();
      await fetchTransactions();
      Toast.show({ type: 'success', text1: editingUpiId ? 'UPI updated' : 'UPI saved' });
    } catch (e) {
      setUpiFormError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      dispatch(hideLoader());
    }
  };

  const requestRemoveUpi = (id: string) => {
    const upi = id.trim();
    if (!upi) return;
    setDeleteUpiConfirmId(upi);
  };

  const runRemoveUpi = async () => {
    const upi = deleteUpiConfirmId?.trim();
    if (!upi) return;
    dispatch(showLoader());
    try {
      await updateUpiIds([]);
      setEditingUpiId(null);
      setNewUpiId('');
      setSelectedUpiId(null);
      setDeleteUpiConfirmId(null);
      await refreshWallet();
      await fetchTransactions();
      Toast.show({ type: 'success', text1: 'UPI removed' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to remove UPI' });
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleSubmit = async () => {
    setError('');
    const val = parseFloat(amount);
    if (Number.isNaN(val)) {
      setError('Enter valid amount');
      return;
    }
    if (modalType === 'topup' && val < 1) {
      setError('Minimum top-up is ₹1');
      return;
    }
    if (modalType === 'withdraw' && val <= 0) {
      setError('Enter valid amount');
      return;
    }
    /* Manual QR top-up
    if (modalType === 'topup' && topUpMethod === 'qr' && (!selectedUpiId || !savedUpiList.includes(selectedUpiId))) {
      setError('Select saved UPI ID first');
      return;
    }
    */
    if (modalType === 'withdraw' && (!selectedUpiId || !savedUpiList.includes(selectedUpiId))) {
      setError('Select UPI ID to receive money');
      return;
    }

    /* Manual QR: walletService.createPaymentQr
    if (modalType === 'topup' && topUpMethod === 'qr') {
      setQrGenLoading(true);
      try {
        const result = await walletService.createPaymentQr(val, selectedUpiId!);
        setQrPaySession({ amount: val, result });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not create QR');
      } finally {
        setQrGenLoading(false);
      }
      return;
    }
    */

    if (modalType === 'topup') {
      dispatch(showLoader());
      let order: CashfreeOrderResult;
      try {
        order = await walletService.createCashfreeOrder(val);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start payment');
        dispatch(hideLoader());
        return;
      }
      dispatch(hideLoader());

      if (Platform.OS === 'web') {
        try {
          dispatch(showLoader());
          await startWebCashfreePayment(order, val);
          setAmount('');
          setModalType(null);
          await refreshWallet();
          await fetchTransactions();
          Toast.show({ type: 'success', text1: 'Top-up completed' });
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Payment failed';
          setError(msg);
          Toast.show({ type: 'error', text1: msg });
        } finally {
          dispatch(hideLoader());
        }
        return;
      }

      setCashfreeSession({ amountINR: val, order });
      return;
    }

    dispatch(showLoader());
    try {
      await withdraw(val, selectedUpiId!);
      setAmount('');
      setModalType(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      dispatch(hideLoader());
    }
  };

  // const qrImageUri = qrPaySession && walletService.paymentQrToImageUri(qrPaySession.result);

  const topUpSubmitLabel = modalType === 'topup' ? 'Pay with Cashfree' : 'Withdraw';

  // Manual QR needed saved UPI + Generate QR label — removed with QR flow
  const primaryDisabled =
    modalType === 'withdraw' && (savedUpiList.length === 0 || !selectedUpiId);

  const renderSavedUpiPicker = (opts: { title: string }) => (
    <View style={{ marginBottom: h(12) }}>
      <Text style={{ fontSize: w(13), fontWeight: '600', color: colors.text, marginBottom: h(8) }}>
        {opts.title}
      </Text>
      {savedUpiList.length === 0 ? (
        <View style={{ gap: h(10) }}>
          <Text style={{ fontSize: w(12), color: colors.tabIconDefault }}>
            Save a UPI ID on your profile to continue.
          </Text>
          <Button
            title="Add UPI ID"
            variant="outline"
            onPress={() => {
              setUpiFormError('');
              setNewUpiId('');
              setShowAddUpiModal(true);
            }}
          />
        </View>
      ) : (
        <ScrollView style={{ maxHeight: h(120) }} showsVerticalScrollIndicator={false}>
          {savedUpiList.map((id) => (
            <Pressable
              key={id}
              onPress={() => setSelectedUpiId(id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: w(12),
                borderRadius: w(10),
                marginBottom: h(6),
                backgroundColor: selectedUpiId === id ? colors.tint + '20' : colors.inputBg,
                borderWidth: 2,
                borderColor: selectedUpiId === id ? colors.tint : colors.border,
              }}
            >
              <FontAwesome name="credit-card" size={w(16)} color={colors.tint} style={{ marginRight: w(10) }} />
              <Text style={{ fontSize: w(14), fontWeight: '500', color: colors.text, flex: 1 }}>{id}</Text>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  setEditingUpiId(id);
                  setUpiFormError('');
                  setNewUpiId(id);
                  setShowAddUpiModal(true);
                }}
                style={{ paddingHorizontal: w(8), paddingVertical: h(6) }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Edit UPI ID"
              >
                <FontAwesome name="pencil" size={w(14)} color={colors.tint} />
              </Pressable>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  requestRemoveUpi(id);
                }}
                style={{ paddingHorizontal: w(8), paddingVertical: h(6) }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Remove UPI ID"
              >
                <FontAwesome name="trash" size={w(14)} color="#dc3545" />
              </Pressable>
              {selectedUpiId === id && <FontAwesome name="check-circle" size={w(18)} color={colors.tint} />}
            </Pressable>
          ))}
        </ScrollView>
      )}
      {savedUpiList.length > 0 && (
        <Pressable
          onPress={() => {
            setUpiFormError('');
            setNewUpiId('');
            setEditingUpiId(null);
            setShowAddUpiModal(true);
          }}
          style={{ marginTop: h(8), flexDirection: 'row', alignItems: 'center' }}
        >
          <FontAwesome name="plus-circle" size={w(14)} color={colors.tint} style={{ marginRight: w(6) }} />
          <Text style={{ fontSize: w(12), fontWeight: '600', color: colors.tint }}>Add different UPI ID</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.row}>
          <FontAwesome
            name="credit-card"
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
            {cashfreeSession ? (
              <>
                <Text
                  style={{
                    fontSize: w(20),
                    fontWeight: '700',
                    color: colors.text,
                    marginBottom: h(8),
                  }}
                >
                  Complete payment
                </Text>
                <Text style={{ fontSize: w(14), color: colors.tabIconDefault, marginBottom: h(6) }}>
                  Amount: ₹{cashfreeSession.amountINR.toFixed(2)}
                </Text>
                <Text style={{ fontSize: w(13), color: colors.tabIconDefault, marginBottom: h(16) }}>
                  Cashfree checkout opens below. After paying, we confirm and credit your wallet.
                </Text>
                <Text selectable style={{ fontSize: w(11), color: colors.tabIconDefault, marginBottom: h(12) }}>
                  Order ID: {cashfreeSession.order.orderId}
                </Text>
                {error ? (
                  <Text style={{ color: '#dc3545', fontSize: w(12), marginBottom: h(8) }}>{error}</Text>
                ) : null}
                {cashfreeError ? (
                  <Text style={{ color: '#dc3545', fontSize: w(12), marginBottom: h(8) }}>{cashfreeError}</Text>
                ) : null}
                <View style={styles.actions}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    style={styles.btn}
                    onPress={async () => {
                      setCashfreeSession(null);
                    }}
                  />
                  <Button title="Close" variant="ghost" onPress={closeModal} style={styles.btn} />
                </View>

                {Platform.OS !== 'web' && (
                  <View style={{ height: h(360), marginTop: h(12), borderRadius: w(12), overflow: 'hidden' }}>
                    <WebView
                      source={{ html: buildCashfreeCheckoutHtml(cashfreeSession) }}
                      originWhitelist={['*']}
                      javaScriptEnabled
                      domStorageEnabled
                      onMessage={async (evt) => {
                        try {
                          const payload = JSON.parse(String(evt.nativeEvent.data ?? '{}')) as Record<string, unknown>;
                          const type = String(payload.type ?? '');
                          if (type === 'failed' || type === 'error') {
                            setCashfreeError(String(payload.message ?? 'Payment failed'));
                            return;
                          }
                          if (type === 'checkout_done') {
                            const orderId = String(payload.orderId ?? cashfreeSession.order.orderId ?? '').trim();
                            if (!orderId) {
                              setCashfreeError('Missing order reference.');
                              return;
                            }
                            dispatch(showLoader());
                            try {
                              await finalizeCashfreeTopUp(orderId);
                              setCashfreeSession(null);
                              setAmount('');
                              setModalType(null);
                              await refreshWallet();
                              await fetchTransactions();
                              Toast.show({ type: 'success', text1: 'Top-up completed' });
                            } catch (e) {
                              setCashfreeError(e instanceof Error ? e.message : 'Verification failed');
                            } finally {
                              dispatch(hideLoader());
                            }
                          }
                        } catch {
                          setCashfreeError('Unexpected checkout response.');
                        }
                      }}
                    />
                  </View>
                )}
              </>
            ) : (
              <>
                {/* Manual QR “Scan to pay” branch removed — see WALLET_MANUAL_QR_FLOW_ARCHIVE at EOF */}
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
                  <Text
                    style={{
                      fontSize: w(12),
                      color: colors.tabIconDefault,
                      marginBottom: h(12),
                      lineHeight: Math.round(w(17)),
                    }}
                  >
                    UPI, cards, netbanking and more via Cashfree. Minimum ₹1.
                  </Text>
                )}
                {modalType === 'withdraw' && renderSavedUpiPicker({ title: 'Withdraw to (saved UPI ID)' })}
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
                    title={topUpSubmitLabel}
                    onPress={handleSubmit}
                    style={styles.btn}
                    disabled={primaryDisabled}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showAddUpiModal} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => {
            setShowAddUpiModal(false);
            setEditingUpiId(null);
          }}
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
              {editingUpiId ? 'Edit UPI ID' : 'Add UPI ID'}
            </Text>
            <Input
              label="UPI ID"
              placeholder="user@upi / 9876543210@okhdfcbank"
              value={newUpiId}
              onChangeText={setNewUpiId}
              autoCapitalize="none"
              error={upiFormError}
              leftIcon="credit-card"
            />
            <View style={{ flexDirection: 'row', gap: w(12), marginTop: h(8) }}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => {
                  setShowAddUpiModal(false);
                  setEditingUpiId(null);
                }}
                style={{ flex: 1 }}
              />
              <Button title={editingUpiId ? 'Save' : 'Save'} onPress={handleAddUpiFromSheet} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!deleteUpiConfirmId} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: w(20) }}
          onPress={() => setDeleteUpiConfirmId(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.cardBg,
              borderRadius: w(16),
              padding: w(18),
              borderWidth: 1,
              borderColor: colors.border,
              maxWidth: w(360),
              width: '100%',
              alignSelf: 'center',
            }}
          >
            <Text style={{ fontSize: w(16), fontWeight: '700', color: colors.text, marginBottom: h(6) }}>
              Delete UPI ID?
            </Text>
            <Text style={{ fontSize: w(13), color: colors.tabIconDefault, marginBottom: h(14) }}>
              {deleteUpiConfirmId}
            </Text>
            <View style={{ flexDirection: 'row', gap: w(12) }}>
              <Button
                title="No"
                variant="ghost"
                onPress={() => setDeleteUpiConfirmId(null)}
                style={{ flex: 1 }}
              />
              <Button title="Yes" onPress={runRemoveUpi} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/*
 * =============================================================================
 * WALLET_MANUAL_QR_FLOW_ARCHIVE (disabled)
 * Restore by: re-add `CreatePaymentQrResult` import; `Image`, `Linking` from RN;
 * `TopUpMethod` += 'qr'; QR row in TOP_UP_OPTIONS; state qrPaySession + qrGenLoading;
 * useEffect polling walletService.getPaymentQrStatus; dismissQrOnServer +
 * walletService.closePaymentQr; handleSubmit branches for qr validation +
 * walletService.createPaymentQr; qrImageUri via paymentQrToImageUri; modal branch
 * `qrPaySession ? (scan UI + Linking.openURL)` between cashfreeSession and form;
 * needsUpiForTopup for qr; primaryDisabled + qrGenLoading; ActivityIndicator when
 * generating QR; renderSavedUpiPicker when topUpMethod === 'qr'.
 * APIs: POST /payment/create-qr, GET /payment/qr-status/:id, POST /payment/close-qr/:id
 * =============================================================================
 */
