# Esports Histories

Esports news app for PC and mobile games. Built with React Native (Expo) and TypeScript.

## Setup

```bash
npm install
cp .env.example .env.development   # Edit with your values
npm start
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Development (loads `.env.development`) |
| `npm run start:stage` | Stage (loads `.env.stage`) |
| `npm run start:prod` | Production (loads `.env.production`) |
| `npm run android` | Run on Android |
| `npm run ios` | Run on iOS |
| `npm run web` | Run on Web |

## Project Structure

```
├── app/
│   ├── (auth)/          # Auth flow: login, signup, forgot/change password
│   ├── (tabs)/          # Main tabs: Dashboard, Profile, Settings
│   └── _layout.tsx      # Root layout, AuthProvider
├── components/
│   └── ui/              # Reusable: Button, Input, Card, Screen, BackButton
├── context/             # AuthContext
├── hooks/               # useResponsive
├── services/            # auth.service (mock API)
├── types/               # auth types
└── utils/               # responsive (wp, hp, wScale, hScale)
```

## Features

- **Auth**: Login, Sign up, Forgot password, Change password
- **Profile**: User info, change password
- **Dashboard**: Quick links for PC/Mobile game news
- **Settings**: App config, environment display
