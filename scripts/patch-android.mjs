// Passt das von Capacitor erzeugte android/-Projekt an (idempotent):
//  - Berechtigungen für Hintergrund-GPS
//  - applicationId / versionCode / versionName aus Umgebungsvariablen
//  - Release-Signatur aus Umgebungsvariablen (Keystore kommt NIE ins Repo)
//  - Name des Benachrichtigungskanals
//
// Umgebungsvariablen (alle optional):
//  APP_ID            z. B. de.sckr.fahrtenbuch  (muss zur bereits verteilten APK passen!)
//  VERSION_CODE      ganzzahlig, muss bei jedem Update steigen
//  VERSION_NAME      z. B. 1.0.42
//  ANDROID_KEYSTORE_FILE, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
//    -> werden erst beim Gradle-Lauf gelesen (System.getenv), nicht hier gespeichert.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const MANIFEST = 'android/app/src/main/AndroidManifest.xml';
const GRADLE = 'android/app/build.gradle';
const STRINGS = 'android/app/src/main/res/values/strings.xml';

for (const f of [MANIFEST, GRADLE, STRINGS]) {
  if (!existsSync(f)) throw new Error(`${f} fehlt – zuerst "npx cap add android" ausführen`);
}

// ── 1. Manifest-Berechtigungen ─────────────────────────────
const PERMS = [
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.WAKE_LOCK',
];
let manifest = readFileSync(MANIFEST, 'utf8');
const missing = PERMS.filter((p) => !manifest.includes(`"${p}"`));
if (missing.length) {
  const lines = missing.map((p) => `    <uses-permission android:name="${p}" />`).join('\n');
  manifest = manifest.replace(/<\/manifest>\s*$/, `${lines}\n</manifest>\n`);
  writeFileSync(MANIFEST, manifest);
}
console.log('Manifest: +', missing.length, 'Berechtigungen');

// ── 2. app/build.gradle ───────────────────────────────────
let gradle = readFileSync(GRADLE, 'utf8');

const appId = process.env.APP_ID && process.env.APP_ID.trim();
if (appId) {
  if (!/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(appId)) throw new Error(`Ungültige APP_ID: ${appId}`);
  gradle = gradle.replace(/applicationId\s+"[^"]*"/, `applicationId "${appId}"`);
}
const vc = process.env.VERSION_CODE && process.env.VERSION_CODE.trim();
if (vc) {
  if (!/^\d+$/.test(vc)) throw new Error(`VERSION_CODE muss eine Zahl sein: ${vc}`);
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${vc}`);
}
const vn = process.env.VERSION_NAME && process.env.VERSION_NAME.trim();
if (vn) {
  if (!/^[\w.\-]+$/.test(vn)) throw new Error(`Ungültiger VERSION_NAME: ${vn}`);
  gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${vn}"`);
}

const MARK = '// SCKR-SIGNING';
if (!gradle.includes(MARK)) {
  const signing = `
    ${MARK}: Release-Signatur nur aus Umgebungsvariablen (CI-Secrets)
    signingConfigs {
        release {
            def ksFile = System.getenv("ANDROID_KEYSTORE_FILE")
            if (ksFile) {
                storeFile file(ksFile)
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD") ?: System.getenv("ANDROID_KEYSTORE_PASSWORD")
            }
        }
    }
`;
  // signingConfigs muss vor buildTypes stehen
  if (!/\n\s*buildTypes\s*\{/.test(gradle)) throw new Error('buildTypes-Block in build.gradle nicht gefunden');
  gradle = gradle.replace(/(\n\s*buildTypes\s*\{)/, `${signing}$1`);
  gradle = gradle.replace(
    /(buildTypes\s*\{\s*release\s*\{)/,
    `$1\n            if (System.getenv("ANDROID_KEYSTORE_FILE")) { signingConfig signingConfigs.release }`
  );
  if (!gradle.includes('signingConfig signingConfigs.release')) throw new Error('release-Block in build.gradle nicht gefunden');
}
writeFileSync(GRADLE, gradle);
const show = (re) => (gradle.match(re) || ['?'])[0];
console.log('Gradle:', show(/applicationId\s+"[^"]*"/), '|', show(/versionCode\s+\d+/), '|', show(/versionName\s+"[^"]*"/));

// ── 3. Benachrichtigungskanal ─────────────────────────────
let strings = readFileSync(STRINGS, 'utf8');
if (!strings.includes('capacitor_background_geolocation_notification_channel_name')) {
  strings = strings.replace(
    /<\/resources>/,
    '    <string name="capacitor_background_geolocation_notification_channel_name">Fahrtaufzeichnung</string>\n</resources>'
  );
  writeFileSync(STRINGS, strings);
}
console.log('patch-android: fertig');
