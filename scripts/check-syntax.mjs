// Prüft alle Inline-Skripte von index.html auf Syntaxfehler (ein Tippfehler legt sonst die ganze App lahm).
import fs from 'fs';
const html = fs.readFileSync(process.argv[2] || 'index.html', 'utf8');
const re = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g; let m, n = 0, bad = 0;
while ((m = re.exec(html))) {
  n++;
  try { new Function(m[1]); }
  catch (e) { bad++; console.log('SYNTAXFEHLER im Skript ab Zeile', html.slice(0, m.index).split('\n').length, ':', e.message); }
}
console.log(n, 'Skripte geprüft,', bad, 'Fehler'); if (bad) process.exit(1);
