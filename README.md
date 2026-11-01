# Broke Meter

A personal spending tracker for Android that roasts you before you overspend.
**All data stays on your device.** No cloud, no accounts, no analytics, no network calls.

> Status: Phase 1 of 4 (manual tracking). Scan and pay, SMS auto-tracking, insights and export/import come in later phases.

## Phase 1 features
- Onboarding: income, salary day, your own categories (editable suggestions)
- Home: money left this cycle, "how long it lasts" forecast, per-category progress bars
- Manual add expense, edit and delete
- Levels (chill, warning, danger, broke) per category and overall, with one local notification per level crossing per cycle, plus haptics
- Roast bank (English, Tanglish or Mix), no AI
- Settings: income, salary day, categories (add, edit, reorder, delete with reassign), roast language, delete all data

## Run on your Android phone (development build)
Expo Go is not enough, the app uses native modules.

```bash
npm install
npx expo prebuild --platform android
npx expo run:android      # phone connected over USB with USB debugging on
```

## Tests
```bash
npm test
npm run typecheck
```

## Privacy
All data stays on your device, in a local SQLite database. The app makes no network requests.

## License
MIT
