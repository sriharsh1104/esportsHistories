import { BackButton, Button, CustomPhoneInput, Input, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import type { UserAddress } from '@/types/auth';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

export default function AddressesScreen() {
  const { user, updateAddresses } = useAuth();
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const dispatch = useAppDispatch();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const addresses = user?.addresses ?? [];

  React.useEffect(() => {
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user?.phone]);

  const styles = useMemo(
    () => ({
      content: { flex: 1, paddingTop: h(48) },
      title: { fontSize: w(28), fontWeight: '700' as const, marginBottom: h(8) },
      subtitle: { fontSize: w(16), marginBottom: h(24) },
      section: { marginBottom: h(24) },
      sectionTitle: { fontSize: w(18), fontWeight: '600' as const, marginBottom: h(12) },
      addrCard: {
        padding: w(16),
        borderRadius: w(12),
        borderWidth: 1,
        marginBottom: h(12),
      },
      addrText: { fontSize: w(14), lineHeight: w(20) },
      useLocationBtn: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: h(12),
        paddingHorizontal: w(16),
        borderRadius: w(12),
        borderWidth: 1,
        borderStyle: 'dashed' as const,
        marginBottom: h(20),
      },
    }),
    [w, h]
  );

  const handleUseCurrentLocation = async () => {
    setError('');
    dispatch(showLoader());
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const [rev] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (rev) {
        setLine1(rev.streetNumber && rev.street ? `${rev.streetNumber} ${rev.street}` : rev.street || rev.name || '');
        setLine2('');
        setCity(rev.city || '');
        setState(rev.region || '');
        setPincode(rev.postalCode || '');
      } else {
        setError('Could not get address from location');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get location');
      if (Platform.OS === 'web') {
        setError('Location not available on web. Use a mobile device.');
      }
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleAddAddress = async () => {
    setError('');
    if (!line1.trim()) {
      setError('Address line 1 is required');
      return;
    }
    if (!city.trim()) {
      setError('City is required');
      return;
    }
    if (!pincode.trim()) {
      setError('Pincode is required');
      return;
    }
    if (!phone.trim()) {
      setError('Contact number required for delivery partner to call');
      return;
    }
    dispatch(showLoader());
    try {
      const newAddr: UserAddress = {
        id: Date.now().toString(),
        line1: line1.trim(),
        line2: line2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        phone: phone.trim(),
        isDefault: addresses.length === 0,
      };
      await updateAddresses([...addresses, newAddr]);
      setLine1('');
      setLine2('');
      setCity('');
      setState('');
      setPincode('');
      setPhone('');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleRemoveAddress = (id: string) => {
    Alert.alert('Remove address', 'Remove this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => updateAddresses(addresses.filter((a) => a.id !== id)),
      },
    ]);
  };

  if (!user) {
    router.replace('/(auth)/login');
    return null;
  }

  return (
    <Screen keyboardAvoid padded maxForm>
      <View style={styles.content}>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>Addresses</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Add delivery addresses for orders
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {addresses.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Saved addresses
              </Text>
              {addresses.map((addr) => (
                <View
                  key={addr.id}
                  style={[
                    styles.addrCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: addr.isDefault ? colors.tint : colors.border,
                      borderWidth: addr.isDefault ? 2 : 1,
                    },
                  ]}
                >
                  {addr.isDefault && (
                    <Text
                      style={{
                        fontSize: w(12),
                        fontWeight: '600',
                        color: colors.tint,
                        marginBottom: h(4),
                      }}
                    >
                      DEFAULT
                    </Text>
                  )}
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
                  <View style={{ flexDirection: 'row', marginTop: h(8), gap: w(16) }}>
                    {!addr.isDefault && (
                      <Pressable
                        onPress={() => {
                          const updated = addresses.map((a) => ({
                            ...a,
                            isDefault: a.id === addr.id,
                          }));
                          updateAddresses(updated);
                        }}
                      >
                        <Text style={{ fontSize: w(13), color: colors.tint }}>Set as default</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => handleRemoveAddress(addr.id)}>
                      <Text style={{ fontSize: w(13), color: '#dc3545' }}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Add new address
            </Text>
            <Pressable
              onPress={handleUseCurrentLocation}
              style={[
                styles.useLocationBtn,
                { borderColor: colors.tint, backgroundColor: colors.tint + '15' },
              ]}
            >
              <FontAwesome
                name="location-arrow"
                size={w(20)}
                color={colors.tint}
                style={{ marginRight: w(12) }}
              />
              <Text
                style={{
                  fontSize: w(15),
                  fontWeight: '600',
                  color: colors.tint,
                }}
              >
                Use my current location
              </Text>
            </Pressable>
            <Input
              label="Address line 1"
              placeholder="House no., building, street"
              value={line1}
              onChangeText={setLine1}
              leftIcon="home"
              error={error}
            />
            <Input
              label="Address line 2 (optional)"
              placeholder="Area, landmark"
              value={line2}
              onChangeText={setLine2}
              leftIcon="map-marker"
            />
            <Input
              label="City"
              placeholder="City"
              value={city}
              onChangeText={setCity}
              leftIcon="building"
            />
            <Input
              label="State"
              placeholder="State"
              value={state}
              onChangeText={setState}
              leftIcon="globe"
            />
            <Input
              label="Pincode"
              placeholder="PIN code"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="number-pad"
            />
            <CustomPhoneInput
              label="Contact number"
              placeholder="For delivery partner to call"
              value={phone}
              onChangeText={setPhone}
              error={error?.includes('Contact') ? error : undefined}
            />
            <Button
              title="Add address"
              onPress={handleAddAddress}
              fullWidth
              style={{ marginTop: h(16) }}
            />
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}
