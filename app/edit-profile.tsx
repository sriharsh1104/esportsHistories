import { BackButton, Button, CustomPhoneInput, Input, Screen } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useSelectedGames } from '@/context/SelectedGamesContext';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import { ALL_GAMES } from '@/data/games';
import type { GameProfile } from '@/types/auth';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

export default function EditProfileScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { user, updateProfile } = useAuth();
  const { selectedGameIds } = useSelectedGames();
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [gameProfiles, setGameProfiles] = useState<GameProfile[]>([]);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGameId, setNewGameId] = useState('');
  const [newGameName, setNewGameName] = useState('');
  const [newGameUid, setNewGameUid] = useState('');
  const dispatch = useAppDispatch();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setUpiId(user.upiId || '');
      setGameProfiles(user.gameProfiles || []);
    }
  }, [user]);

  const styles = useMemo(
    () => ({
      content: { flex: 1, paddingTop: h(48) },
      title: { fontSize: w(28), fontWeight: '700' as const, marginBottom: h(8) },
      subtitle: { fontSize: w(16), marginBottom: h(32) },
      form: { flex: 1 },
      btn: { marginTop: h(24) },
      sectionTitle: {
        fontSize: w(14),
        fontWeight: '600' as const,
        marginBottom: h(8),
        color: colors.tabIconDefault,
      },
      gameCard: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        padding: w(14),
        borderRadius: w(12),
        marginBottom: h(10),
        borderWidth: 1,
      },
      addBtn: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: h(12),
        paddingHorizontal: w(16),
        borderRadius: w(12),
        borderWidth: 1,
        borderStyle: 'dashed' as const,
        marginBottom: h(16),
      },
      gameOption: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        padding: w(14),
        borderRadius: w(10),
        marginBottom: h(8),
      },
    }),
    [w, h, colors]
  );

  const handleAddGameProfile = () => {
    if (!newGameId.trim() || !newGameName.trim() || !newGameUid.trim()) {
      setError('Select game, enter in-game name and UID');
      return;
    }
    if (gameProfiles.some((gp) => gp.gameId === newGameId)) {
      setError('This game is already added');
      return;
    }
    setGameProfiles([
      ...gameProfiles,
      {
        id: Date.now().toString(),
        gameId: newGameId,
        gameName: newGameName.trim(),
        gameUid: newGameUid.trim(),
      },
    ]);
    setNewGameId('');
    setNewGameName('');
    setNewGameUid('');
    setError('');
    setShowAddModal(false);
  };

  const handleRemoveGameProfile = (id: string) => {
    Alert.alert('Remove game profile', 'Remove this game profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setGameProfiles((prev) => prev.filter((gp) => gp.id !== id)),
      },
    ]);
  };

  const getGameName = (gameId: string) =>
    ALL_GAMES.find((g) => g.id === gameId)?.name ?? gameId;

  const followedGames = useMemo(
    () => ALL_GAMES.filter((g) => selectedGameIds.includes(g.id)),
    [selectedGameIds]
  );

  const gamesAvailableToAdd = followedGames.filter(
    (g) => !gameProfiles.some((gp) => gp.gameId === g.id)
  );

  const handleSubmit = async () => {
    setError('');
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    dispatch(showLoader());
    try {
      await updateProfile({
        displayName: displayName.trim(),
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        upiId: upiId.trim() || undefined,
        gameProfiles,
        ...(from === 'signup' && { onboardingStep: 'games' as const }),
      });
      if (from === 'signup') {
        router.replace(ROUTES.SELECT_GAMES_ONBOARDING);
      } else {
        router.back();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      dispatch(hideLoader());
    }
  };

  if (!user) return null;

  return (
    <Screen keyboardAvoid padded maxForm>
      <View style={styles.content}>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Update your profile information
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Input
            label="Display name"
            placeholder="Username / handle"
            value={displayName}
            onChangeText={setDisplayName}
            leftIcon="user"
            error={error}
          />
          <Input
            label="Full name"
            placeholder="Your full name (optional)"
            value={fullName}
            onChangeText={setFullName}
            leftIcon="pencil"
          />
          <CustomPhoneInput
            label="Phone number"
            placeholder="+91 9876543210"
            value={phone}
            onChangeText={setPhone}
          />
          <Input
            label="UPI ID"
            placeholder="user@upi"
            value={upiId}
            onChangeText={setUpiId}
            autoCapitalize="none"
            leftIcon="credit-card"
          />

          <Text style={[styles.sectionTitle, { marginTop: h(20) }]}>
            GAME PROFILES (OPTIONAL)
          </Text>
          <Text
            style={{
              fontSize: w(12),
              color: colors.tabIconDefault,
              marginBottom: h(12),
              lineHeight: w(18),
            }}
          >
            Add your game UID and in-game name so friends can easily find and add you
          </Text>

          {gameProfiles.map((gp) => (
            <View
              key={gp.id}
              style={[
                styles.gameCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: w(14), fontWeight: '600', color: colors.text }}>
                  {getGameName(gp.gameId)}
                </Text>
                <Text style={{ fontSize: w(12), color: colors.tabIconDefault, marginTop: h(4) }}>
                  {gp.gameName} • UID: {gp.gameUid}
                </Text>
              </View>
              <Pressable
                onPress={() => handleRemoveGameProfile(gp.id)}
                style={{ padding: w(8) }}
              >
                <FontAwesome name="trash" size={w(18)} color="#dc3545" />
              </Pressable>
            </View>
          ))}

          {followedGames.length === 0 ? (
            <View
              style={[
                styles.addBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.inputBg,
                  opacity: 0.8,
                },
              ]}
            >
              <Text style={{ fontSize: w(13), color: colors.tabIconDefault }}>
                Select games to follow in Settings first, then add profiles here
              </Text>
            </View>
          ) : gamesAvailableToAdd.length === 0 ? (
            <View
              style={[
                styles.addBtn,
                { borderColor: colors.border, backgroundColor: colors.inputBg },
              ]}
            >
              <Text style={{ fontSize: w(13), color: colors.tabIconDefault }}>
                You've added profiles for all followed games
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setShowAddModal(true);
                setError('');
              }}
              style={[
                styles.addBtn,
                { borderColor: colors.tint, backgroundColor: colors.tint + '12' },
              ]}
            >
              <FontAwesome
                name="plus-circle"
                size={w(20)}
                color={colors.tint}
                style={{ marginRight: w(10) }}
              />
              <Text style={{ fontSize: w(14), fontWeight: '600', color: colors.tint }}>
                Add game profile
              </Text>
            </Pressable>
          )}

          <Button
            title="Save changes"
            onPress={handleSubmit}
            fullWidth
            style={styles.btn}
          />
        </ScrollView>
      </View>

      <Modal visible={showAddModal} transparent animationType="slide">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setShowAddModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.cardBg,
              borderTopLeftRadius: w(20),
              borderTopRightRadius: w(20),
              padding: w(24),
              maxHeight: '80%',
            }}
          >
            <Text
              style={{
                fontSize: w(18),
                fontWeight: '700',
                color: colors.text,
                marginBottom: h(16),
              }}
            >
              Add game profile
            </Text>
            <Text style={{ fontSize: w(13), color: colors.tabIconDefault, marginBottom: h(12) }}>
              Select game (from games you follow)
            </Text>
            <ScrollView style={{ maxHeight: h(140), marginBottom: h(16) }}>
              {gamesAvailableToAdd.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => setNewGameId((prev) => (prev === g.id ? '' : g.id))}
                  style={[
                    styles.gameOption,
                    {
                      backgroundColor:
                        newGameId === g.id ? colors.tint + '25' : colors.inputBg,
                      borderWidth: newGameId === g.id ? 2 : 1,
                      borderColor: newGameId === g.id ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: w(14),
                      fontWeight: newGameId === g.id ? '600' : '500',
                      color: newGameId === g.id ? colors.tint : colors.text,
                    }}
                  >
                    {g.name}
                  </Text>
                  {newGameId === g.id && (
                    <FontAwesome
                      name="check"
                      size={w(16)}
                      color={colors.tint}
                      style={{ marginLeft: w(8) }}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <Input
              label="In-game name"
              placeholder="Your username in the game"
              value={newGameName}
              onChangeText={setNewGameName}
              leftIcon="gamepad"
            />
            <Input
              label="Game UID"
              placeholder="Your unique ID in the game"
              value={newGameUid}
              onChangeText={setNewGameUid}
              leftIcon="hashtag"
              keyboardType="default"
            />
            {error ? (
              <Text style={{ color: '#dc3545', fontSize: w(12), marginBottom: h(8) }}>
                {error}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: w(12), marginTop: h(8) }}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setShowAddModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Add"
                onPress={handleAddGameProfile}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
