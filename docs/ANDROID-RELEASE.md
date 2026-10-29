# Android-APK automatisch bauen (GitHub Actions)

GitHub baut die signierte APK selbst. Android Studio wird dafür nicht mehr gebraucht.
Grundlage ist immer die aktuelle `index.html` aus diesem Repo, also dieselbe App wie auf GitHub Pages.

---

## Einmalig einrichten (ca. 15 Minuten, am PC)

### 1. Keystore als Text kopieren
Nimm **genau den Schlüssel, mit dem die bereits verteilte APK signiert wurde** (`C:\dev\keys\sckr-fahrtenbuch.jks`).
Mit einem anderen Schlüssel lassen sich Updates auf den Handys der Vereinskollegen nicht installieren.

PowerShell:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\dev\keys\sckr-fahrtenbuch.jks")) | Set-Clipboard
```
Der Text liegt jetzt in der Zwischenablage. Füge ihn nur in GitHub ein (Schritt 2), sonst nirgendwo, also nicht in einen Chat und nicht in eine Datei im Repo.

### 2. Secrets anlegen
GitHub → Repo **SCKfahrtenbuch** → **Settings → Secrets and variables → Actions → Secrets → New repository secret**

| Name | Wert |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Zwischenablage aus Schritt 1 |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore-Passwort |
| `ANDROID_KEY_ALIAS` | Alias, laut Anleitung `sckr` |
| `ANDROID_KEY_PASSWORD` | Key-Passwort (meist dasselbe wie oben) |

### 3. Variablen anlegen (gleiche Seite, Reiter **Variables**)

| Name | Wert | Woher? |
|---|---|---|
| `APP_ID` | z. B. `de.sckr.fahrtenbuch` | `capacitor.config.json` in deinem lokalen Projekt (vermutlich `C:\dev\fahrtenbuch-repo\native\`) → Feld `appId`. **Muss exakt stimmen**, sonst entsteht eine zweite App und die Fahrten sind dort nicht sichtbar. |
| `EXPECTED_CERT_SHA256` | Fingerabdruck des Schlüssels | siehe unten. Mit diesem Wert bricht der Build ab, falls versehentlich ein falscher Schlüssel hinterlegt wurde. |

Fingerabdruck anzeigen (PowerShell, `keytool` liegt bei Android Studio):
```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore C:\dev\keys\sckr-fahrtenbuch.jks -alias sckr
```
→ Zeile `SHA256:` kopieren, zum Beispiel `AB:CD:…`. Die Doppelpunkte dürfen drinbleiben.

---

## APK bauen und verteilen

**Release erstellen:** GitHub → **Actions → Android-APK → Run workflow** → Haken bei **„GitHub-Release …“** → **Run workflow**.
Nach etwa 10 Minuten steht in der Zusammenfassung des Laufs:
- Version und Zertifikat (✅ wenn der Fingerabdruck passt)
- **Dauerlink für den Verein:**
  `https://github.com/tti-dilax/SCKfahrtenbuch/releases/latest/download/SCKR-Fahrtenbuch.apk`
  Diesen Link einmal per WhatsApp verschicken. Er zeigt immer auf die neueste Version.

**Automatisch:** Jeder Push auf `main` baut und testet die App. Das Ergebnis liegt nur als Download unter Actions bereit, es entsteht kein Release.
Ohne Secrets baut GitHub eine **Debug-APK**. Die ist nur zum Testen gedacht, nicht zum Verteilen.

**Versionen:** Die Versionsnummer zählt automatisch hoch (Code = 100 + Laufnummer). Auf den Handys einfach drüberinstallieren, die Fahrten bleiben erhalten.

---

## Vor dem ersten Update auf den Handys
1. In der alten App eine **Sicherung exportieren**. Das ist vor allem dann wichtig, wenn die alte APK mit einer älteren Capacitor-Version gebaut wurde.
2. Neue APK auf **dein** Handy drüberinstallieren und prüfen:
   - Sind die alten Fahrten noch da?
   - Fahrt starten → Bildschirm sperren → 5 Minuten warten, Anruf und WhatsApp → zurück: Ist die Spur lückenlos?
   - Fahrt beenden: Verschwindet die Benachrichtigung „GPS aktiv“? (Das war vorher ein Fehler, siehe unten.)
3. Erst danach an den Verein verteilen.

---

## Was in diesem Paket geändert wurde
- **GPS-Fehler in der nativen App behoben:** Der alte Code rief Plugin-Funktionen auf, die es nicht gibt (`getCurrentLocation`, `removeAllWatchers`). Die Folgen:
  - Nach „Fahrt beenden“ lief das GPS samt Benachrichtigung weiter (Akku).
  - Bei jedem Zurückkehren in die App kam ein weiterer GPS-Watcher dazu.
  - Die Abfrage einer einzelnen Position stürzte ab.

  Jetzt läuft höchstens ein Watcher, „Beenden“ stoppt zuverlässig, und die Einzelposition funktioniert. Abgesichert durch einen automatischen Test (`npm test`).
- Drei doppelte GPS-Module in `index.html` wurden zu einem zusammengeführt. Der Benachrichtigungstext folgt wieder dem Branding (White-Label).
- Der Hinweis „GPS stoppt bei gesperrtem Bildschirm“ erscheint nur noch in der Browser-Version. In der App steht stattdessen der Tipp „Immer erlauben“.
- Ein Konsolenfehler beim Start wurde behoben (`renderSponsors`).
- `android.useLegacyBridge: true`: Ohne diese Einstellung stoppt Android Standort-Updates nach etwa 5 Minuten im Hintergrund (Plugin-Doku).
- App-Icon und Splash aus dem Vereinswimpel (`assets/`, neu als Vektor gezeichnet).

## Lokal bauen (optional, Fallback)
```bash
npm ci
npm test
npm run android:prepare      # erzeugt android/
npx cap open android         # dann wie gewohnt in Android Studio signieren
```
