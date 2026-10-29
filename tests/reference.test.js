// Confronta il motore con i numeri della pagina "Impostazioni risorse" del gioco per una
// configurazione di riferimento (economia x5, Esploratore, alleanza Mercante, tutti gli ufficiali, posizione 9, 48 °C).
// Qui ci sono solo numeri del gioco, nessun dato del giocatore. Avvio: node tests/reference.test.js
const assert = require('assert');
const E = require('../src/engine.js');

const profile = {
  player_class: 'explorer', economy_speed: 5, plasma_tech: 16, energy_tech: 17,
  geologist: true, engineer: true, commanding_staff: true, alliance_trader: true,
  energy_consumption_reduction: 5,
  ratio_metal: 1, ratio_crystal: 1.5, ratio_deut: 2.5,
};
const planet = {
  name: 'Reference', position: 9, temp_max: 48, metal_mine: 37, crystal_mine: 31, deut_synth: 32,
  solar_plant: 27, fusion_reactor: 10, solar_satellites: 750, energy_balance: null,
  item_metal: 40, item_crystal: 0, item_deut: 0, item_energy: 0,
  // righe forme di vita della pagina del gioco (edifici + bonus tecnologia) come % della riga miniera
  lf_metal: (69638 + 42845) / 232127 * 100,
  lf_crystal: (5950 + 8348) / 59502 * 100,
  lf_deut: (4215 + 10035) / 42159 * 100,
  lf_energy: 15,
};
const near = (got, want, tol, what) => assert.ok(Math.abs(got - want) <= tol, `${what}: calcolato ${Math.round(got)}, il gioco mostra ${want}`);

// Singole righe della pagina del gioco
const pos = 1 + E.positionBonus(9).metal;
near(E.baseProd.metal_mine(37) * 5 * pos, 232127, 1, 'riga miniera di metallo');
near(E.baseProd.crystal_mine(31) * 5, 59502, 1, 'riga miniera di cristallo');
near(E.baseProd.deut_synth(32, 48) * 5, 42159, 1, 'riga deuterio');
near(E.baseProd.metal_mine(38) * 5 * pos, 262241, 1, 'miniera di metallo livello 38 (tech info)');
near(E.consumption.metal_mine(37), 12581, 1, 'energia miniera di metallo (tech info)');
near(E.fusionEnergy(10, 17), 2191, 1, 'energia della fusione');
near(E.solarEnergy(27), 7079, 0, 'energia della centrale solare');
near(750 * E.satelliteEnergy(48), 23250, 0, 'energia dei satelliti');

// Totali all'ora
const st = E.planetState(profile, planet);
near(st.actual[0], 514247, 5, 'metallo all\'ora');
near(st.actual[1], 90274, 5, 'cristallo all\'ora');
near(st.actual[2], 64507, 5, 'deuterio all\'ora');
near(st.need + st.balance, 42926, 2, 'energia prodotta');
console.log('Pagina di riferimento uguale: metallo', Math.round(st.actual[0]), 'cristallo', Math.round(st.actual[1]), 'deuterio', Math.round(st.actual[2]), 'energia', st.need + st.balance);

// Seconda pagina di riferimento: posizione 8, 42 °C, fusione 11, 100 crawler, booster +80% metallo, +40% cristallo e
// deuterio, bilancio energetico preso dal gioco. Verificata con i crawler al 100% e al 50%.
const planet2 = {
  name: 'Reference 2', position: 8, temp_max: 42, metal_mine: 37, crystal_mine: 31, deut_synth: 32,
  solar_plant: 27, fusion_reactor: 11, solar_satellites: 750, crawlers: 100,
  item_metal: 40, item_crystal: 0, item_deut: 0, item_all: 40, item_energy: 0,
  lf_metal: (75893 + 46694) / 252978 * 100, lf_crystal: (5908 + 8290) / 59082 * 100,
  lf_deut: (4266 + 10298) / 42667 * 100, lf_energy: 15,
};
for (const [pct, balance, want] of [[100, -2680, [631984, 108497, 78681]], [50, -305, [664163, 113863, 82663]]]) {
  const s = E.planetState(profile, { ...planet2, crawler_pct: pct, energy_balance: balance });
  near(s.produced, 42925, 2, `energia prodotta (crawler al ${pct}%)`);
  ['metallo', 'cristallo', 'deuterio'].forEach((r, i) => near(s.actual[i], want[i], 40, `${r} all'ora (crawler al ${pct}%)`));
  console.log(`Crawler al ${pct}% uguali: fattore ${(s.factor * 100).toFixed(2)}%`, s.actual.map(Math.round).join(' / '));
}
assert.strictEqual(E.maxCrawlers(planet2), 800);

// Centro di Mineralogia livello 1 = miniere più economiche dello 0,5%, verificato sul gioco (Gonnia, Centro 1):
// metallo 38 = 195,59M / 48,90M, cristallo 32 = 101,57M / 50,79M, deuterio 33 = 96,59M / 32,20M
const M = x => Math.round(x / 1e4) / 100;
assert.deepStrictEqual(E.mineCost('metal_mine', 38, 1).slice(0, 2).map(M), [195.59, 48.9]);
assert.deepStrictEqual(E.mineCost('crystal_mine', 32, 1).slice(0, 2).map(M), [101.57, 50.79]);
assert.deepStrictEqual(E.mineCost('deut_synth', 33, 1).slice(0, 2).map(M), [96.59, 32.2]);
assert.deepStrictEqual(E.mineCost('metal_mine', 38, 1), [195591922, 48897981, 0]);
