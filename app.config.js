import { config } from 'dotenv';
import { resolve } from 'path';

const envFile = `.env.${process.env.APP_ENV || 'development'}`;
config({ path: resolve(process.cwd(), envFile) });

console.log(`[Config] Loading ${envFile}`);
console.log(`[Config] API_BASE_URL: ${process.env.API_BASE_URL}`);

/** Web `output`: `static` runs route prerender/SSR (needed for `expo export`). `single` is SPA-only and avoids flaky stream errors during `expo start --web` ("Premature close"). */
function getWebOutput() {
  const explicit = process.env.EXPO_WEB_OUTPUT;
  if (explicit === 'static' || explicit === 'single' || explicit === 'server') {
    return explicit;
  }
  const isExport = process.argv.includes('export');
  return isExport ? 'static' : 'single';
}

export default {
  expo: {
    name: 'Esports Histories',
    slug: 'esportshistories',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'esportshistories',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: { supportsTablet: true },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: 'metro',
      output: getWebOutput(),
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Allow Esports Histories to use your location for address.',
        },
      ],
    ],
    experiments: { typedRoutes: true },
    extra: {
      apiBaseUrl: process.env.API_BASE_URL,
      apiTimeout: Number(process.env.API_TIMEOUT) || 30000,
      appEnv: process.env.APP_ENV || 'development',
      enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
    },
  },
};
