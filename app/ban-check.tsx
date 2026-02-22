import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import { api } from '@/services/api.service';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

const SUPPORTED_GAMES = [
  { label: 'Free Fire', value: 'freefire' },
];

export default function BanCheckScreen() {
  const [selectedGame, setSelectedGame] = useState('freefire');
  const [uid, setUid] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const scheme = useColorScheme() ?? 'dark';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const handleCheck = async () => {
    if (!uid) {
      Alert.alert('Error', 'Please enter a UID');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response: any = await api.post('/antihack/check', {
        game: selectedGame,
        uid: uid,
        lang: 'en',
      });

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
          headerStyle: { backgroundColor: colors.background }
        }} 
      />
      <ScrollView contentContainerStyle={[styles.container, { padding: w(20) }]}>
        <Text style={[styles.title, { color: colors.text, fontSize: w(24), marginBottom: h(8) }]}>
          Check Ban Status
        </Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault, fontSize: w(14), marginBottom: h(24) }]}>
          Verify if your gaming account is flagged for cheating or hacking.
        </Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text, fontSize: w(14), marginBottom: h(8) }]}>
            Select Game
          </Text>
          <View style={[styles.selectorContainer, { marginBottom: h(16) }]}>
            {SUPPORTED_GAMES.map((game) => (
              <Button
                key={game.value}
                title={game.label}
                onPress={() => setSelectedGame(game.value)}
                variant={selectedGame === game.value ? 'primary' : 'outline'}
                style={{ flex: 1 }}
              />
            ))}
          </View>

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
        </View>

        {result && (
          <View style={[styles.resultCard, { backgroundColor: colors.cardBg, marginTop: h(32), padding: w(20), borderRadius: w(16), borderColor: colors.border, borderWidth: 1 }]}>
             <View style={{ alignItems: 'center', marginBottom: h(16) }}>
                <FontAwesome 
                    name={result.data?.is_banned === 1 ? 'times-circle' : 'check-circle'} 
                    size={w(48)} 
                    color={result.data?.is_banned === 1 ? '#dc3545' : '#28a745'} 
                />
                <Text style={[styles.resultStatus, { fontSize: w(20), fontWeight: 'bold', marginTop: h(8), color: result.data?.is_banned === 1 ? '#dc3545' : '#28a745' }]}>
                    {result.data?.is_banned === 1 ? 'ACCOUNT BANNED' : 'ACCOUNT CLEAN'}
                </Text>
             </View>
             
             <View style={[styles.resultDetail, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: h(16) }]}>
                <View style={styles.detailRow}>
                    <Text style={{ color: colors.tabIconDefault, fontSize: w(14) }}>UID:</Text>
                    <Text style={{ color: colors.text, fontSize: w(14), fontWeight: '600' }}>{uid}</Text>
                </View>
                <View style={[styles.detailRow, { marginTop: h(8) }]}>
                    <Text style={{ color: colors.tabIconDefault, fontSize: w(14) }}>Game:</Text>
                    <Text style={{ color: colors.text, fontSize: w(14), fontWeight: '600' }}>{SUPPORTED_GAMES.find(g => g.value === selectedGame)?.label}</Text>
                </View>
                {result.message && (
                    <View style={[styles.detailRow, { marginTop: h(8) }]}>
                        <Text style={{ color: colors.tabIconDefault, fontSize: w(14) }}>Message:</Text>
                        <Text style={{ color: colors.text, fontSize: w(14), fontWeight: '600' }}>{result.message}</Text>
                    </View>
                )}
             </View>
          </View>
        )}
      </ScrollView>
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
  selectorContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  resultCard: {
    shadowColor: "#000",
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
  }
});
