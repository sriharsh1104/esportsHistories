import { BackButton, Button, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useWallet } from '@/context/WalletContext';
import { getItemById } from '@/data/shop';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  Text,
  View
} from 'react-native';

type PaymentMethod = 'wallet' | 'upi' | 'card' | 'qr';

export default function CheckoutScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { balance, withdraw } = useWallet();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const product = productId ? getItemById(productId) : undefined;
  const addresses = user?.addresses ?? [];
  const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    defaultAddr?.id ?? null
  );
  React.useEffect(() => {
    const def = addresses.find((a) => a.isDefault) ?? addresses[0];
    setSelectedAddressId((prev) => {
      if (!prev || !addresses.find((a) => a.id === prev)) return def?.id ?? null;
      return prev;
    });
  }, [addresses]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const dispatch = useAppDispatch();

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  const styles = useMemo(
    () => ({
      content: { paddingTop: h(16), paddingBottom: h(32) },
      title: { fontSize: w(22), fontWeight: '700' as const, marginBottom: h(20) },
      productRow: {
        flexDirection: 'row' as const,
        marginBottom: h(20),
        padding: w(12),
        borderRadius: w(12),
        borderWidth: 1,
      },
      productImage: { width: w(80), height: w(80), borderRadius: w(12) },
      productInfo: { flex: 1, marginLeft: w(16), justifyContent: 'center' as const },
      productName: { fontSize: w(16), fontWeight: '600' as const },
      productPrice: { fontSize: w(18), fontWeight: '700' as const, marginTop: h(4) },
      sectionTitle: { fontSize: w(16), fontWeight: '600' as const, marginBottom: h(12) },
      addrCard: {
        padding: w(16),
        borderRadius: w(12),
        borderWidth: 2,
        marginBottom: h(12),
      },
      addrText: { fontSize: w(14), lineHeight: w(20) },
      paymentOption: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        padding: w(16),
        borderRadius: w(12),
        borderWidth: 2,
        marginBottom: h(12),
      },
      payBtn: { marginTop: h(24) },
    }),
    [w, h]
  );

  const handlePlaceOrder = async () => {
    if (!product || !selectedAddress) return;
    if (paymentMethod === 'wallet' && balance < product.price) return;
    dispatch(showLoader());
    try {
      if (paymentMethod === 'wallet') {
        await withdraw(product.price);
      } else {
        await new Promise((r) => setTimeout(r, 1500));
      }
      router.back();
      router.back();
    } catch (e) {
      // Handle error
    } finally {
      dispatch(hideLoader());
    }
  };

  if (!isAuthenticated) {
    return (
      <Screen padded>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>Sign in to checkout</Text>
        <Button
          title="Sign in"
          onPress={() => router.replace('/(auth)/login')}
          style={{ marginTop: h(16) }}
        />
      </Screen>
    );
  }

  if (!product) {
    return (
      <Screen padded>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>Product not found</Text>
      </Screen>
    );
  }

  return (
    <Screen padded scroll keyboardAvoid>
      <View style={styles.content}>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>Checkout</Text>

        <View
          style={[
            styles.productRow,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.productImage}
            resizeMode="cover"
          />
          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
            <Text style={[styles.productPrice, { color: colors.tint }]}>
              ₹{product.price.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery address</Text>
        {addresses.length === 0 ? (
          <Pressable
            onPress={() => router.push('/addresses')}
            style={[
              styles.addrCard,
              {
                borderColor: colors.tint,
                borderStyle: 'dashed',
                backgroundColor: colors.tint + '15',
              },
            ]}
          >
            <FontAwesome name="plus" size={w(20)} color={colors.tint} style={{ marginBottom: h(8) }} />
            <Text style={{ fontSize: w(15), fontWeight: '600', color: colors.tint }}>
              Add address
            </Text>
            <Text style={{ fontSize: w(13), color: colors.tabIconDefault, marginTop: h(4) }}>
              Save delivery address from address book
            </Text>
          </Pressable>
        ) : (
          <>
            {addresses.map((addr) => (
              <Pressable
                key={addr.id}
                onPress={() => setSelectedAddressId(addr.id)}
                style={[
                  styles.addrCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: selectedAddressId === addr.id ? colors.tint : colors.border,
                  },
                ]}
              >
                <Text style={[styles.addrText, { color: colors.text }]}>
                  {addr.line1}
                  {addr.line2 ? `, ${addr.line2}` : ''}
                </Text>
                <Text style={[styles.addrText, { color: colors.tabIconDefault }]}>
                  {addr.city}, {addr.state} - {addr.pincode}
                </Text>
                {addr.phone ? (
                  <Text style={[styles.addrText, { color: colors.tint, marginTop: h(4) }]}>
                    📞 {addr.phone}
                  </Text>
                ) : null}
              </Pressable>
            ))}
            <Pressable
              onPress={() => router.push('/addresses')}
              style={{ marginBottom: h(16) }}
            >
              <Text style={{ fontSize: w(14), fontWeight: '600', color: colors.tint }}>
                + Add or change address
              </Text>
            </Pressable>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment</Text>
        <Pressable
          onPress={() => setPaymentMethod('wallet')}
          style={[
            styles.paymentOption,
            {
              backgroundColor: colors.cardBg,
              borderColor: paymentMethod === 'wallet' ? colors.tint : colors.border,
            },
          ]}
        >
          <FontAwesome name="credit-card" size={w(24)} color={colors.tint} style={{ marginRight: w(12) }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: w(16), fontWeight: '600', color: colors.text }}>Wallet</Text>
            <View>
              <Text style={{ fontSize: w(13), color: colors.tabIconDefault }}>
                Balance: ₹{balance.toLocaleString('en-IN')}
                {product && balance < product.price && ' • Top up to use'}
              </Text>
              {product && balance < product.price && (
                <Pressable onPress={() => router.push('/(drawer)/(tabs)/wallet')} style={{ marginTop: h(4) }}>
                  <Text style={{ fontSize: w(13), fontWeight: '600', color: colors.tint }}>Add money to wallet</Text>
                </Pressable>
              )}
            </View>
          </View>
          {paymentMethod === 'wallet' && (
            <FontAwesome name="check-circle" size={w(22)} color={colors.tint} />
          )}
        </Pressable>
        <Pressable
          onPress={() => setPaymentMethod('upi')}
          style={[
            styles.paymentOption,
            {
              backgroundColor: colors.cardBg,
              borderColor: paymentMethod === 'upi' ? colors.tint : colors.border,
            },
          ]}
        >
          <FontAwesome name="credit-card" size={w(24)} color={colors.tint} style={{ marginRight: w(12) }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: w(16), fontWeight: '600', color: colors.text }}>UPI</Text>
            <Text style={{ fontSize: w(13), color: colors.tabIconDefault }}>
              GPay, PhonePe, Paytm, etc.
            </Text>
          </View>
          {paymentMethod === 'upi' && (
            <FontAwesome name="check-circle" size={w(22)} color={colors.tint} />
          )}
        </Pressable>
        <Pressable
          onPress={() => setPaymentMethod('card')}
          style={[
            styles.paymentOption,
            {
              backgroundColor: colors.cardBg,
              borderColor: paymentMethod === 'card' ? colors.tint : colors.border,
            },
          ]}
        >
          <FontAwesome name="credit-card-alt" size={w(24)} color={colors.tint} style={{ marginRight: w(12) }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: w(16), fontWeight: '600', color: colors.text }}>
              Credit / Debit card
            </Text>
            <Text style={{ fontSize: w(13), color: colors.tabIconDefault }}>
              Visa, Mastercard, RuPay
            </Text>
          </View>
          {paymentMethod === 'card' && (
            <FontAwesome name="check-circle" size={w(22)} color={colors.tint} />
          )}
        </Pressable>
        <Pressable
          onPress={() => setPaymentMethod('qr')}
          style={[
            styles.paymentOption,
            {
              backgroundColor: colors.cardBg,
              borderColor: paymentMethod === 'qr' ? colors.tint : colors.border,
            },
          ]}
        >
          <FontAwesome name="qrcode" size={w(24)} color={colors.tint} style={{ marginRight: w(12) }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: w(16), fontWeight: '600', color: colors.text }}>
              Scan QR code
            </Text>
            <Text style={{ fontSize: w(13), color: colors.tabIconDefault }}>
              Pay via QR at delivery
            </Text>
          </View>
          {paymentMethod === 'qr' && (
            <FontAwesome name="check-circle" size={w(22)} color={colors.tint} />
          )}
        </Pressable>

        <Button
          title={
            !selectedAddress
              ? 'Add address to continue'
              : paymentMethod === 'wallet' && balance < product.price
                ? 'Insufficient balance - Add money'
                : `Pay ₹${product.price.toLocaleString('en-IN')}`
          }
          fullWidth
          disabled={!selectedAddress || (paymentMethod === 'wallet' && balance < product.price)}
          onPress={handlePlaceOrder}
          style={styles.payBtn}
        />
      </View>
    </Screen>
  );
}
