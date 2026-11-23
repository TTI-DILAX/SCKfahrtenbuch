// Testet die Saison-Zuordnung ("Bordbuch abgegeben") aus index.html ohne Browser.
import fs from 'fs'; import vm from 'vm'; import assert from 'assert';
const html = fs.readFileSync(process.argv[2] || 'index.html', 'utf8');
const a = html.indexOf('SCKR.fahrtenbuch.tripSeason = function');
const b = html.indexOf('SCKR.fahrtenbuch._localDay = function');
const ctx = { SCKR: { fahrtenbuch: { state: { seasonClose: {} } } } };
vm.createContext(ctx); vm.runInContext(html.slice(a, b), ctx);
const f = ctx.SCKR.fahrtenbuch, S = (d, o) => f.tripSeason(Object.assign({ date: d }, o || {}));
assert.equal(S('2026-11-20'), '2026', 'ohne Abgabe: Kalenderjahr');
f.state.seasonClose = { '2026': { day: '2026-11-01' } };
assert.equal(S('2026-10-31'), '2026'); assert.equal(S('2026-11-01'), '2026', 'Abgabetag zählt noch alt');
assert.equal(S('2026-11-02'), '2027'); assert.equal(S('2026-12-31'), '2027'); assert.equal(S('2027-03-01'), '2027');
assert.equal(S('2025-12-01'), '2025', 'andere Jahre unberührt');
assert.equal(S('2026-11-20', { seasonYear: '2026' }), '2026', 'Override zurück');
assert.equal(S('2026-09-01', { seasonYear: '2027' }), '2027', 'Override vor');
assert.equal(S('2026-11-20', { seasonYear: '2030' }), '2027', 'ungültiger Override ignoriert');
f.state.seasonClose = {};
assert.equal(S('2026-11-20', { seasonYear: '2027' }), '2026', 'Override ohne Abgabe ignoriert');
assert.equal(f.tripSeason({}), null); assert.equal(f.tripSeason({ date: 'kaputt' }), null);
// Mehrere Jahre hintereinander (2026–2030), auch mit Lücke (2028 nie abgegeben)
f.state.seasonClose = { '2026': { day: '2026-11-01' }, '2027': { day: '2027-10-20' }, '2029': { day: '2029-11-01' } };
const cases = [['2026-11-10','2027'],['2027-05-01','2027'],['2027-10-20','2027'],['2027-10-25','2028'],['2027-12-31','2028'],
  ['2028-07-01','2028'],['2028-12-31','2028'],['2029-06-01','2029'],['2029-11-15','2030'],['2030-03-01','2030'],['2035-08-08','2035']];
cases.forEach(([d, s]) => assert.equal(S(d), s, d + ' -> ' + s));
console.log('ALLE SAISON-TESTS OK');
