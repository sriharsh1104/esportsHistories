import { BackButton, Button, CustomPhoneInput, Input, Screen } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import type { UserBio } from '@/types/auth';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { createElement, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiBaseUrl } from '@/services/api.service';

const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer not to say'] as const;

export default function EditProfileScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { user, refreshUser, updateProfile, uploadAvatar } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [dobInput, setDobInput] = useState('');
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);
  /** From POST `/profile/avatar`; sent as `profileImageUploadId` / `uploadId` on PUT `/profile` when saving. */
  const [pendingProfileImageUploadId, setPendingProfileImageUploadId] = useState<string | null>(null);
  const [didInitForm, setDidInitForm] = useState(false);

  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [genderError, setGenderError] = useState('');
  const [dobError, setDobError] = useState('');

  const [error, setError] = useState('');
  const dispatch = useAppDispatch();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();

  function getProfileImageUrl(profileImage?: string): string | null {
    const raw = String(profileImage ?? '').trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const apiBase = String(getApiBaseUrl() ?? '').trim();
    if (!apiBase) return raw;
    const trimmed = apiBase.replace(/\/$/, '');
    const publicBase = trimmed.replace(/\/api\/?$/i, '');
    return `${publicBase}${raw.startsWith('/') ? '' : '/'}${raw}`;
  }

  function parseBioGenderAge(bio?: UserBio | string): UserBio {
    if (!bio) return {};
    if (typeof bio === 'object') return bio;
    try {
      return JSON.parse(bio) as UserBio;
    } catch {
      return {};
    }
  }

  function formatDob(date: Date | null): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  function parseDobInput(value: string): Date | null {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (!day || !month || !year) return null;
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }
    if (parsed > new Date()) return null;
    return parsed;
  }

  function formatDobInputLive(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  /** `YYYY-MM-DD` in local time for HTML `<input type="date" />` (web). */
  function dateToHtmlInputValue(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function htmlInputValueToDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const y = Number(match[1]);
    const mo = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(y, mo - 1, day);
    if (
      parsed.getFullYear() !== y ||
      parsed.getMonth() !== mo - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }
    if (parsed > new Date()) return null;
    return parsed;
  }

  useEffect(() => {
    refreshUser().catch(() => {
      // Keep cached data if profile fetch fails.
    });
  }, [refreshUser]);

  useEffect(() => {
    // Initialize once from the current profile; do not clobber in-progress edits
    // when `user` changes (e.g. after avatar upload).
    if (!user || didInitForm) return;
    setEmail(user.email || '');
    setName(user.fullName || user.displayName || '');
    setPhone(user.phone || '');
    const genderAge = parseBioGenderAge(user.bio);
    setGender(genderAge.gender ? String(genderAge.gender) : '');
    const storedDob = genderAge.dateOfBirth ?? genderAge.dob;
    if (storedDob) {
      const parsedDob = new Date(storedDob);
      const safeDob = Number.isNaN(parsedDob.getTime()) ? null : parsedDob;
      setDob(safeDob);
      setDobInput(formatDob(safeDob));
    } else {
      setDob(null);
      setDobInput('');
    }
    setDidInitForm(true);
  }, [user, didInitForm]);

  const styles = useMemo(
    () => ({
      content: { flex: 1, paddingTop: h(48) },
      title: { fontSize: w(28), fontWeight: '700' as const, marginBottom: h(8) },
      subtitle: { fontSize: w(16), marginBottom: h(32) },
      form: { flex: 1 },
      btn: { marginTop: h(24) },
      avatarRow: { alignItems: 'center' as const, marginBottom: h(20) },
      avatar: {
        width: w(80),
        height: w(80),
        borderRadius: w(40),
        backgroundColor: colors.tint,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        position: 'relative' as const,
        overflow: 'hidden' as const,
      },
      avatarText: { fontSize: w(32), fontWeight: '700' as const, color: '#fff' },
      editPhotoBadge: {
        position: 'absolute' as const,
        bottom: 0,
        right: 0,
        width: w(26),
        height: w(26),
        borderRadius: w(13),
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      avatarHint: { fontSize: w(12), marginTop: h(10) },
    }),
    [w, h, colors]
  );

  const compressAvatarUnder50kb = async (uri: string): Promise<{ uri: string; mimeType: string }> => {
    // Expo ImageManipulator writes a new file; use JPEG for consistent size control.
    const TARGET_BYTES = 50 * 1024;
    const minQuality = 0.15;
    let quality = 0.85;
    let width = 640;
    let currentUri = uri;

    // In case we can't read size reliably (some platforms), still run a couple of passes.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const manipulated = await ImageManipulator.manipulateAsync(
        currentUri,
        [{ resize: { width } }],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      currentUri = manipulated.uri;

      let size: number | null = null;
      try {
        const res = await fetch(currentUri);
        const blob = await res.blob();
        size = blob.size;
      } catch {
        size = null;
      }

      if (size != null && size <= TARGET_BYTES) {
        return { uri: currentUri, mimeType: 'image/jpeg' };
      }

      // Reduce quality first, then scale down.
      quality = Math.max(minQuality, quality - 0.15);
      if (quality <= minQuality + 1e-6) {
        width = Math.max(320, Math.round(width * 0.85));
      }

      if (size == null && attempt >= 2) {
        // Best-effort: after a few passes, stop to avoid over-processing when size is unknown.
        return { uri: currentUri, mimeType: 'image/jpeg' };
      }
    }

    return { uri: currentUri, mimeType: 'image/jpeg' };
  };

  const handlePickAvatar = async () => {
    setAvatarError('');
    dispatch(showLoader());
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setAvatarError('Media library permission is required to change your photo.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setAvatarError('No image selected.');
        return;
      }

      const compressed = await compressAvatarUnder50kb(asset.uri);
      // Optimistic UI preview immediately.
      setAvatarPreviewUri(compressed.uri);

      const fileName = `avatar-${Date.now()}.jpg`;
      const mimeType = compressed.mimeType;

      const uploadId = await uploadAvatar({
        uri: compressed.uri,
        fileName,
        mimeType,
      });
      if (uploadId) setPendingProfileImageUploadId(uploadId);
    } catch (e) {
      // If upload fails, revert optimistic preview.
      setAvatarPreviewUri(null);
      setAvatarError(e instanceof Error ? e.message : 'Failed to upload avatar');
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleSubmit = async () => {
    setError('');
    setAvatarError('');
    setNameError('');
    setPhoneError('');
    setGenderError('');
    setDobError('');

    const nameTrimmed = name.trim();
    const phoneTrimmed = phone.trim();
    const genderTrimmed = gender.trim();
    const parsedDob = dob ?? parseDobInput(dobInput);

    if (!nameTrimmed) {
      setNameError('Name is required');
      return;
    }
    if (!phoneTrimmed) {
      setPhoneError('Phone number is required');
      return;
    }
    if (!genderTrimmed) {
      setGenderError('Gender is required');
      return;
    }
    if (!parsedDob) {
      setDobError('Date of birth is required');
      return;
    }
    dispatch(showLoader());
    try {
      await updateProfile({
        fullName: nameTrimmed || undefined,
        phone: phoneTrimmed || undefined,
        bio: {
          gender: genderTrimmed,
          dateOfBirth: parsedDob.toISOString(),
        },
        ...(pendingProfileImageUploadId
          ? { profileImageUploadId: pendingProfileImageUploadId }
          : {}),
        ...(from === 'signup' && { onboardingStep: 'done' as const }),
      });

      setPendingProfileImageUploadId(null);
      if (from === 'signup') {
        router.replace(ROUTES.HOME);
      } else {
        router.replace(ROUTES.PROFILE);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      dispatch(hideLoader());
    }
  };

  const applyPickedDob = (selectedDate: Date) => {
    setDob(selectedDate);
    setDobInput(formatDob(selectedDate));
    setDobError('');
  };

  const handleDobChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDobPicker(false);
    }
    if (event.type !== 'set' || !selectedDate) return;
    applyPickedDob(selectedDate);
  };

  const openDobPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dob ?? new Date(2000, 0, 1),
        mode: 'date',
        maximumDate: new Date(),
        onChange: handleDobChange,
      });
      return;
    }
    setShowDobPicker(true);
  };

  if (!user) return <Redirect href={ROUTES.LOGIN} />;

  return (
    <>
      <Screen keyboardAvoid padded maxForm scroll={false}>
        <View style={[styles.content, { flex: 1 }]}>
          <BackButton />
          <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
          <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
            Update your profile information
          </Text>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: h(24) }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          <View style={styles.avatarRow}>
            <Pressable onPress={handlePickAvatar} style={styles.avatar}>
              {(() => {
                const uri = avatarPreviewUri ?? getProfileImageUrl(user.profileImage ?? user.avatarUrl);
                if (uri) {
                  return (
                    <Image
                      source={{ uri }}
                      style={{ width: '100%', height: '100%', borderRadius: styles.avatar.borderRadius as number }}
                      resizeMode="cover"
                    />
                  );
                }
                return (
                  <Text style={styles.avatarText}>
                    {(user.fullName || user.displayName || 'U').charAt(0).toUpperCase()}
                  </Text>
                );
              })()}
              <View style={styles.editPhotoBadge}>
                <FontAwesome name="camera" size={w(12)} color="#fff" />
              </View>
            </Pressable>
            <Text style={[styles.avatarHint, { color: colors.tabIconDefault }]}>
              Tap photo to change
            </Text>
            {!!avatarError && (
              <Text style={{ color: '#dc3545', marginTop: h(6), fontSize: w(12) }}>
                {avatarError}
              </Text>
            )}
          </View>

          <Input
            label="Email"
            value={email}
            editable={false}
            leftIcon="envelope"
          />
          <Input
            label="Name"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
            leftIcon="pencil"
            error={nameError || undefined}
            autoComplete="name"
            autoCapitalize="words"
          />
          <CustomPhoneInput
            label="Phone number"
            placeholder="+91 9876543210"
            value={phone}
            onChangeText={setPhone}
            error={phoneError || undefined}
          />

          <Input
            label="Gender"
            placeholder="Select gender"
            value={gender}
            editable={false}
            rightIcon="chevron-down"
            onRightIconPress={() => setShowGenderPicker(true)}
            leftIcon="user"
            error={genderError || undefined}
          />

          <Input
            label="Date of birth"
            placeholder="DD/MM/YYYY"
            value={dobInput}
            onChangeText={(text) => {
              setDobInput(formatDobInputLive(text));
              setDobError('');
            }}
            onBlur={() => {
              if (!dobInput.trim()) {
                setDob(null);
                return;
              }
              const parsed = parseDobInput(dobInput);
              if (parsed) {
                setDob(parsed);
                setDobInput(formatDob(parsed));
                setDobError('');
              } else {
                setDob(null);
                setDobError('Use format DD/MM/YYYY');
              }
            }}
            keyboardType="number-pad"
            rightIcon="calendar"
            onRightIconPress={openDobPicker}
            leftIcon="calendar"
            error={dobError || undefined}
          />

          {!!error && (
            <Text style={{ color: '#dc3545', marginBottom: h(8), fontSize: w(12) }}>
              {error}
            </Text>
          )}

          <Button
            title="Save changes"
            onPress={handleSubmit}
            fullWidth
            style={styles.btn}
          />
          </ScrollView>
        </View>
      </Screen>

      <Modal
        visible={showGenderPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
            paddingHorizontal: w(20),
          }}
        >
          <Pressable
            onPress={() => setShowGenderPicker(false)}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: w(14),
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
              width: w(300),
              maxWidth: '90%',
              alignSelf: 'center',
            }}
          >
            {GENDER_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  setGender(option);
                  setGenderError('');
                  setShowGenderPicker(false);
                }}
                style={{
                  paddingVertical: h(14),
                  paddingHorizontal: w(16),
                  borderBottomWidth: option === GENDER_OPTIONS[GENDER_OPTIONS.length - 1] ? 0 : 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, fontSize: w(15), textTransform: 'capitalize' }}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {Platform.OS !== 'android' && (
        <Modal
          visible={showDobPicker}
          transparent
          animationType="slide"
          {...(Platform.OS === 'ios' ? { presentationStyle: 'overFullScreen' as const } : {})}
          onRequestClose={() => setShowDobPicker(false)}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss date picker"
              onPress={() => setShowDobPicker(false)}
              style={StyleSheet.absoluteFillObject}
            />
            <View
              pointerEvents="box-none"
              style={{
                backgroundColor: colors.cardBg,
                borderTopLeftRadius: w(16),
                borderTopRightRadius: w(16),
                paddingBottom: Math.max(insets.bottom, h(12)),
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: w(16),
                  paddingVertical: h(12),
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                }}
              >
                <Pressable onPress={() => setShowDobPicker(false)} hitSlop={12}>
                  <Text style={{ color: colors.tabIconDefault, fontSize: w(16) }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={() => setShowDobPicker(false)} hitSlop={12}>
                  <Text style={{ color: colors.accent, fontSize: w(16), fontWeight: '600' as const }}>
                    Done
                  </Text>
                </Pressable>
              </View>
              <View
                style={{
                  width: '100%',
                  minHeight: Platform.OS === 'web' ? h(72) : 216,
                  height: Platform.OS === 'web' ? undefined : 216,
                  alignItems: 'stretch',
                  justifyContent: 'center',
                  paddingHorizontal: w(16),
                  paddingBottom: Platform.OS === 'web' ? h(16) : 0,
                }}
              >
                {Platform.OS === 'web' ? (
                  createElement('input', {
                    type: 'date',
                    'aria-label': 'Date of birth',
                    value: dateToHtmlInputValue(dob ?? new Date(2000, 0, 1)),
                    max: dateToHtmlInputValue(new Date()),
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                      const next = htmlInputValueToDate(e.target.value);
                      if (next) applyPickedDob(next);
                    },
                    style: {
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: 14,
                      fontSize: 16,
                      borderRadius: 12,
                      border: `1.5px solid ${colors.border}`,
                      backgroundColor: colors.inputBg,
                      color: colors.text,
                    },
                  })
                ) : (
                  <DateTimePicker
                    value={dob ?? new Date(2000, 0, 1)}
                    mode="date"
                    display="spinner"
                    themeVariant={scheme === 'dark' ? 'dark' : 'light'}
                    textColor={colors.text}
                    maximumDate={new Date()}
                    onChange={handleDobChange}
                    style={{ width: '100%', height: 216 }}
                  />
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
