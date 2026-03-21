import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { API_ENDPOINTS } from '@/constants/api';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { api } from '@/services/api.service';
import { getBanCheckOptionsForFollowedGames } from '@/utils/banCheckFollowedGames';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function BanCheckScreen() {
  const { user, isAuthenticated } = useAuth();
  const gamesForBanCheck = useMemo(
    () => getBanCheckOptionsForFollowedGames(user?.selectedGames),
    [user?.selectedGames]
  );

  const [selectedGame, setSelectedGame] = useState<string>(
    () => gamesForBanCheck[0]?.apiGame ?? 'freefire'
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uid, setUid] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (gamesForBanCheck.length === 0) return;
    if (!gamesForBanCheck.some((g) => g.apiGame === selectedGame)) {
      setSelectedGame(gamesForBanCheck[0].apiGame);
    }
  }, [gamesForBanCheck, selectedGame]);

  useEffect(() => {
    setResult(null);
  }, [selectedGame, uid]);

  const scheme = useColorScheme() ?? 'dark';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const selectedLabel =
    gamesForBanCheck.find((g) => g.apiGame === selectedGame)?.label ?? 'Select game';

  const handleCheck = async () => {
    if (gamesForBanCheck.length === 0) {
      Alert.alert(
        'No games for ban check',
        'Follow a game in your list that supports ban check (e.g. Free Fire, BGMI), then try again.'
      );
      return;
    }
    if (!uid) {
      Alert.alert('Error', 'Please enter a UID');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const params: Record<string, string> = { uid: uid.trim() };
      if (selectedGame !== 'freefire') {
        params.game = selectedGame;
      }
      const response: any = await api.get(API_ENDPOINTS.ANTIHACK.CHECK_BANNED, params);

      setResult(response);
    } catch (error: any) {
      console.error('Ban check failed:', error);
      Alert.alert('Error', error.message || 'Failed to check ban status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Gaming Account Ban Check',
          headerTitleStyle: { color: colors.text },
          headerStyle: { backgroundColor: colors.background },
        }}
      />
      <ScrollView contentContainerStyle={[styles.container, { padding: w(20) }]}>
        <Text style={[styles.title, { color: colors.text, fontSize: w(24), marginBottom: h(8) }]}>
          Check Ban Status
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: colors.tabIconDefault, fontSize: w(14), marginBottom: h(24) },
          ]}
        >
          Verify if your gaming account is flagged for cheating or hacking.
        </Text>

        <View style={styles.form}>
          {gamesForBanCheck.length === 0 ? (
            <View style={{ marginBottom: h(16) }}>
              <Text
                style={{
                  color: colors.tabIconDefault,
                  fontSize: w(14),
                  lineHeight: w(20),
                  marginBottom: h(12),
                }}
              >
                {isAuthenticated
                  ? 'Only games you follow — and that support ban check — appear here. Add them under your game list first.'
                  : 'Sign in and follow your games; this list will match what you follow.'}
              </Text>
              <Button
                title={isAuthenticated ? 'Choose games' : 'Log in'}
                onPress={() =>
                  router.push(isAuthenticated ? ROUTES.SELECT_GAMES : ROUTES.LOGIN)
                }
                fullWidth
              />
            </View>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.text, fontSize: w(14), marginBottom: h(8) }]}>
                Select Game
              </Text>
              <Pressable
                onPress={() => setPickerOpen(true)}
                style={[
                  styles.dropdownTrigger,
                  {
                    backgroundColor: colors.tint,
                    borderRadius: w(14),
                    paddingVertical: h(14),
                    paddingHorizontal: w(16),
                    marginBottom: h(16),
                  },
                ]}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: w(16),
                    fontWeight: '700',
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {selectedLabel}
                </Text>
                <FontAwesome name="chevron-down" size={w(14)} color="#fff" />
              </Pressable>

              <Input
                label="Player UID"
                placeholder="Enter your game UID"
                value={uid}
                onChangeText={setUid}
                keyboardType="numeric"
                leftIcon="id-card"
              />

              <Button
                title={isLoading ? 'Checking...' : 'Check Status'}
                onPress={handleCheck}
                disabled={isLoading}
                fullWidth
                style={{ marginTop: h(16) }}
              />
            </>
          )}
        </View>

        {result && (
          <View
            style={[
              styles.resultCard,
              {
                backgroundColor: colors.cardBg,
                marginTop: h(32),
                padding: w(20),
                borderRadius: w(16),
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
          >
            <View style={{ alignItems: 'center', marginBottom: h(16) }}>
              <FontAwesome
                name={result.data?.is_banned === 1 ? 'times-circle' : 'check-circle'}
                size={w(48)}
                color={result.data?.is_banned === 1 ? '#dc3545' : '#28a745'}
              />
              <Text
                style={[
                  styles.resultStatus,
                  {
                    fontSize: w(20),
                    fontWeight: 'bold',
                    marginTop: h(8),
                    color: result.data?.is_banned === 1 ? '#dc3545' : '#28a745',
                  },
                ]}
              >
                {result.data?.is_banned === 1 ? 'ACCOUNT BANNED' : 'ACCOUNT CLEAN'}
              </Text>
            </View>

            <View
              style={[
                styles.resultDetail,
                { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: h(16) },
              ]}
            >
              <View style={styles.detailRow}>
                <Text style={{ color: colors.tabIconDefault, fontSize: w(14) }}>UID:</Text>
                <Text style={{ color: colors.text, fontSize: w(14), fontWeight: '600' }}>{uid}</Text>
              </View>
              <View style={[styles.detailRow, { marginTop: h(8) }]}>
                <Text style={{ color: colors.tabIconDefault, fontSize: w(14) }}>Game:</Text>
                <Text style={{ color: colors.text, fontSize: w(14), fontWeight: '600' }}>
                  {selectedLabel}
                </Text>
              </View>
              {result.message && (
                <View style={[styles.detailRow, { marginTop: h(8) }]}>
                  <Text style={{ color: colors.tabIconDefault, fontSize: w(14) }}>Message:</Text>
                  <Text style={{ color: colors.text, fontSize: w(14), fontWeight: '600' }}>
                    {result.message}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.45)',
            paddingHorizontal: w(20),
          }}
        >
          <Pressable onPress={() => setPickerOpen(false)} style={StyleSheet.absoluteFillObject} />
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: w(14),
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
              maxHeight: h(360),
              alignSelf: 'center',
              width: w(320),
              maxWidth: '100%',
            }}
          >
            <Text
              style={{
                paddingVertical: h(12),
                paddingHorizontal: w(16),
                fontSize: w(13),
                fontWeight: '600',
                color: colors.tabIconDefault,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              Followed games — ban check
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {gamesForBanCheck.map((g, index) => (
                <Pressable
                  key={g.apiGame}
                  onPress={() => {
                    setSelectedGame(g.apiGame);
                    setPickerOpen(false);
                  }}
                  style={{
                    paddingVertical: h(14),
                    paddingHorizontal: w(16),
                    borderBottomWidth: index === gamesForBanCheck.length - 1 ? 0 : 1,
                    borderBottomColor: colors.border,
                    backgroundColor:
                      selectedGame === g.apiGame ? colors.cardBg : colors.background,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: w(16), fontWeight: '600' }}>
                    {g.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  label: {
    fontWeight: '500',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultStatus: {
    textAlign: 'center',
  },
  resultDetail: {
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
