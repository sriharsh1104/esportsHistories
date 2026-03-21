import { BackButton, Button, CustomPhoneInput, Input, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import { AddressMapPicker } from '@/components/AddressMapPicker';
import type { UserAddress } from '@/types/auth';
import { ApiError } from '@/services/api.service';
import {
  mapReverseGeocodeAddressToForm,
  reverseGeocodeWithBackend,
} from '@/services/reverseGeocodeViaBackend';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Location from 'expo-location';
import { ROUTES } from '@/constants/routes';
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
  const { user, updateAddresses, addAddress } = useAuth();
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [resolvedDisplayName, setResolvedDisplayName] = useState<string | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapLat, setMapLat] = useState(20.5937);
  const [mapLng, setMapLng] = useState(78.9629);
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

  const openMapAt = (latitude: number, longitude: number) => {
    setMapLat(latitude);
    setMapLng(longitude);
    setMapPickerOpen(true);
  };

  const applyCoordsToForm = async (latitude: number, longitude: number) => {
    dispatch(showLoader());
    setResolvedDisplayName(null);
    try {
      const data = await reverseGeocodeWithBackend(latitude, longitude, 'en-IN');
      const mapped = mapReverseGeocodeAddressToForm(data.address, data.displayName);
      setAddressLine1(mapped.addressLine1);
      setAddressLine2(mapped.addressLine2 ?? '');
      setCity(mapped.city);
      setState(mapped.state);
      setPincode(mapped.pincode);
      if (data.displayName?.trim()) {
        setResolvedDisplayName(data.displayName.trim());
      }
    } catch (e) {
      setResolvedDisplayName(null);
      if (e instanceof ApiError) {
        const code = e.statusCode;
        if (code === 401) {
          setError('Session expired. Please sign in again.');
          router.replace(ROUTES.LOGIN);
          return;
        }
        if (code === 403) {
          setError('Verify your email to use location search.');
          return;
        }
        if (code === 404) {
          setError('No address found for this point. Edit the fields manually.');
          return;
        }
        if (code === 429) {
          setError('Too many requests. Try again in a moment.');
          return;
        }
        if (code === 502) {
          setError('Location service is unavailable. Edit manually or retry.');
          return;
        }
      }
      setError(e instanceof Error ? e.message : 'Could not resolve address.');
    } finally {
      dispatch(hideLoader());
    }
  };

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
      const { latitude, longitude } = loc.coords;
      openMapAt(latitude, longitude);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get location');
      if (Platform.OS === 'web') {
        setError('GPS not available — use “Pick on map” and drag the pin.');
      }
    } finally {
      dispatch(hideLoader());
    }
  };

  const handlePickOnMap = () => {
    setError('');
    openMapAt(mapLat, mapLng);
  };

  const handleReverseGeocodeFromMap = (lat: number, lon: number) => {
    setMapPickerOpen(false);
    setMapLat(lat);
    setMapLng(lon);
    setError('');
    void applyCoordsToForm(lat, lon);
  };

  const handleMapCancel = () => {
    setMapPickerOpen(false);
  };

  const handleAddAddress = async () => {
    setError('');
    if (!addressLine1.trim()) {
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
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        contactNumber: phone.trim(),
        isDefault: addresses.length === 0,
      };
      await addAddress(newAddr);
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setState('');
      setPincode('');
      setPhone('');
      setResolvedDisplayName(null);
      // Stay on this screen — router.back() would pop Addresses and send user to the previous route (e.g. edit-profile).
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
    router.replace(ROUTES.LOGIN);
    return null;
  }

  return (
    <Screen keyboardAvoid padded maxForm>
      <AddressMapPicker
        visible={mapPickerOpen}
        initialLatitude={mapLat}
        initialLongitude={mapLng}
        onReverseGeocodeRequest={handleReverseGeocodeFromMap}
        onCancel={handleMapCancel}
      />
      <View style={styles.content}>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>Addresses</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Add delivery addresses for orders
        </Text>

        <Pressable
          onPress={() => router.push(ROUTES.ADDRESS_BOOK)}
          style={[
            styles.useLocationBtn,
            {
              borderColor: colors.tint,
              backgroundColor: colors.tint + '12',
              marginBottom: h(20),
              flexDirection: 'row',
              alignItems: 'center',
            },
          ]}
        >
          <FontAwesome name="book" size={w(20)} color={colors.tint} style={{ marginRight: w(12) }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: w(15), fontWeight: '600', color: colors.tint }}>Address book</Text>
            <Text style={{ fontSize: w(12), color: colors.tabIconDefault, marginTop: h(2) }}>
              All saved addresses — tap one to set default delivery
            </Text>
          </View>
          <FontAwesome name="chevron-right" size={w(14)} color={colors.tint} />
        </Pressable>

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
                    {`${addr.addressLine1 || ''}${addr.addressLine2 ? `, ${addr.addressLine2}` : ''}`}
                  </Text>
                  <Text style={[styles.addrText, { color: colors.tabIconDefault }]}>
                    {`${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}`}
                  </Text>
                  {addr.contactNumber ? (
                    <Text style={[styles.addrText, { color: colors.tint, marginTop: h(4) }]}>
                      📞 {addr.contactNumber}
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
                GPS → adjust on map
              </Text>
            </Pressable>
            <Pressable
              onPress={handlePickOnMap}
              style={[
                styles.useLocationBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.cardBg,
                  marginBottom: h(12),
                },
              ]}
            >
              <FontAwesome
                name="map-marker"
                size={w(20)}
                color={colors.tint}
                style={{ marginRight: w(12) }}
              />
              <Text
                style={{
                  fontSize: w(15),
                  fontWeight: '600',
                  color: colors.text,
                }}
              >
                Pick on map
              </Text>
            </Pressable>
            <Text
              style={{
                fontSize: w(11),
                color: colors.tabIconDefault,
                marginBottom: h(12),
                lineHeight: w(16),
              }}
            >
              Map: OpenStreetMap tiles. Address lookup uses your account on our server (no API keys in
              the map).
            </Text>
            {resolvedDisplayName ? (
              <Text
                style={{
                  fontSize: w(13),
                  color: colors.tabIconDefault,
                  marginBottom: h(12),
                  lineHeight: w(19),
                }}
              >
                Selected: {resolvedDisplayName}
              </Text>
            ) : null}
            <Input
              label="Address line 1"
              placeholder="House no., building, street"
              value={addressLine1}
              onChangeText={setAddressLine1}
              leftIcon="home"
              error={error}
            />
            <Input
              label="Address line 2 (optional)"
              placeholder="Area, landmark"
              value={addressLine2}
              onChangeText={setAddressLine2}
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
