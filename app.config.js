import { config } from 'dotenv';
import { resolve } from 'path';

const envFile = `.env.${process.env.APP_ENV || 'development'}`;
config({ path: resolve(process.cwd(), envFile) });

export default {
  expo: {
    name: 'esportsHistories',
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
      output: 'static',
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
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
      apiTimeout: Number(process.env.API_TIMEOUT) || 30000,
      appEnv: process.env.APP_ENV || 'development',
      enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
    },
  },
};
