// Plattformunabhängig (Windows/Linux): www/ bauen -> android/ anlegen (falls fehlt)
// -> Icons/Splash -> Patch (Rechte, Version, Signatur) -> cap sync.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const run = (cmd) => { console.log('>', cmd); execSync(cmd, { stdio: 'inherit' }); };
run('node scripts/build-www.mjs');
if (!existsSync('android')) run('npx cap add android');
run('npx capacitor-assets generate --android');
run('node scripts/patch-android.mjs');
run('npx cap sync android');
