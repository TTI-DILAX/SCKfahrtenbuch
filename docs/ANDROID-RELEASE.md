# Android-APK automatisch bauen (GitHub Actions)

GitHub baut die signierte APK selbst. Android Studio wird dafür nicht mehr gebraucht.
Grundlage ist immer die aktuelle `index.html` aus diesem Repo, also dieselbe App wie auf GitHub Pages.

---

## Einmalig einrichten (ca. 20 Minuten, am PC)

### 0. Werte aus deinem alten Android-Projekt ablesen
Öffne in deinem lokalen Projekt (vermutlich `C:\dev\fahrtenbuch-repo\native\`) diese Dateien:

| Was | Wo | Wofür |
|---|---|---|
| `appId` | `capacitor.config.json` | Variable `APP_ID`. **Muss exakt stimmen**, sonst entsteht eine zweite App und die Fahrten sind dort nicht sichtbar. |
| `server` → `androidScheme` / `hostname` | `capacitor.config.json` | Sollte **nicht vorhanden** sein. Wenn doch, schick mir die Werte, bevor du ein Release baust. Ein anderer Wert ändert den Speicherort der Fahrten. |
| `versionCode` | `android\app\build.gradle` | Für die Variable `VERSION_CODE_BASE` (siehe unten). Nur nötig, wenn der Wert größer als 100 ist. |

### 1. Keystore als Text kopieren
Nimm **genau den Schlüssel, mit dem die bereits verteilte APK signiert wurde** (`C:\dev\keys\sckr-fahrtenbuch.jks`).

PowerShell:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\dev\keys\sckr-fahrtenbuch.jks")) | Set-Clipboard
```
Der Text liegt jetzt in der Zwischenablage. Füge ihn nur in GitHub ein (Schritt 2), sonst nirgendwo, also nicht in einen Chat und nicht in eine Datei im Repo.

### 2. Secrets anlegen
GitHub → Repo **SCKfahrtenbuch** → **Settings → Secrets and variables → Actions → Reiter „Secrets“ → New repository secret**

| Name | Wert |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Zwischenablage aus Schritt 1 |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore-Passwort |
| `ANDROID_KEY_ALIAS` | Alias, laut deiner Anleitung `sckr` |
| `ANDROID_KEY_PASSWORD` | Key-Passwort. Optional: Ist es leer, wird das Keystore-Passwort verwendet. |

### 3. Variablen anlegen (gleiche Seite, Reiter **„Variables“**)

| Name | Wert |
|---|---|
| `APP_ID` | aus Schritt 0, z. B. `de.sckr.fahrtenbuch` |
| `EXPECTED_CERT_SHA256` | Fingerabdruck des Schlüssels (siehe unten) |
| `VERSION_CODE_BASE` | nur falls der alte `versionCode` größer als 100 war: einen höheren Wert eintragen, z. B. `1000` |

Fingerabdruck anzeigen (PowerShell, `keytool` liegt bei Android Studio):
```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore C:\dev\keys\sckr-fahrtenbuch.jks -alias sckr
```
→ In der Zeile `SHA256:` den **Wert dahinter** kopieren, z. B. `AB:CD:…`. Doppelpunkte und Großbuchstaben sind egal.
Mit diesem Wert bricht der Build ab, sobald versehentlich ein falscher Schlüssel hinterlegt wurde.

**Sicherheitsnetz:** Wenn ein Secret oder eine Variable fehlt, bricht ein Release mit einer klaren Meldung ab. Es geht also nie unbemerkt eine falsche APK raus.

---

## APK bauen und verteilen

**Release erstellen:** GitHub → **Actions → Android-APK → Run workflow** → Haken bei **„GitHub-Release …“** → **Run workflow**.
Nach etwa 10 Minuten steht in der Zusammenfassung des Laufs:
- Version und Zertifikat (✅ wenn der Fingerabdruck passt)
- **Dauerlink für den Verein:**
  `https://github.com/tti-dilax/SCKfahrtenbuch/releases/latest/download/SCKR-Fahrtenbuch.apk`
  Diesen Link einmal per WhatsApp verschicken. Er zeigt immer auf die neueste Version.

Text für die Kollegen:
> Link antippen → APK öffnen → „Installation aus dieser Quelle erlauben“ (für WhatsApp bzw. den Browser) → installieren. Samsung: vorher Auto Blocker aus. Die Play-Protect-Warnung mit „Trotzdem installieren“ bestätigen. Beim ersten Start Standort und Benachrichtigungen erlauben.

**Automatisch:** Jeder Push auf `main` baut und testet die App. Das Ergebnis liegt unter Actions → Lauf → „Artifacts“ (der Download kommt als ZIP, darin die APK).
Ohne Secrets baut GitHub eine **Debug-APK** mit eigener App-ID (`….debug`). Sie installiert sich neben der Vereins-App und stört diese nicht. Nur zum Testen gedacht.

**Versionen:** Die Versionsnummer zählt automatisch hoch (Code = `VERSION_CODE_BASE` + Laufnummer). Auf den Handys einfach drüberinstallieren.

---

## Vor dem ersten Update auf den Handys (Pflicht)
1. In der alten App eine **Sicherung exportieren**.
2. Neue APK auf **dein** Handy drüberinstallieren und prüfen:
   - Sind die alten Fahrten noch da? Falls nicht: nicht verteilen, mir Bescheid geben (siehe Schritt 0, `androidScheme`).
   - Beim ersten Fahrtstart nach Benachrichtigungen gefragt? Erlauben.
   - Fahrt starten → Bildschirm sperren → 5 Minuten warten, Anruf und WhatsApp → zurück: Ist die Spur lückenlos? Wird die Benachrichtigung „GPS aktiv“ angezeigt?
   - Fahrt beenden: Verschwindet die Benachrichtigung? (Das war vorher ein Fehler, siehe unten.)
   - Bei Aussetzern: Akku-Optimierung für die App ausschalten (Einstellungen → Apps → SCKR Fahrtenbuch → Akku → „Nicht eingeschränkt“).
3. Erst danach den Link an den Verein schicken.

---

## Was in diesem Paket geändert wurde
- **GPS-Fehler in der nativen App behoben:** Der alte Code rief Plugin-Funktionen auf, die es nicht gibt (`getCurrentLocation`, `removeAllWatchers`). Die Folgen:
  - Nach „Fahrt beenden“ lief das GPS samt Benachrichtigung weiter (Akku).
  - Bei jedem Zurückkehren in die App kam ein weiterer GPS-Watcher dazu.

  Jetzt läuft höchstens ein Watcher, auch bei gleichzeitigen Aufrufen. „Beenden“ stoppt zuverlässig, auch wenn das GPS gerade erst startet. Nach einer verweigerten Berechtigung startet das GPS beim Zurückkehren in die App neu.
  Abgesichert durch automatische Tests (`npm test`) und einen Browser-Test mit simuliertem Plugin.
- Die App fragt unter Android 13+ nach der Erlaubnis für Benachrichtigungen. Ohne diese Erlaubnis ist „GPS aktiv“ unsichtbar.
- Eigenes Benachrichtigungs-Icon (Wimpel), wie es die Plugin-Doku verlangt.
- Drei doppelte GPS-Module in `index.html` wurden zu einem zusammengeführt. Der Benachrichtigungstext folgt wieder dem Branding (White-Label).
- Der Hinweis „GPS stoppt bei gesperrtem Bildschirm“ erscheint nur noch in der Browser-Version. In der App steht stattdessen ein passender Tipp.
- Ein Konsolenfehler beim Start wurde behoben (`renderSponsors`).
- `android.useLegacyBridge: true`: Ohne diese Einstellung stoppt Android Standort-Updates nach etwa 5 Minuten im Hintergrund (Plugin-Doku).
- App-Icon und Splash aus dem Vereinswimpel (`assets/`, neu als Vektor gezeichnet).

## Lokal bauen (optional, Fallback)
```bash
npm ci
npm test
APP_ID=de.sckr.fahrtenbuch npm run android:prepare    # APP_ID wie in Schritt 0
npx cap open android                                   # dann wie gewohnt in Android Studio signieren
```
(Windows PowerShell: vorher `$env:APP_ID="de.sckr.fahrtenbuch"` setzen, dann `npm run android:prepare`.)
