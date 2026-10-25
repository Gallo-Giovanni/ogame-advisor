// Run with: node tests/importer.test.js
// Import from the empire view. The page below is a small made-up sample with the same structure as the game page.
const assert = require('assert');
const { grabEmpire, mapImport, bookmarkletHref } = require('../src/importer.js');
const LF = require('../src/lifeforms.js');

const planet = {
  name: 'Alfa', galaxy: 2, system: 100, position: 8, temperature: 'da -10°C a 30°C',
  energy: "<div title='x'><span class='overmark'>-1.250</span></div>",
  1: 30, 2: 25, 3: 26, 4: 24, 12: 9, 14: 10, 15: 5, 212: 400, 217: 50, 122: 12, 113: 14, 124: 11, 114: 8,
};
const set = (id, lvl, active) => { planet[id] = lvl; planet[id + '_html'] = active ? `<a title="Sviluppa">${lvl}</a>` : `<span class='disabled darkgrey'>(${lvl})</span>`; };
for (let i = 1; i <= 12; i++) { set(11100 + i, i === 1 ? 7 : 0, false); set(12100 + i, 0, true); }
set(12106, 12, true); set(12108, 3, true); set(12111, 2, true); // Magma Forge, Monolith, Mineral Research Centre
for (let s = 1; s <= 18; s++) for (const b of [11, 12, 13, 14]) set(b * 1000 + 200 + s, 0, false);
set(13201, 4, true); set(11201, 2, false); // slot 1: Mecha active, an old Human level greyed out
set(12207, 0, true);                       // slot 7: Rock'tal chosen, level 0
const html = `<meta name="ogame-session" content="SECRET"><script>var planetType = 0;
  createImperiumHtml("#mainWrapper", "#loading", ${JSON.stringify({ planets: [planet], translations: {}, groups: {} })}, 0 );</script>`;
const metas = { 'universe-name': 'Test', 'player-name': 'Someone', 'universe-speed': '3', 'player-characterclass-id': '1', 'allianceclass-id': '0', session: 'SECRET' };
const meta = n => metas[n] || '';

const snap = grabEmpire(html, meta);
assert.ok(!JSON.stringify(snap).includes('SECRET'), 'the session is never read');
const p = snap.pl[0];
assert.strictEqual(p.t, 30);
assert.strictEqual(p.e, -1250);
const m = mapImport(snap, [], LF);
assert.deepStrictEqual(m.profile, { player_class: 'collector', economy_speed: 3, plasma_tech: 12, energy_tech: 14, astro_tech: 11, hyperspace_tech: 8, universe: 'Test', nickname: 'Someone' });
const d = m.planets[0].data;
assert.strictEqual(d.lf_race, 'rocktal');
assert.deepStrictEqual(d.lf_buildings, { magma_forge: 12, monolith: 3 });
assert.strictEqual(d.mrc_level, 2);
assert.deepStrictEqual(d.lf_techs, { 1: { race: 'mechas', level: 4 }, 7: { race: 'rocktal', level: 0 } });
assert.deepStrictEqual([d.robotics_factory, d.nanite_factory], [10, 5]);
assert.deepStrictEqual([d.metal_mine, d.crystal_mine, d.deut_synth, d.solar_plant, d.fusion_reactor, d.solar_satellites, d.crawlers], [30, 25, 26, 24, 9, 400, 50]);

// Matching: coordinates first, then name; planets not on the page are reported
const existing = [{ id: 'x', name: 'Other', galaxy: 2, system: 100, position: 8 }, { id: 'y', name: 'Old', galaxy: null, system: null, position: 4 }];
const mm = mapImport(snap, existing, LF);
assert.strictEqual(mm.planets[0].match.id, 'x');
assert.deepStrictEqual(mm.unmatched.map(x => x.id), ['y']);
assert.strictEqual(mapImport(snap, [{ id: 'z', name: 'alfa ', position: 8 }], LF).planets[0].match.id, 'z');

// Errors: not the empire page, or the moons tab
assert.strictEqual(grabEmpire('<html></html>', meta).error, 'noempire');
assert.strictEqual(grabEmpire(html.replace('planetType = 0', 'planetType = 1'), meta).error, 'moons');

// The bookmarklet is valid one-line JavaScript
const href = bookmarkletHref('https://example.org/app/');
assert.ok(href.startsWith('javascript:'));
new Function(decodeURIComponent(href.slice('javascript:'.length)));
console.log('Empire import checks passed');
