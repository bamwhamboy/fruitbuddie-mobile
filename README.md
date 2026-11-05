# FruitBuddie Mobile

Expo + React Native starter for the FruitBuddie Android and iOS app.

## Setup
1. Install Node.js LTS.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set `EXPO_PUBLIC_N8N_WEBHOOK_URL` to the active n8n webhook URL.
5. Run `npx expo start`.

## Native speech recognition
The app uses `expo-speech-recognition`, which requires a native development build. Use `npx expo run:android` or `npx expo run:ios`. It is not expected to work in the standard Expo Go client.

## Backend
The mobile app calls the existing n8n workflow. Keep Gemini, Sarvam, and other provider API keys inside n8n or a secure backend, never in the mobile app.

## Integration note
The request and response mapping in `App.tsx` is an initial scaffold. Confirm it against the current Lovable app's `src/lib/whafruit.ts` before production use. The webhook URL is intentionally not committed.
