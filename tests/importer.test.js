// Avvio: node tests/importer.test.js
// Importazione dalla Vista impero. La pagina qui sotto è un piccolo esempio inventato con la stessa struttura di quella del gioco.
const assert = require('assert');
const { grabEmpire, mapImport, bookmarkletHref } = require('../src/importer.js');
const LF = require('../src/lifeforms.js');

const planet = {
  name: 'Alfa', galaxy: 2, system: 100, position: 8, temperature: 'da -10°C a 30°C',
  energy: "<div title='x'><span class='overmark'>-1.250</span></div>",
  metal: 1000, crystal: 2000, deuterium: 3000, 1: 30, 2: 25, 3: 26, 4: 24, 12: 9, 14: 10, 15: 5, 212: 400, 217: 50, 122: 12, 113: 14, 124: 11, 114: 8,
};
const set = (id, lvl, active) => { planet[id] = lvl; planet[id + '_html'] = active ? `<a title="Sviluppa">${lvl}</a>` : `<span class='disabled darkgrey'>(${lvl})</span>`; };
for (let i = 1; i <= 12; i++) { set(11100 + i, i === 1 ? 7 : 0, false); set(12100 + i, 0, true); }
set(12106, 12, true); set(12108, 3, true); set(12111, 2, true); // Fusione magmatica, Monolite, Centro di Mineralogia
for (let s = 1; s <= 18; s++) for (const b of [11, 12, 13, 14]) set(b * 1000 + 200 + s, 0, false);
set(13201, 4, true); set(11201, 2, false); // slot 1: Mecha attivo, un vecchio livello Umani in grigio
set(12207, 0, true);                       // slot 7: Rock'tal scelto, livello 0
// in corso: Fusione magmatica 12 -> 13 e Plasma 12 -> 13 (il gioco mostra una clessidra con un titolo)
planet['12106_html'] = "<a title='Sviluppa'>12</a><img src='x.gif' title='In corso al livello 13!'>";
planet['122_html'] = "<a>12</a><img src='x.gif' title='In corso al livello 0!'>";
planet['122'] = 12;
planet.groups = null;
const html = `<meta name="ogame-session" content="SECRET"><script>var planetType = 0;
  createImperiumHtml("#mainWrapper", "#loading", ${JSON.stringify({ planets: [planet], translations: {}, groups: { research: [122, 113, 124, 114] } })}, 0 );</script>`;
const metas = { universe: 's999-it.ogame.gameforge.com', 'universe-name': 'Test', 'player-name': 'Someone', 'universe-speed': '3', 'player-characterclass-id': '1', 'allianceclass-id': '0', session: 'SECRET' };
const meta = n => metas[n] || '';

const snap = grabEmpire(html, meta);
assert.ok(!JSON.stringify(snap).includes('SECRET'), 'la sessione non viene mai letta');
const p = snap.pl[0];
assert.strictEqual(p.t, 30);
assert.strictEqual(p.e, -1250);
const m = mapImport(snap, [], LF);
const { research, ...profRest } = m.profile;
assert.deepStrictEqual(profRest, { player_class: 'collector', economy_speed: 3, plasma_tech: 13, energy_tech: 14, astro_tech: 11, hyperspace_tech: 8, universe: 'Test', server: 's999-it', nickname: 'Someone' });
assert.deepStrictEqual(research, { 113: 14, 114: 8, 122: 13, 124: 11 });
const d = m.planets[0].data;
assert.strictEqual(d.lf_race, 'rocktal');
assert.deepStrictEqual(d.lf_buildings, { magma_forge: 13, monolith: 3 }); // quello in corso conta come fatto
assert.strictEqual(d.mrc_level, 2);
assert.deepStrictEqual(d.lf_techs, { 1: { race: 'mechas', level: 4 }, 7: { race: 'rocktal', level: 0 } });
assert.deepStrictEqual([d.robotics_factory, d.nanite_factory], [10, 5]);
assert.deepStrictEqual([d.resources.m, d.resources.c, d.resources.d], [1000, 2000, 3000]);
assert.strictEqual(d.buildings[1], 30); assert.strictEqual(d.buildings[15], 5); assert.ok(!('217' in d.buildings), 'solo edifici, niente navi');
assert.deepStrictEqual([d.metal_mine, d.crystal_mine, d.deut_synth, d.solar_plant, d.fusion_reactor, d.solar_satellites, d.crawlers], [30, 25, 26, 24, 9, 400, 50]);

// Un bookmarklet vecchio (versione 1) funziona ancora, e l'app chiede di sostituirlo
const old = { ...snap, v: 1, rg: undefined, res: { plasma: 12, energy: 14, astro: 11 } };
assert.ok(require('../src/importer.js').outdated(old) && !require('../src/importer.js').outdated(snap));
assert.strictEqual(mapImport(old, [], LF).profile.plasma_tech, 12);

// Abbinamento: prima per coordinate, poi per nome; i pianeti non presenti nella pagina vengono segnalati
const existing = [{ id: 'x', name: 'Other', galaxy: 2, system: 100, position: 8 }, { id: 'y', name: 'Old', galaxy: null, system: null, position: 4 }];
const mm = mapImport(snap, existing, LF);
assert.strictEqual(mm.planets[0].match.id, 'x');
assert.deepStrictEqual(mm.unmatched.map(x => x.id), ['y']);
assert.strictEqual(mapImport(snap, [{ id: 'z', name: 'alfa ', position: 8 }], LF).planets[0].match.id, 'z');

// Errori: non è la Vista impero, oppure è la scheda delle lune
assert.strictEqual(grabEmpire('<html></html>', meta).error, 'noempire');
assert.strictEqual(grabEmpire(html.replace('planetType = 0', 'planetType = 1'), meta).error, 'moons');

// Il bookmarklet è JavaScript valido su una riga
const href = bookmarkletHref('https://example.org/app/');
assert.ok(href.startsWith('javascript:'));
new Function(decodeURIComponent(href.slice('javascript:'.length)));
// Velocità delle ricerche dalla tabella dei server, riconosciuto da lingua e nome dell'universo
const I = require('../src/importer.js');
assert.strictEqual(mapImport({ ...snap, uni: 'West', srv: 's278-it' }, [], LF).profile.research_speed, 15);
assert.strictEqual(mapImport({ ...snap, uni: 'xolotlan', srv: 's279-it' }, [], LF).profile.research_speed, 16);
assert.strictEqual(mapImport({ ...snap, uni: 'West', srv: 's278-de' }, [], LF).profile.research_speed, undefined); // lingua sconosciuta: resta quella inserita
assert.strictEqual(I.serverInfo({ uni: 'Sconosciuto', srv: 's1-it' }), null);
console.log('Controlli sull\'importazione superati');
