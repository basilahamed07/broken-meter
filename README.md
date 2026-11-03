# Broke Meter

A personal spending tracker for Android that **roasts you before you overspend**.

Earn ₹20,000, spend ₹30,000? Broke Meter shows how much is left, how many days it will last, and warns you
*before* you pay (and right after, from bank SMS) with savage-but-friendly meme roasts that get harsher as you
approach and cross your budget.

> **All data stays on your device.** No cloud, no accounts, no analytics, no AI, no network calls.
> Release builds ship **without the INTERNET permission**, so the APK physically cannot go online.

## Screens
Onboarding (income, salary day, your own categories) · Home (money left + forecast, category bars) ·
Add expense · Scan and pay · Pay someone · Before you pay · Broke alert (with share) · Savings win (streak, share) ·
Insights · Settings (income, categories, roast language English / Tanglish / Mix, export, import, delete all).

## Features
- **Budget cycle & forecast**: salary day to the day before the next one (day 31 clamps to the month end). "Lasts till the 18th at this speed" or "On track for the full month".
- **Levels** per category and overall: chill, warning, danger, broke. One local notification per level crossing per category per cycle, plus haptics.
- **Roast bank** (`src/roast/roasts.json`): 16+ lines per level for category alerts, before-you-pay, overall budget and savings wins, each in English and Tanglish. No AI. Never repeats the last 5 lines.
- **Scan and pay**: parses merchant UPI QR codes, asks for the amount if missing, auto-categorises, shows "Before you pay", then launches the original UPI string in GPay (generic UPI chooser as fallback).
- **Pay someone**: contact or UPI ID, category, then GPay opens normally (no prefilled P2P amount).
- **Pending payments**: confirmed by a matching SMS (same amount, ±10 min) or by asking "Did the payment go through?" when you return.
- **SMS auto-tracking** (optional): reads Indian bank/UPI debit SMS (SBI, HDFC, ICICI, Axis, Kotak, Indian Bank, IOB, cards, UPI apps), ignores OTPs, credits, refunds, failures and promos, de-duplicates by hash, and asks "₹500 to Arun, which category?" with 3 action buttons when unsure.
- **Learns from you**: exact payee memory, then keyword rules, then a tiny Naive Bayes classifier (used only above 70% confidence), then it asks once.
- **Insights**: spend per category, biggest day, top 5 payees, change vs last cycle, one rule-based tip.
- **Backup**: export JSON (full) and CSV, import JSON with confirmation, delete all data with a double confirmation.

Everything works with manual entry if SMS or camera permission is denied.

## Install the APK
1. Download an APK from the [Releases](../../releases) page. There are two files:
   - **`BrokeMeter-lite-vX.Y.Z.apk`**: no SMS permission, installs without warnings on most phones. Add expenses by hand or scan a QR.
   - **`BrokeMeter-vX.Y.Z.apk`** (full): also reads bank SMS automatically. Android may show a Play Protect warning because it is installed outside the Play Store and asks for SMS permission. Tap "More details", then "Install anyway", only if you trust this open-source app.
2. Open it. Android asks to allow **Install unknown apps** for your browser or file manager; allow it.
3. **Android 13+ and SMS tracking:** sideloaded apps are blocked from the SMS permission by default. Go to
   **Settings, Apps, Broke Meter, ⋮ (top right), Allow restricted settings**, then grant SMS in the app.
   Skip this if you only want manual entry.

## Paying with UPI
The app opens GPay (or any UPI app you pick) with the QR details, like tapping a UPI link.
GPay and banks may refuse payments to unverified or personal UPI IDs opened from other apps. If that happens, use "Copy UPI ID and open GPay" and pay inside the app.
The app cannot see the payment result, so it asks you afterwards or matches the bank SMS.

## Build from source
Needs Node 20+, JDK 17 and the Android SDK. Expo Go is **not** enough (native modules).

```bash
git clone <this repo> && cd broken-meter
npm install --legacy-peer-deps
npx expo prebuild --platform android
npx expo run:android            # phone on USB with debugging on, or an emulator
```

Release APK (no INTERNET permission, smaller, R8 shrunk):

```bash
RELEASE_BUILD=1 npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
# android/app/build/outputs/apk/release/app-release.apk
```

Tagging a version publishes a release automatically: `git tag v0.1.0 && git push origin v0.1.0`
(see `.github/workflows/release.yml`, which warns if the APK exceeds 40 MB; it builds for 64-bit ARM phones only, which covers nearly all phones from the last several years).

Note: release APKs from the workflow are signed with the template debug key, which is fine for sideloading.
Use your own keystore if you want upgrade-in-place guarantees across machines.

## Tests
```bash
npm test            # cycle, forecast, levels, roast engine, UPI QR parser, SMS parser (23 samples), Naive Bayes, pipeline, stats, backup
npm run typecheck
```

## Project layout
```
app/            expo-router screens
src/db/         schema, migrations, queries (money stored as integer paise)
src/budget/     cycle, forecast, levels, streak, pending matching (+ tests)
src/roast/      roasts.json, engine (+ tests)
src/upi/        qrParser, launch (+ tests)
src/sms/        parser, samples, handler, listener, native bridge (+ tests)
src/categorize/ memory, rules.json, naiveBayes, pipeline, learn (+ tests)
src/insights/   stats, tips (+ tests)
src/backup/     export/import (+ tests)
src/ui/         theme.ts (dark theme tokens) + components
modules/sms-reader/  small Android-only Expo module (Kotlin): inbox read + SMS receiver queue
```

## Privacy
- Data lives in a local SQLite database on your phone.
- No analytics, no crash reporting, no remote APIs. Release APKs do not request the INTERNET permission.
- SMS bodies are parsed on the phone; only the amount, payee and a hash are stored. OTPs are discarded.
  The app never stores card numbers, CVV, UPI PIN or OTPs.
- Exports go through the Android share sheet to wherever *you* choose.

## Known limits
- SMS arriving while the app process is not running is queued by a tiny native receiver and processed the next time you open the app (Android may stop idle apps; the roast notification for that SMS appears then).
- GPay does not report payment results back to other apps, so in-app payments are confirmed by SMS or by asking you.

## License
MIT
