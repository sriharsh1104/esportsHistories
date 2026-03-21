import { BackButton, Button, Input, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useAppDispatch } from '@/store/hooks';
import { hideLoader, showLoader } from '@/store/slices/loaderSlice';
import type { GameProfile } from '@/types/auth';
import {
  normGameKey,
  selectedGamesToEntries,
} from '@/utils/gameSelection';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

function isUnsavedLocalGameProfileId(id: string): boolean {
  return /^\d{10,16}$/.test(id.trim());
}

function profileMatchesFollowedGame(
  gp: GameProfile,
  selected: Array<{ id: string; name: string }>
): boolean {
  if (selected.length === 0) return false;
  const pid = normGameKey(gp.gameId);
  const pname = normGameKey(gp.gameName || '');
  return selected.some((s) => {
    const sid = normGameKey(s.id);
    const sname = normGameKey(s.name);
    return (
      (pid.length > 0 && (pid === sid || pid === sname)) ||
      (pname.length > 0 && (pname === sname || pname === sid))
    );
  });
}

function hasSavedUid(gp: GameProfile): boolean {
  return String(gp.gameUid ?? '').trim().length > 0;
}

export default function GameProfilesScreen() {
  const { user, updateProfile, refreshUser, deleteGameProfile } = useAuth();
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [gameProfiles, setGameProfiles] = useState<GameProfile[]>([]);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GameProfile | null>(null);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [editTarget, setEditTarget] = useState<GameProfile | null>(null);
  const [editUidDraft, setEditUidDraft] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [newGameId, setNewGameId] = useState('');
  const [newGameUid, setNewGameUid] = useState('');
  const dispatch = useAppDispatch();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const selectedGamesList = useMemo(
    () => selectedGamesToEntries(user?.selectedGames),
    [user?.selectedGames]
  );

  React.useEffect(() => {
    if (!user) return;
    const fromServer = (user.gameProfiles ?? []).filter(
      (gp) => profileMatchesFollowedGame(gp, selectedGamesList) && hasSavedUid(gp)
    );

    setGameProfiles((prev) => {
      const unsavedLocals = prev.filter((p) => isUnsavedLocalGameProfileId(p.id));
      if (unsavedLocals.length === 0) {
        return fromServer;
      }
      const seen = new Set(fromServer.map((p) => `${normGameKey(p.gameId)}-${p.gameUid.trim()}`));
      const extra = unsavedLocals.filter(
        (p) => !seen.has(`${normGameKey(p.gameId)}-${p.gameUid.trim()}`)
      );
      return [...fromServer, ...extra];
    });
  }, [user?.id, user?.gameProfiles, selectedGamesList]);

  useFocusEffect(
    React.useCallback(() => {
      refreshUser().catch(() => {
        // Keep cached data if refresh fails.
      });
    }, [refreshUser])
  );

  const styles = useMemo(
    () => ({
      content: { flex: 1, paddingTop: h(48) },
      title: { fontSize: w(28), fontWeight: '700' as const, marginBottom: h(8) },
      subtitle: { fontSize: w(16), marginBottom: h(32) },
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

  const handleAddGameProfile = async () => {
    if (!newGameId.trim() || !newGameUid.trim()) {
      setError('Select game and enter UID');
      return;
    }
    if (gameProfiles.some((gp) => normGameKey(gp.gameId) === normGameKey(newGameId))) {
      setError('This game is already added');
      return;
    }
    const selectedGame = selectedGamesList.find((g) => g.id === newGameId);
    if (!selectedGame) {
      setError('Selected game is invalid');
      return;
    }
    const uid = newGameUid.trim();
    const next: GameProfile[] = [
      ...gameProfiles.filter(
        (gp) => profileMatchesFollowedGame(gp, selectedGamesList) && hasSavedUid(gp)
      ),
      {
        id: Date.now().toString(),
        gameId: newGameId,
        gameName: selectedGame.name,
        gameUid: uid,
      },
    ];

    setError('');
    setIsAddingProfile(true);
    dispatch(showLoader());
    try {
      await updateProfile({ gameProfiles: next });
      await refreshUser();
      setNewGameId('');
      setNewGameUid('');
      setShowAddModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save to profile');
    } finally {
      setIsAddingProfile(false);
      dispatch(hideLoader());
    }
  };

  const openEditUidModal = (gp: GameProfile) => {
    setEditError('');
    setEditTarget(gp);
    setEditUidDraft(String(gp.gameUid ?? '').trim());
  };

  const handleSaveEditUid = async () => {
    const uid = editUidDraft.trim();
    if (!uid) {
      setEditError('Enter a UID');
      return;
    }
    if (!editTarget) return;
    setEditError('');
    setIsSavingEdit(true);
    dispatch(showLoader());
    try {
      const next = gameProfiles.map((p) =>
        p.id === editTarget.id ? { ...p, gameUid: uid } : p
      );
      const payload = next.filter(
        (gp) => profileMatchesFollowedGame(gp, selectedGamesList) && hasSavedUid(gp)
      );
      await updateProfile({ gameProfiles: payload });
      await refreshUser();
      setEditTarget(null);
      setEditUidDraft('');
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Could not update UID');
    } finally {
      setIsSavingEdit(false);
      dispatch(hideLoader());
    }
  };

  const runDeleteGameProfile = async (gp: GameProfile) => {
    if (!hasSavedUid(gp)) {
      setGameProfiles((prev) => prev.filter((x) => x.id !== gp.id));
      setDeleteTarget(null);
      return;
    }
    setIsDeletingProfile(true);
    dispatch(showLoader());
    try {
      await deleteGameProfile({
        gameUid: gp.gameUid,
        gameId: gp.gameId,
      });
      await refreshUser();
    } catch (e) {
      Alert.alert('Delete failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setIsDeletingProfile(false);
      dispatch(hideLoader());
      setDeleteTarget(null);
    }
  };

  const gamesAvailableToAdd = selectedGamesList.filter(
    (g) => !gameProfiles.some((gp) => normGameKey(gp.gameId) === normGameKey(g.id))
  );

  const handleSave = async () => {
    setError('');
    dispatch(showLoader());
    try {
      const payload = gameProfiles.filter(
        (gp) => profileMatchesFollowedGame(gp, selectedGamesList) && hasSavedUid(gp)
      );
      await updateProfile({ gameProfiles: payload });
      router.back();
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
        <Text style={[styles.title, { color: colors.text }]}>Game Profiles</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Only games you follow can have a profile here. Entries need a saved UID — empty API stubs for
          games you do not follow are hidden until you add and save.
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle]}>Your game profiles</Text>

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
                  {gp.gameName || gp.gameId}
                </Text>
                <Text style={{ fontSize: w(12), color: colors.tabIconDefault, marginTop: h(4) }}>
                  UID: {gp.gameUid}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: w(8) }}>
                <Pressable
                  onPress={() => openEditUidModal(gp)}
                  accessibilityLabel="Edit game UID"
                  style={{
                    padding: w(8),
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: w(8),
                  }}
                >
                  <FontAwesome name="pencil" size={w(18)} color={colors.tint} />
                </Pressable>
                <Pressable
                  onPress={() => setDeleteTarget(gp)}
                  accessibilityLabel="Delete game profile"
                  style={{
                    padding: w(8),
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: w(8),
                  }}
                >
                  <FontAwesome name="trash" size={w(18)} color="#dc3545" />
                </Pressable>
              </View>
            </View>
          ))}

          {selectedGamesList.length === 0 ? (
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
                You've added profiles for all selected games
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
            onPress={handleSave}
            fullWidth
            style={{ marginTop: h(24) }}
          />
        </ScrollView>
      </View>

      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'center',
            padding: w(24),
          }}
          onPress={() => !isDeletingProfile && setDeleteTarget(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.cardBg,
              borderRadius: w(16),
              padding: w(20),
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: w(17),
                fontWeight: '700',
                color: colors.text,
                marginBottom: h(10),
              }}
            >
              Remove game profile?
            </Text>
            {deleteTarget ? (
              <Text style={{ fontSize: w(14), color: colors.tabIconDefault, marginBottom: h(20) }}>
                {deleteTarget.gameName || deleteTarget.gameId}
                {hasSavedUid(deleteTarget) ? `\nUID: ${deleteTarget.gameUid.trim()}` : ''}
                {'\n\nThis will remove the profile from your account.'}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: w(12) }}>
              <Button
                title="No"
                variant="ghost"
                onPress={() => setDeleteTarget(null)}
                disabled={isDeletingProfile}
                style={{ flex: 1 }}
              />
              <Button
                title={isDeletingProfile ? '…' : 'Yes'}
                onPress={() => {
                  if (deleteTarget) void runDeleteGameProfile(deleteTarget);
                }}
                disabled={isDeletingProfile || !deleteTarget}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!editTarget} transparent animationType="slide">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
          onPress={() => !isSavingEdit && setEditTarget(null)}
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
                fontSize: w(18),
                fontWeight: '700',
                color: colors.text,
                marginBottom: h(8),
              }}
            >
              Edit game UID
            </Text>
            {editTarget ? (
              <Text
                style={{
                  fontSize: w(14),
                  color: colors.tabIconDefault,
                  marginBottom: h(16),
                }}
              >
                {editTarget.gameName || editTarget.gameId}
              </Text>
            ) : null}
            <Input
              label="Game UID"
              placeholder="Your unique ID in the game"
              value={editUidDraft}
              onChangeText={setEditUidDraft}
              leftIcon="hashtag"
              keyboardType="default"
            />
            {editError ? (
              <Text style={{ color: '#dc3545', fontSize: w(12), marginTop: h(8) }}>{editError}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: w(12), marginTop: h(20) }}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setEditTarget(null)}
                disabled={isSavingEdit}
                style={{ flex: 1 }}
              />
              <Button
                title={isSavingEdit ? 'Saving…' : 'Save'}
                onPress={() => void handleSaveEditUid()}
                disabled={isSavingEdit}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
                disabled={isAddingProfile}
                style={{ flex: 1 }}
              />
              <Button
                title={isAddingProfile ? 'Saving…' : 'Add'}
                onPress={() => void handleAddGameProfile()}
                disabled={isAddingProfile}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
