import { BackButton, Button, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/context/ResponsiveContext';
import { useSelectedGames } from '@/context/SelectedGamesContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

const MAX_GAMES = 10;

function GameChip({
  game,
  selected,
  onToggle,
  disabled,
}: {
  game: any;
  selected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  return (
    <Pressable
      onPress={() => !disabled && onToggle()}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: h(10),
        paddingHorizontal: w(14),
        borderRadius: w(12),
        backgroundColor: selected ? colors.tint : colors.border + '40',
        opacity: disabled && !selected ? 0.5 : pressed ? 0.9 : 1,
        marginRight: w(8),
        marginBottom: h(8),
      })}
    >
      <FontAwesome
        name={selected ? 'check-circle' : (game.icon as any) || 'gamepad'}
        size={w(14)}
        color={selected ? '#fff' : colors.text}
        style={{ marginRight: w(8) }}
      />
      <Text
        style={{
          fontSize: w(13),
          fontWeight: '600',
          color: selected ? '#fff' : colors.text,
        }}
        numberOfLines={1}
      >
        {game.name}
      </Text>
    </Pressable>
  );
}

export default function SelectGamesScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const isFromSettings = from === 'settings';
  const isOnboarding = from === 'onboarding';
  const { updateProfile } = useAuth();
  const { 
    availableGames, 
    selectedGameIds, 
    toggleGame, 
    isGameSelected, 
    setSelectedGameIds,
    isLoading: isGamesLoading 
  } = useSelectedGames();
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const [activeTab, setActiveTab] = useState<'mobile' | 'pc'>('mobile');

  const games = useMemo(() => 
    availableGames.filter(g => g.category === activeTab),
    [availableGames, activeTab]
  );

  const canSelectMore = selectedGameIds.length < MAX_GAMES;

  const styles = useMemo(
    () => ({
      header: { paddingTop: h(48), paddingBottom: h(24) },
      title: { fontSize: w(24), fontWeight: '700' as const, marginBottom: h(8) },
      subtitle: { fontSize: w(16), marginBottom: h(24) },
      counter: { fontSize: w(14), marginBottom: h(16) },
      tabRow: {
        flexDirection: 'row' as const,
        backgroundColor: colors.border + '40',
        borderRadius: w(10),
        padding: w(4),
        marginBottom: h(20),
      },
      tab: {
        flex: 1,
        paddingVertical: h(10),
        borderRadius: w(8),
        alignItems: 'center' as const,
      },
      chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const },
      footer: { paddingTop: h(24), paddingBottom: h(32) },
    }),
    [w, h, colors.border]
  );

  const handleContinue = async () => {
    if (selectedGameIds.length === 0) return;
    
    // Save selection and optionally update onboarding step
    const updateData: any = { selectedGames: selectedGameIds };
    if (isOnboarding) {
      updateData.onboardingStep = 'done';
    }
    
    await updateProfile(updateData);
    
    if (isFromSettings) router.back();
    else router.replace(ROUTES.HOME);
  };

  const handleSkip = async () => {
    if (isOnboarding) return;
    if (selectedGameIds.length === 0) {
      // Pick first 3 mobile games as default
      const defaults = availableGames
        .filter(g => g.category === 'mobile')
        .slice(0, 3)
        .map(g => g._id);
      
      await updateProfile({ selectedGames: defaults });
    } else {
      // If skip but games were selected, save them anyway?
      // Usually skip means "use defaults" if empty, or just go home.
      // Given the user request, we save when clicking Continue/Save.
    }
    
    if (isFromSettings) router.back();
    else router.replace(ROUTES.HOME);
  };

  return (
    <Screen padded scroll maxForm isLoading={isGamesLoading}>
      {isFromSettings && <BackButton />}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Choose your games</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          {isOnboarding
            ? 'Select at least 1 game to get personalized news. You can change this later in Settings.'
            : `Select up to ${MAX_GAMES} games to get personalized news. You can change this later in Settings.`}
        </Text>
        <Text style={[styles.counter, { color: colors.accent }]}>
          {selectedGameIds.length} / {MAX_GAMES} selected
        </Text>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setActiveTab('mobile')}
          style={[
            styles.tab,
            { backgroundColor: activeTab === 'mobile' ? colors.tint : 'transparent' },
          ]}
        >
          <FontAwesome
            name="mobile"
            size={w(18)}
            color={activeTab === 'mobile' ? '#fff' : colors.text}
            style={{ marginBottom: h(4) }}
          />
          <Text
            style={{
              fontSize: w(14),
              fontWeight: '600',
              color: activeTab === 'mobile' ? '#fff' : colors.text,
            }}
          >
            Mobile
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('pc')}
          style={[styles.tab, { backgroundColor: activeTab === 'pc' ? colors.tint : 'transparent' }]}
        >
          <FontAwesome
            name="desktop"
            size={w(18)}
            color={activeTab === 'pc' ? '#fff' : colors.text}
            style={{ marginBottom: h(4) }}
          />
          <Text
            style={{
              fontSize: w(14),
              fontWeight: '600',
              color: activeTab === 'pc' ? '#fff' : colors.text,
            }}
          >
            PC
          </Text>
        </Pressable>
      </View>

      <View style={styles.chipRow}>
        {games.map((game) => (
          <GameChip
            key={game._id}
            game={game as any}
            selected={isGameSelected(game._id)}
            onToggle={() => toggleGame(game._id)}
            disabled={!isGameSelected(game._id) && !canSelectMore}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          title={isFromSettings ? 'Save' : 'Continue'}
          onPress={handleContinue}
          fullWidth
          disabled={selectedGameIds.length === 0}
          style={{ marginBottom: h(12) }}
        />
        {!isFromSettings && !isOnboarding && (
          <Button
            title={selectedGameIds.length === 0 ? 'Skip & add default games' : 'Skip'}
            variant="outline"
            onPress={handleSkip}
            fullWidth
          />
        )}
      </View>
    </Screen>
  );
}
