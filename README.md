# SCKR Fahrtenbuch

Digitales Fahrtenbuch des Segel-Club Krüpelsee e. V.

- **Web/PWA:** https://tti-dilax.github.io/SCKfahrtenbuch/ (GitHub Pages, `index.html`)
- **Android-App:** wird per GitHub Actions automatisch aus derselben `index.html` gebaut. Siehe [docs/ANDROID-RELEASE.md](docs/ANDROID-RELEASE.md).
- **Download für den Verein:** siehe [docs/VERTEILUNG-UND-PRIVAT.md](docs/VERTEILUNG-UND-PRIVAT.md) (öffentlicher Link oder gezielt per Firebase)

## Wichtig beim Bearbeiten von `index.html`
- Immer die **aktuelle `index.html` aus diesem Repo** bearbeiten, nie eine ältere lokale Kopie einfügen – sonst werden Fehlerbehebungen überschrieben.
- Vor dem Speichern prüft `npm test` (bzw. GitHub Actions bei jedem Push) die Datei auf Syntaxfehler, GPS-Brücke und Saisonlogik.
- Daten der Nutzer liegen im Browser (IndexedDB, Spiegel in localStorage). Updates der `index.html` löschen keine Daten; auch eine Rückkehr zu einer älteren Version findet die Daten wieder.
