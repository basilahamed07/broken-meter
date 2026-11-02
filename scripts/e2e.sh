#!/usr/bin/env bash
# End-to-end check of the real release APK on an emulator. Never aborts early: records PASS/FAIL per step.
cd "$(dirname "$0")/.."
mkdir -p e2e
APK=$(ls android/app/build/outputs/apk/release/*.apk | head -1)
PKG=app.brokemeter
: > e2e/result.txt
step() { # name, command...
  local name="$1"; shift
  if "$@" >> e2e/steps.log 2>&1; then echo "PASS  $name" | tee -a e2e/result.txt; else echo "FAIL  $name" | tee -a e2e/result.txt; fi
}
snap() { adb exec-out screencap -p > "e2e/$1.png"; echo "--- screen after: $1" >> e2e/steps.log; python3 scripts/uitap.py dump x >> e2e/steps.log 2>&1; }
tap() { python3 scripts/uitap.py tap "$1" "${2:-20}"; }
hasnt() { ! python3 scripts/uitap.py has "$1" "${2:-4}"; }
has() { python3 scripts/uitap.py has "$1" "${2:-20}"; }

adb install -r "$APK" || { echo "FAIL  install" | tee -a e2e/result.txt; exit 0; }
echo "PASS  install" | tee -a e2e/result.txt
adb logcat -c
# let the launcher settle so no system ANR dialog covers the app
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null
sleep 20

echo "=== Flow A: onboarding without SMS ===" | tee -a e2e/steps.log
adb shell am start -n $PKG/.MainActivity >/dev/null; sleep 10; snap A01-start
step "A: onboarding step 1 visible" has "Your income" 60
step "A: tap Next (1)" tap "Next"; sleep 2; snap A02-categories
step "A: step 2 visible" has "Set your categories"
step "A: tap Next (2)" tap "Next"; sleep 2; snap A03-permissions
step "A: step 3 visible" has "Permissions"
step "A: tap Start tracking" tap "Start tracking"; sleep 6; snap A04-after-start
step "A: home screen shown" has "Left this month" 30
step "A: open Add expense" tap "Add expense"; sleep 2; snap A05-add
adb shell input text 350; sleep 1
tap "Save" >> e2e/steps.log 2>&1; sleep 3; snap A06-saved
step "A: Save reachable with keyboard open" hasnt "Payee (e.g. Swiggy)" 3
if python3 scripts/uitap.py has "Payee (e.g. Swiggy)" 2 >/dev/null 2>&1; then
  adb shell input keyevent KEYCODE_BACK; sleep 1
  tap "Save" >> e2e/steps.log 2>&1; sleep 3; snap A06b-saved-after-back
fi
step "A: expense in recent list" has "₹350" 15

echo "=== Flow B: onboarding with SMS permission ===" | tee -a e2e/steps.log
adb shell pm clear $PKG >/dev/null; adb shell am start -n $PKG/.MainActivity >/dev/null; sleep 10
step "B: tap Next (1)" tap "Next" 30; sleep 2
step "B: tap Next (2)" tap "Next"; sleep 2; snap B01-permissions
step "B: Allow SMS button exists" tap "Allow SMS"; sleep 1
step "B: tap Start tracking" tap "Start tracking"; sleep 4; snap B02-permission-dialog
python3 scripts/uitap.py tap "Allow" 8 >> e2e/steps.log 2>&1 || true; sleep 2; snap B03-after-allow
python3 scripts/uitap.py tap "Not now" 8 >> e2e/steps.log 2>&1 || true
python3 scripts/uitap.py tap "OK" 4 >> e2e/steps.log 2>&1 || true; sleep 2; snap B04-after-dialogs
step "B: home screen reachable" has "Left this month" 30
step "B: open settings" tap "⚙"; sleep 2; snap B05-settings
step "B: settings shows Auto-track row" has "Auto-track bank SMS"
step "B: settings shows SMS On" has "On"
adb shell input keyevent KEYCODE_BACK; sleep 2
step "B: back to home" has "Left this month" 15

echo "=== Flow B2: real SMS ===" | tee -a e2e/steps.log
adb emu sms send HDFCBK "Sent Rs.250.00 From HDFC Bank A/C *1234 To ZOMATO On 12/06/26 Ref 123456789012 Not You? Call 18002586161" >> e2e/steps.log 2>&1
sleep 10
step "B: bank SMS auto-tracked" has "ZOMATO" 40; snap B06-after-sms
adb emu sms send AD-SBIUPI "123456 is your OTP for txn of Rs 450 at AMAZON. Do not share it with anyone." >> e2e/steps.log 2>&1
sleep 8; snap B07-after-otp
step "B: OTP ignored" hasnt "AMAZON" 4

adb logcat -d > e2e/logcat.txt 2>&1
echo "=== RESULT ===" ; cat e2e/result.txt
echo "=== STEP LOG (tail) ==="; tail -n 120 e2e/steps.log
echo "=== SMS MODULE DIAGNOSTICS (logcat) ==="; grep -iE "smsreader|sms-reader|ExpoModulesCore|ModuleRegistry|Cannot find native" e2e/logcat.txt | head -30
echo "=== LOGCAT (errors) ==="; grep -iE "FATAL|AndroidRuntime|ReactNativeJS.*(Error|error)|Exception" e2e/logcat.txt | head -40
echo "=== SmsReader / native module lines ==="; grep -iE "SmsReader|Cannot find native" e2e/logcat.txt | head -20
