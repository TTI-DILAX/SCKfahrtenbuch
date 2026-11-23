# APK gezielt verteilen & Repo privat schalten

## Kurzfassung
| Ziel | Lösung | Kosten | Status |
|---|---|---|---|
| Android-APK nur an eingeladene Personen | **Firebase App Distribution**: Einladung per E-Mail, Updates landen automatisch bei den Testern | kostenlos | im Workflow vorbereitet, aktiv sobald eingerichtet |
| Öffentlicher Download-Link abschalten | Variable `PUBLIC_RELEASE` = `false` | – | vorbereitet |
| Quellcode privat | Repo privat + Web-App über ein kleines öffentliches Repo unter **derselben Adresse** | kostenlos (oder GitHub Pro) | vorbereitet (`deploy-web.yml`) |

> **Wichtig:** Den Code einer Web-App kann jeder lesen, der sie im Browser öffnet. „Privat“ versteckt also das Repo (Verlauf, Doku, Workflows), nicht aber die App selbst.

---

## A. Gezielt verteilen mit Firebase App Distribution
Voraussetzung: Die signierte APK läuft schon (siehe `ANDROID-RELEASE.md`).

1. Gehe zu https://console.firebase.google.com und erstelle ein Projekt, z. B. „SCKR Fahrtenbuch“. Google Analytics brauchst du dafür nicht.
2. Füge eine **Android-App** hinzu. Als Paketname trägst du **genau die `APP_ID`** ein, z. B. `de.sckr.fahrtenbuch`. Die Schritte „google-services.json“ und „SDK“ kannst du **überspringen**, sie werden für die reine Verteilung nicht gebraucht.
3. Öffne den Menüpunkt **App Distribution** und klicke auf **Loslegen**. Lege unter **Tester & Gruppen** die Gruppe `verein` an und trage die E-Mail-Adressen der Tester ein.
4. Lege einen Dienst-Schlüssel an: Google Cloud Console → IAM → **Dienstkonten** → „Dienstkonto erstellen“ → Rolle **Firebase App Distribution Admin** → Schlüssel → JSON herunterladen.
5. Trage alles in GitHub ein (Repo → Settings → Secrets and variables → Actions):
   - Secret `FIREBASE_SERVICE_ACCOUNT` = der komplette Inhalt der JSON-Datei
   - Variable `FIREBASE_APP_ID` = die App-ID aus Firebase (Projekteinstellungen, Format `1:123…:android:abc…`)
   - optional die Variable `FIREBASE_GROUPS` (Standard: `verein`)
6. Danach verteilt jedes Release (Actions → Android-APK → Run workflow → Haken bei Release) automatisch an die Gruppe. Die Tester bekommen eine E-Mail mit Installationslink. Wen du aus der Gruppe entfernst, der bekommt keine neuen Versionen mehr.

Wenn nur noch Firebase verteilen soll: Variable `PUBLIC_RELEASE` = `false`. Dann entsteht kein öffentlicher GitHub-Release-Link mehr.

**Alternative später:** Google Play mit „Interner Test“ (bis 100 Tester per E-Mail-Liste). Dafür braucht es ein Play-Entwicklerkonto (einmalige Gebühr) und ein App-Bundle (AAB) statt APK. Das lohnt sich erst, wenn die App in den Store soll.

---

## B. Repo privat schalten, ohne dass die Web-App kaputtgeht
**Problem:** Mit kostenlosem GitHub-Konto funktionieren GitHub Pages nur in **öffentlichen** Repos. Schaltest du dieses Repo einfach auf privat, ist die Web-App offline.
**Und:** Wechselt die Web-Adresse (Domain) oder der Pfad der installierten App, sehen deine Nutzer ihre Fahrten nicht mehr bzw. die Homescreen-App findet ihre Daten nicht. Deshalb muss die Adresse exakt gleich bleiben.

### Variante 1 (kostenlos): Code privat, Web-App über ein kleines öffentliches Repo
Die Adresse bleibt `tti-dilax.github.io/SCKfahrtenbuch/`, die Daten bleiben also erhalten.
1. **Vorher:** Alle Nutzer ein Backup machen lassen (zur Sicherheit).
2. Benenne dieses Repo um (Settings → General → Repository name), z. B. in `sckr-fahrtenbuch-dev`, und stelle es auf **Private**.
3. Lege ein **neues öffentliches** Repo mit dem alten Namen `SCKfahrtenbuch` an. Lade dort `index.html` und `sw.js` hoch und aktiviere **Settings → Pages → Deploy from branch → main / (root)**.
4. Erstelle einen Token: GitHub → Settings → Developer settings → **Fine-grained token** → nur Repo `SCKfahrtenbuch` → Berechtigung „Contents: Read and write“ → **Ablauf: 1 Jahr** (Standard sind 30 Tage!). Trag dir eine Erinnerung zum Erneuern ein; ist der Token abgelaufen, aktualisiert sich die Web-App nicht mehr (der Workflow wird rot).
5. Trage im **privaten** Repo ein:
   - Secret `PAGES_DEPLOY_TOKEN` = der Token
   - Variable `PAGES_REPO` = `tti-dilax/SCKfahrtenbuch`
6. Teste es einmal: im privaten Repo Actions → „Web-App veröffentlichen“ → Run workflow. Ab jetzt prüft jeder Push auf `main` die App und kopiert `index.html` und `sw.js` automatisch ins öffentliche Repo.
7. **Wichtig – alte Verknüpfungen umstellen:** Die alte Adresse `github.com/tti-dilax/SCKfahrtenbuch` zeigt jetzt auf das **öffentliche** Repo (GitHub-Weiterleitungen entfallen, sobald der alte Name neu vergeben ist).
   - Jede lokale Kopie / jedes Tool: `git remote set-url origin https://github.com/tti-dilax/sckr-fahrtenbuch-dev.git`
   - Claude/KI-Sitzungen künftig mit dem **neuen** Repo-Namen verbinden, sonst landet Quellcode versehentlich im öffentlichen Repo.
   - Im öffentlichen Repo unter Settings → Rules eine Regel anlegen, die nur Änderungen an `main` erlaubt (andere Branches sperren).

Zwischen Schritt 2 und 3 ist die Web-App ein paar Minuten nicht erreichbar. Daten gehen dabei nicht verloren.

### Variante 2: GitHub Pro (kostenpflichtig)
Mit GitHub Pro funktionieren Pages auch aus privaten Repos. Dann einfach auf **Private** stellen, fertig. Die Web-App selbst bleibt öffentlich erreichbar, wie bei Variante 1.

### Was sich beim privaten Repo ändert
- GitHub-Actions-Minuten sind begrenzt (ein APK-Build dauert ca. 5–8 Minuten). Für ein paar Builds im Monat reicht das kostenlose Kontingent.
- Öffentliche GitHub-Release-Links funktionieren nicht mehr (sie bräuchten Login). Deshalb: Verteilung über Firebase (Teil A) und `PUBLIC_RELEASE=false`.
