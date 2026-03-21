import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox, Platform, StyleSheet, View } from 'react-native';
import { Provider } from 'react-redux';
import 'react-native-gesture-handler';
import { Toaster } from '@/components/Toaster';

// Suppress design/library warnings that we cannot fix in our code
LogBox.ignoreLogs([
  'props.pointerEvents is deprecated. Use style.pointerEvents',
  'Unexpected text node: . A text node cannot be a child of a <View>',
]);
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { GlobalLoader } from '@/components/ui/GlobalLoader';
import { store } from '@/store';
import { AuthProvider } from '@/context/AuthContext';
import { FollowedPlayersProvider } from '@/context/FollowedPlayersContext';
import { ResponsiveProvider } from '@/context/ResponsiveContext';
import { FeedFocusProvider } from '@/context/FeedFocusContext';
import { FollowCatalogProvider } from '@/context/FollowCatalogContext';
import { FollowedTargetsProvider } from '@/context/FollowedTargetsContext';
import { FollowHubProvider } from '@/context/FollowHubContext';
import { SelectedGamesProvider } from '@/context/SelectedGamesContext';
import { ThemeProvider as AppThemeProvider } from '@/context/ThemeContext';
import { WalletProvider } from '@/context/WalletContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Start app on auth flow; drawer is only after login.
  initialRouteName: '(auth)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppThemeProvider>
      <RootLayoutNav />
    </AppThemeProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  const navTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.tint,
      background: colors.background,
      card: colors.cardBg,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={navTheme}>
          <ResponsiveProvider>
            <AuthProvider>
              <SelectedGamesProvider>
                <FollowCatalogProvider>
                  <FollowedTargetsProvider>
                    <FeedFocusProvider>
                      <FollowHubProvider>
                        <FollowedPlayersProvider>
                      <WalletProvider>
                        <GlobalLoader />
                        <Stack screenOptions={{ headerShown: false }}>
                          <Stack.Screen name="(drawer)" />
                          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                          <Stack.Screen name="select-games" options={{ headerShown: false }} />
                          <Stack.Screen name="follow-explore" options={{ headerShown: false }} />
                          <Stack.Screen name="edit-profile" />
                          <Stack.Screen name="game-profiles" />
                          <Stack.Screen name="addresses" />
                      <Stack.Screen name="privacy-policy" />
                      <Stack.Screen name="terms" />
                      <Stack.Screen name="help-faq" />
                      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                        </Stack>
                        {/* RN Web paints later siblings on top of earlier ones — Toast must be after Stack or it stays hidden under screens */}
                        <View
                          style={[
                            styles.toastLayer,
                            Platform.OS === 'web' && styles.toastLayerWeb,
                          ]}
                          pointerEvents="box-none"
                        >
                          <Toaster />
                        </View>
                      </WalletProvider>
                        </FollowedPlayersProvider>
                      </FollowHubProvider>
                    </FeedFocusProvider>
                  </FollowedTargetsProvider>
                </FollowCatalogProvider>
              </SelectedGamesProvider>
            </AuthProvider>
          </ResponsiveProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  toastLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  toastLayerWeb: {
    // RN Web: ensure stacking above navigator / fixed headers
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none' as const,
  },
});
