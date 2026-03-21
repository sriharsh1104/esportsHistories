import { BackButton, Button, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import type { UserAddress } from '@/types/auth';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

export default function AddressBookScreen() {
  const { user, updateAddresses } = useAuth();
  const { from, productId } = useLocalSearchParams<{
    from?: string;
    productId?: string;
  }>();
  const isCheckoutFlow = from === 'checkout' && !!productId;

  const dispatch = useAppDispatch();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const addresses = user?.addresses ?? [];

  const styles = useMemo(
    () => ({
      content: { flex: 1, paddingTop: h(48) },
      title: { fontSize: w(28), fontWeight: '700' as const, marginBottom: h(8) },
      subtitle: { fontSize: w(15), marginBottom: h(20), lineHeight: w(22) },
      addrCard: {
        padding: w(16),
        borderRadius: w(12),
        borderWidth: 2,
        marginBottom: h(12),
      },
      addrText: { fontSize: w(14), lineHeight: w(20) },
      bookRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        marginBottom: h(8),
      },
    }),
    [w, h]
  );

  const handleSelect = async (addr: UserAddress) => {
    if (isCheckoutFlow && productId) {
      router.replace({
        pathname: '/(drawer)/(tabs)/shop/checkout',
        params: { productId: String(productId), selectedAddressId: addr.id },
      });
      return;
    }

    dispatch(showLoader());
    try {
      const updated = addresses.map((a) => ({ ...a, isDefault: a.id === addr.id }));
      await updateAddresses(updated);
      Toast.show({ type: 'success', text1: 'Default delivery address updated' });
      router.back();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: e instanceof Error ? e.message : 'Could not update default address',
      });
    } finally {
      dispatch(hideLoader());
    }
  };

  if (!user) {
    router.replace(ROUTES.LOGIN);
    return null;
  }

  return (
    <Screen keyboardAvoid padded maxForm>
      <View style={styles.content}>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>Address book</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          {isCheckoutFlow
            ? 'Tap an address to deliver this order there.'
            : 'Tap an address to set it as your default delivery location.'}
        </Text>

        {addresses.length === 0 ? (
          <View style={{ marginTop: h(24) }}>
            <Text style={{ fontSize: w(15), color: colors.tabIconDefault, marginBottom: h(20) }}>
              You have no saved addresses yet.
            </Text>
            <Button
              title="Add address"
              onPress={() => router.push(ROUTES.ADDRESSES)}
              fullWidth
            />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {addresses.map((addr) => (
              <Pressable
                key={addr.id}
                onPress={() => void handleSelect(addr)}
                style={[
                  styles.addrCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: addr.isDefault ? colors.tint : colors.border,
                  },
                ]}
              >
                <View style={styles.bookRow}>
                  <FontAwesome
                    name="map-marker"
                    size={w(18)}
                    color={colors.tint}
                    style={{ marginRight: w(10) }}
                  />
                  {addr.isDefault ? (
                    <Text
                      style={{
                        fontSize: w(11),
                        fontWeight: '700' as const,
                        color: colors.tint,
                        letterSpacing: 0.5,
                      }}
                    >
                      DEFAULT
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.addrText, { color: colors.text }]}>
                  {`${addr.addressLine1 || ''}${addr.addressLine2 ? `, ${addr.addressLine2}` : ''}`}
                </Text>
                <Text style={[styles.addrText, { color: colors.tabIconDefault }]}>
                  {`${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}`}
                </Text>
                {addr.contactNumber ? (
                  <Text style={[styles.addrText, { color: colors.tint, marginTop: h(6) }]}>
                    📞 {addr.contactNumber}
                  </Text>
                ) : null}
                <Text
                  style={{
                    fontSize: w(12),
                    fontWeight: '600' as const,
                    color: colors.tint,
                    marginTop: h(10),
                  }}
                >
                  {isCheckoutFlow ? 'Tap to use for this order →' : 'Tap to set as default →'}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => router.push(ROUTES.ADDRESSES)}
              style={{ marginTop: h(8), marginBottom: h(24) }}
            >
              <Text style={{ fontSize: w(14), fontWeight: '600', color: colors.tint }}>
                + Add or edit addresses
              </Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}
