// Kopiert die PWA-Dateien in den Capacitor-Webordner (www/).
// Die PWA selbst (GitHub Pages) bleibt unverändert im Repo-Root.
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';

const FILES = ['index.html', 'sw.js', 'sckr_core.js'];

rmSync('www', { recursive: true, force: true });
mkdirSync('www', { recursive: true });
for (const f of FILES) {
  if (!existsSync(f)) {
    if (f === 'index.html') throw new Error('index.html fehlt im Repo-Root');
    continue;
  }
  cpSync(f, `www/${f}`);
}
console.log('www/ erstellt:', FILES.filter(existsSync).join(', '));
