## Goal

Publish the **Expo (React Native)** version of FlowState to the Apple App Store using **EAS Build**.

> Important: The Expo app is currently **not feature-complete** vs the web app. See `flowstate-expo/MIGRATION_STATUS.md`.

## 1) Run locally (dev)

```bash
cd flowstate-expo
npm run ios
```

Login is prototype-only: **admin / admin**.

## 2) Configure identifiers (required for App Store)

Edit `flowstate-expo/app.json`:

- `expo.ios.bundleIdentifier` (must be globally unique)
- `expo.android.package` (for Android later)

Current placeholders are:
- iOS: `com.karthik.flowstate`
- Android: `com.karthik.flowstate`

If you already have an existing bundle id in App Store Connect, use the same one.

## 3) Install EAS CLI + login

```bash
npm i -g eas-cli
eas login
```

## 4) Create/select an Expo account + project

From `flowstate-expo/`:

```bash
eas init
```

## 5) Configure EAS

This repo includes a starter `flowstate-expo/eas.json`.

Run:

```bash
cd flowstate-expo
eas build:configure
```

## 6) First iOS build (internal)

```bash
cd flowstate-expo
eas build -p ios --profile preview
```

EAS will prompt to set up Apple certificates/profiles. Let it manage them unless you have a specific reason not to.

## 7) Production build

```bash
cd flowstate-expo
eas build -p ios --profile production
```

## 8) Submit to App Store Connect

```bash
cd flowstate-expo
eas submit -p ios --profile production
```

## 9) App Store review checklist (common gotchas)

- App must not be a “thin web wrapper” (we are doing native Expo).
- Provide:
  - privacy policy URL
  - support URL
  - accurate screenshots (from the native build)
  - app description consistent with actual features
- If you collect no data, declare that correctly in App Privacy.

