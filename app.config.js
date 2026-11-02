/**
 * Extends app.json. Permissions the app never needs are blocked.
 * Release builds (RELEASE_BUILD=1, set by the GitHub Actions workflow) also drop the INTERNET
 * permission, so the shipped APK cannot make network calls at all.
 * Debug/dev builds keep INTERNET because Metro needs it to serve the JS bundle.
 */
module.exports = ({ config }) => {
  const blocked = [
    'android.permission.RECORD_AUDIO',
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.WRITE_CONTACTS',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
  ];
  if (process.env.RELEASE_BUILD === '1') blocked.push('android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE');
  const android = { ...config.android, blockedPermissions: blocked };
  // "lite" variant: no SMS at all (the sms-reader module is also excluded from autolinking in CI)
  if (process.env.NO_SMS === '1') {
    const sms = ['android.permission.READ_SMS', 'android.permission.RECEIVE_SMS'];
    blocked.push(...sms);
    android.permissions = (config.android?.permissions ?? []).filter((p) => !sms.includes(p));
  }
  return { ...config, android };
};
