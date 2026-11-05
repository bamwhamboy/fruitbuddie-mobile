# FruitBuddie Mobile (Expo)

Separate React Native + Expo frontend based on the existing Lovable FruitBuddie project. The Lovable app is not modified.

## Setup
1. Install Node.js LTS.
2. Copy `.env.example` to `.env` and set your active n8n webhook URL.
3. Run `npm install`.
4. Run `npx expo start`.

Native speech recognition requires a development/native build; it may not work in Expo Go. The scaffold preserves the 10 language options present in the Lovable source. Nutrition content is displayed as returned by the backend and has not yet undergone a medical evidence audit.
