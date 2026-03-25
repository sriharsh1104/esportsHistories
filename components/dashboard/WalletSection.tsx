import { Button, Card, Input } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useWallet } from '@/context/WalletContext';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import type { CreatePaymentQrResult, RazorpayOrderResult } from '@/types/payment';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

type TopUpMethod = 'upi' | 'card' | 'qr';

const TOP_UP_OPTIONS: { id: TopUpMethod; icon: string; label: string; desc: string }[] = [
  { id: 'upi', icon: 'credit-card', label: 'UPI', desc: 'GPay, PhonePe, BHIM, etc.' },
  { id: 'card', icon: 'credit-card-alt', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
  { id: 'qr', icon: 'qrcode', label: 'QR Code', desc: 'Scan to pay' },
];

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
  const [topUpMethod, setTopUpMethod] = useState<TopUpMethod>('upi');
  const [selectedUpiId, setSelectedUpiId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showAddUpiModal, setShowAddUpiModal] = useState(false);
  const [newUpiId, setNewUpiId] = useState('');
  const [upiFormError, setUpiFormError] = useState('');
  const [editingUpiId, setEditingUpiId] = useState<string | null>(null);
  const [deleteUpiConfirmId, setDeleteUpiConfirmId] = useState<string | null>(null);
  const [qrPaySession, setQrPaySession] = useState<{
    amount: number;
    result: CreatePaymentQrResult;
  } | null>(null);
  const [razorpaySession, setRazorpaySession] = useState<{
    amountINR: number;
    order: RazorpayOrderResult;
  } | null>(null);
  const [qrGenLoading, setQrGenLoading] = useState(false);
  const [razorpayError, setRazorpayError] = useState<string>('');

  const dispatch = useAppDispatch();

  useEffect(() => {
    if (savedUpiList.length === 1 && !selectedUpiId) {
      setSelectedUpiId(savedUpiList[0]);
    }
  }, [savedUpiList, selectedUpiId]);

  useEffect(() => {
    const id = qrPaySession?.result.qrCodeId;
    if (!id || modalType !== 'topup') return;

    const tick = async () => {
      try {
        const { status } = await walletService.getPaymentQrStatus(id);
        if (status === 'success') {
          setQrPaySession(null);
          setAmount('');
          setModalType(null);
          await refreshWallet();
          await fetchTransactions();
          Toast.show({ type: 'success', text1: 'Top-up completed' });
        } else if (status === 'failed') {
          setQrPaySession(null);
          setError('Payment expired or failed. Generate a new QR.');
        }
      } catch {
        /* ignore transient poll errors */
      }
    };

    void tick();
    const interval = setInterval(() => void tick(), 4000);
    return () => clearInterval(interval);
  }, [qrPaySession?.result.qrCodeId, modalType, refreshWallet, fetchTransactions]);

  useEffect(() => {
    if (!razorpaySession || modalType !== 'topup') return;
    setRazorpayError('');
  }, [razorpaySession, modalType]);

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

  const dismissQrOnServer = (result: CreatePaymentQrResult | null) => {
    const qid = result?.qrCodeId;
    if (!qid) return;
    void walletService.closePaymentQr(qid).catch(() => {});
  };

  const closeModal = () => {
    if (qrPaySession?.result) dismissQrOnServer(qrPaySession.result);
    setQrPaySession(null);
    setRazorpaySession(null);
    setModalType(null);
    setAmount('');
    setTopUpMethod('upi');
    setSelectedUpiId(null);
    setError('');
    setQrGenLoading(false);
    setRazorpayError('');
  };

  const buildRazorpayCheckoutHtml = (session: {
    amountINR: number;
    order: RazorpayOrderResult;
  }) => {
    const amountPaise = session.order.amountPaise;
    const keyId = session.order.keyId.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const orderId = session.order.orderId.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const name = 'Esports Histories';

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Razorpay Checkout</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; background: #0b1220; color: #e6eefc; }
      .wrap { padding: 18px; }
      .card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10); border-radius: 14px; padding: 16px; }
      .title { font-size: 16px; font-weight: 700; margin: 0 0 8px; }
      .sub { font-size: 12px; opacity: 0.8; margin: 0 0 14px; }
      .btn { width: 100%; padding: 14px 12px; border-radius: 12px; border: 0; background: #2f7cf6; color: white; font-weight: 800; font-size: 14px; }
      .btn:active { transform: scale(0.99); }
      .muted { font-size: 11px; opacity: 0.7; margin-top: 12px; word-break: break-all; }
    </style>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <p class="title">Complete payment</p>
        <p class="sub">This will open Razorpay checkout.</p>
        <button class="btn" onclick="openCheckout()">Pay ₹${session.amountINR.toFixed(2)}</button>
        <div class="muted">Order: ${orderId}</div>
      </div>
    </div>
    <script>
      function post(payload) {
        try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
      }
      function openCheckout() {
        if (!window.Razorpay) {
          post({ type: 'error', message: 'Razorpay SDK failed to load' });
          return;
        }
        var options = {
          key: '${keyId}',
          order_id: '${orderId}',
          amount: ${Number.isFinite(amountPaise) ? amountPaise : 0},
          currency: 'INR',
          name: '${name}',
          description: 'Wallet top-up',
          handler: function (response) {
            post({
              type: 'success',
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });
          },
          modal: {
            ondismiss: function() { post({ type: 'dismiss' }); }
          }
        };
        try {
          var rz = new Razorpay(options);
          rz.on('payment.failed', function (resp) {
            post({ type: 'failed', message: (resp && resp.error && resp.error.description) ? resp.error.description : 'Payment failed', raw: resp });
          });
          rz.open();
        } catch (e) {
          post({ type: 'error', message: (e && e.message) ? e.message : 'Checkout error' });
        }
      }
      setTimeout(openCheckout, 50);
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
    if (isNaN(val) || val <= 0) {
      setError('Enter valid amount');
      return;
    }
    if (modalType === 'topup' && topUpMethod === 'upi' && (!selectedUpiId || !savedUpiList.includes(selectedUpiId))) {
      setError('Select UPI ID to pay from');
      return;
    }
    if (modalType === 'topup' && topUpMethod === 'qr' && (!selectedUpiId || !savedUpiList.includes(selectedUpiId))) {
      setError('Select saved UPI ID first');
      return;
    }
    if (modalType === 'withdraw' && (!selectedUpiId || !savedUpiList.includes(selectedUpiId))) {
      setError('Select UPI ID to receive money');
      return;
    }

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

    if (modalType === 'topup') {
      dispatch(showLoader());
      try {
        const order = await walletService.createRazorpayOrder(val);
        setRazorpaySession({ amountINR: val, order });
        if (Platform.OS === 'web') {
          setError('Razorpay checkout is not supported on web in this app build.');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start Razorpay checkout');
      } finally {
        dispatch(hideLoader());
      }
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

  const qrImageUri =
    qrPaySession && walletService.paymentQrToImageUri(qrPaySession.result);

  const topUpSubmitLabel =
    modalType === 'topup' && topUpMethod === 'qr' ? 'Generate QR' : modalType === 'topup' ? 'Add' : 'Withdraw';

  const needsUpiForTopup =
    modalType === 'topup' &&
    (topUpMethod === 'upi' || topUpMethod === 'qr') &&
    (savedUpiList.length === 0 || !selectedUpiId);

  const primaryDisabled =
    needsUpiForTopup ||
    (modalType === 'withdraw' && (savedUpiList.length === 0 || !selectedUpiId)) ||
    qrGenLoading;

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
            {razorpaySession ? (
              <>
                <Text
                  style={{
                    fontSize: w(20),
                    fontWeight: '700',
                    color: colors.text,
                    marginBottom: h(8),
                  }}
                >
                  Complete Razorpay payment
                </Text>
                <Text style={{ fontSize: w(14), color: colors.tabIconDefault, marginBottom: h(6) }}>
                  Amount: ₹{razorpaySession.amountINR.toFixed(2)}
                </Text>
                <Text style={{ fontSize: w(13), color: colors.tabIconDefault, marginBottom: h(16) }}>
                  Payment window will open inside the app. Complete payment to finish top-up.
                </Text>
                <Text selectable style={{ fontSize: w(11), color: colors.tabIconDefault, marginBottom: h(12) }}>
                  Order ID: {razorpaySession.order.orderId}
                </Text>
                {error ? (
                  <Text style={{ color: '#dc3545', fontSize: w(12), marginBottom: h(8) }}>{error}</Text>
                ) : null}
                {razorpayError ? (
                  <Text style={{ color: '#dc3545', fontSize: w(12), marginBottom: h(8) }}>{razorpayError}</Text>
                ) : null}
                <View style={styles.actions}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    style={styles.btn}
                    onPress={async () => {
                      setRazorpaySession(null);
                    }}
                  />
                  <Button title="Close" variant="ghost" onPress={closeModal} style={styles.btn} />
                </View>

                {Platform.OS !== 'web' && (
                  <View style={{ height: h(360), marginTop: h(12), borderRadius: w(12), overflow: 'hidden' }}>
                    <WebView
                      source={{ html: buildRazorpayCheckoutHtml(razorpaySession) }}
                      originWhitelist={['*']}
                      javaScriptEnabled
                      domStorageEnabled
                      onMessage={async (evt) => {
                        try {
                          const payload = JSON.parse(String(evt.nativeEvent.data ?? '{}')) as Record<string, unknown>;
                          const type = String(payload.type ?? '');
                          if (type === 'dismiss') {
                            setRazorpayError('Checkout closed. If amount was debited, wait a few seconds and try again.');
                            return;
                          }
                          if (type === 'failed' || type === 'error') {
                            setRazorpayError(String(payload.message ?? 'Payment failed'));
                            return;
                          }
                          if (type === 'success') {
                            const orderId = String(payload.orderId ?? '').trim();
                            const paymentId = String(payload.paymentId ?? '').trim();
                            const signature = String(payload.signature ?? '').trim();
                            if (!orderId || !paymentId || !signature) {
                              setRazorpayError('Missing payment details from checkout.');
                              return;
                            }

                            dispatch(showLoader());
                            try {
                              const result = await walletService.verifyRazorpayPayment({
                                orderId,
                                paymentId,
                                signature,
                              });
                              if (result.status === 'success') {
                                setRazorpaySession(null);
                                setAmount('');
                                setModalType(null);
                                await refreshWallet();
                                await fetchTransactions();
                                Toast.show({ type: 'success', text1: 'Top-up completed' });
                              } else if (result.status === 'pending') {
                                setRazorpayError('Payment pending. Please wait a few seconds and try again.');
                              } else {
                                setRazorpayError('Payment failed or cancelled.');
                              }
                            } catch (e) {
                              setRazorpayError(e instanceof Error ? e.message : 'Verification failed');
                            } finally {
                              dispatch(hideLoader());
                            }
                          }
                        } catch {
                          setRazorpayError('Unexpected checkout response.');
                        }
                      }}
                    />
                  </View>
                )}
              </>
            ) : qrPaySession ? (
              <>
                <Text
                  style={{
                    fontSize: w(20),
                    fontWeight: '700',
                    color: colors.text,
                    marginBottom: h(8),
                  }}
                >
                  Scan to pay
                </Text>
                <Text style={{ fontSize: w(14), color: colors.tabIconDefault, marginBottom: h(16) }}>
                  ₹{qrPaySession.amount.toFixed(2)} — open any UPI app and scan the QR. This screen closes when
                  payment is detected.
                </Text>
                {qrImageUri ? (
                  <View style={{ alignItems: 'center', marginBottom: h(16) }}>
                    <Image
                      source={{ uri: qrImageUri }}
                      style={{ width: w(220), height: w(220) }}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <Text style={{ fontSize: w(13), color: colors.tabIconDefault, marginBottom: h(12) }}>
                    No QR image in response. If your app opened a payment link, complete the payment there—we are
                    still checking status.
                  </Text>
                )}
                {(qrPaySession.result.upiLink || qrPaySession.result.paymentLink) && (
                  <Text
                    selectable
                    style={{ fontSize: w(11), color: colors.tabIconDefault, marginBottom: h(12) }}
                  >
                    {qrPaySession.result.upiLink || qrPaySession.result.paymentLink}
                  </Text>
                )}
                <View style={styles.actions}>
                  <Button
                    title="Back"
                    variant="outline"
                    style={styles.btn}
                    onPress={() => {
                      dismissQrOnServer(qrPaySession.result);
                      setQrPaySession(null);
                    }}
                  />
                  <Button title="Close" variant="ghost" onPress={closeModal} style={styles.btn} />
                </View>
              </>
            ) : (
              <>
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
                        onPress={() => {
                          setTopUpMethod(opt.id);
                          if (opt.id !== 'upi' && opt.id !== 'qr') setSelectedUpiId(null);
                        }}
                        style={[
                          styles.payOpt,
                          {
                            backgroundColor: colors.cardBg,
                            borderColor: topUpMethod === opt.id ? colors.tint : colors.border,
                          },
                        ]}
                      >
                        <FontAwesome
                          name={opt.icon as keyof typeof FontAwesome.glyphMap}
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
                    {(topUpMethod === 'upi' || topUpMethod === 'qr') &&
                      renderSavedUpiPicker({
                        title: topUpMethod === 'qr' ? 'Your UPI (for this payment)' : 'Pay from (saved UPI ID)',
                      })}
                    <View style={{ height: h(8) }} />
                  </>
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
                {qrGenLoading && (
                  <ActivityIndicator size="small" color={colors.tint} style={{ marginBottom: h(12) }} />
                )}
                <View style={styles.actions}>
                  <Button title="Cancel" variant="ghost" onPress={closeModal} style={styles.btn} />
                  <Button
                    title={topUpSubmitLabel}
                    onPress={handleSubmit}
                    style={styles.btn}
                    disabled={primaryDisabled || qrGenLoading}
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
