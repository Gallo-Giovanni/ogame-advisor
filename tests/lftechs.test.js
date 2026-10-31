// Avvio: node tests/lftechs.test.js
// Costi delle ricerche forme di vita confrontati con la finestra di ricerca del gioco (livelli 1 e 2, pianeta con sconto ricerche del 2,5%).
// Il gioco mostra le migliaia con un decimale (9.8k) e i valori più piccoli per intero (975).
const assert = require('assert');
const E = require('../src/engine.js');
const shown = x => (x >= 1e6 ? Math.round(x / 1e4) * 1e4 : x >= 1000 ? Math.round(x / 100) * 100 : Math.round(x));
const cases = [
  ['mechas', 1, [9800, 5900, 975], [29300, 17600, 2900]],
  ['rocktal', 1, [9800, 5900, 975], [29300, 17600, 2900]],
  ['kaelesh', 3, [14600, 9800, 4900], [43900, 29300, 14600]],
  ['humans', 2, [6800, 9800, 4900], [20500, 29300, 14600]],
  ['rocktal', 3, [14600, 9800, 4900], [43900, 29300, 14600]],
  ['kaelesh', 4, [19500, 14600, 7300], [58500, 43900, 21900]],
  ['kaelesh', 5, [24400, 19500, 9800], [73100, 58500, 29300]],
  ['mechas', 6, [48800, 48800, 19500], [146300, 146300, 58500]],
  ['rocktal', 7, [68300, 39000, 19500], [204800, 117000, 58500]],
  ['humans', 8, [78000, 48800, 19500], [234000, 146300, 58500]],
  ['rocktal', 9, [73100, 53600, 24400], [219400, 160900, 73100]],
  ['kaelesh', 10, [82900, 39000, 34100], [198900, 93600, 81900]],
  ['kaelesh', 11, [117000, 29300, 24400], [351000, 87800, 73100]],
  ['kaelesh', 12, [97500, 39000, 29300], [292500, 117000, 87800]],
];
for (const [race, slot, l1, l2] of cases) {
  const t = E.LF.races[race].techs[slot - 1];
  assert.deepStrictEqual(E.lfTechCost(t, 1, 0.025).map(shown), l1, t.it + ' livello 1');
  assert.deepStrictEqual(E.lfTechCost(t, 2, 0.025).map(shown), l2, t.it + ' livello 2');
}
// Livelli alti (il gioco mostra i milioni con due decimali): la formula vale fino al livello 10
const high = [
  ['mechas', 1, 8, [1330000, 799600, 133300]],
  ['humans', 2, 10, [2620000, 3750000, 1870000]],
  ['rocktal', 3, 6, [666400, 444200, 222100]],
  ['kaelesh', 4, 6, [888500, 666400, 333200]],
  ['kaelesh', 5, 10, [9370000, 7500000, 3750000]],
  ['mechas', 6, 6, [2220000, 2220000, 888500]],
  ['rocktal', 7, 6, [3110000, 1780000, 888500]],
  ['humans', 8, 6, [3550000, 2220000, 888500]],
  ['rocktal', 9, 6, [3330000, 2440000, 1110000]],
  ['kaelesh', 10, 6, [1240000, 582300, 509500]],
  ['kaelesh', 11, 8, [15990000, 4000000, 3330000]],
  ['kaelesh', 12, 6, [4440000, 1780000, 1330000]],
];
for (const [race, slot, L, exp] of high) {
  const t = E.LF.races[race].techs[slot - 1];
  assert.deepStrictEqual(E.lfTechCost(t, L, 0.025).map(shown), exp, t.it + ' livello ' + L);
}
// Tecnologicus Runarum 10 = -2,5% sul costo delle ricerche del suo pianeta
assert.ok(Math.abs(E.researchDisc({ lf_race: 'rocktal', lf_buildings: { tecnologicus_runarum: 10 } }) - 0.025) < 1e-12);

// Consiglio: si ricerca su un pianeta, guadagna su tutti; Fatto alza il livello
const profile = { player_class: 'explorer', economy_speed: 5, plasma_tech: 0, energy_tech: 0, ratio_metal: 1, ratio_crystal: 1.5, ratio_deut: 2.5 };
const P = (id, techs) => ({ id, name: id, position: 8, temp_max: 40, metal_mine: 30, crystal_mine: 25, deut_synth: 25, solar_plant: 25,
  fusion_reactor: 0, solar_satellites: 0, energy_balance: 5000, lf_race: 'rocktal', lf_buildings: { tecnologicus_runarum: 10 }, lf_techs: techs });
const a = P('A', { 7: { race: 'rocktal', level: 5 } }), b = P('B', {});
const one = E.recommendations(profile, [a]).find(r => r.type === 'lftech');
const two = E.recommendations(profile, [a, b]).find(r => r.type === 'lftech');
assert.ok(one && one.slot === 7 && one.nextLevel === 6);
assert.ok(Math.abs(two.gainEq / one.gainEq - 2) < 1e-9, 'il guadagno conta tutti i pianeti');
assert.deepStrictEqual(one.cost, E.lfTechCost(E.LF.races.rocktal.techs[6], 6, 0.025));
assert.strictEqual(E.applyRecommendation(profile, a, one).planet.lf_techs[7].level, 6);
// Durata: Estrattori ad alto rendimento 9 -> 10 su Gonnia (Tecnologicus Runarum 10 = -20%, velocità 5) = 12o 15m 14s
const gonnia = { lf_race: 'rocktal', lf_buildings: { tecnologicus_runarum: 10 } };
assert.ok(Math.abs(E.researchTimeDisc(gonnia) - 0.2) < 1e-12);
assert.strictEqual(E.lfTechTime(E.LF.races.humans.techs[1], 10, E.researchTimeDisc(gonnia), 5), 12 * 3600 + 15 * 60 + 14);
// Durate di livello 1 e 2 di tutte le 18 ricerche Umani (calcolatore proxyforgame, velocità 1, senza sconti)
const H1 = [1200, 2600, 3250, 4550, 4968, 6500, 10400, 7800, 9100, 9800, 9750, 13000, 11050, 12600, 13300, 14000, 14300, 16900];
const H2 = [2880, 6760, 8450, 11830, 11923, 16900, 27040, 20280, 25479, 27439, 25350, 33800, 28730, 35279, 37239, 39199, 37180, 43940];
E.LF.races.humans.techs.forEach((t, i) => {
  assert.ok(Math.abs(E.lfTechTime(t, 1, 0, 1) - H1[i]) <= 1, t.it + ' livello 1');
  assert.ok(Math.abs(E.lfTechTime(t, 2, 0, 1) - H2[i]) <= 1, t.it + ' livello 2');
});
// Durate di livello 1 e 2 delle 18 ricerche Rock'tal (stesso calcolatore)
const R1 = [1300, 2600, 3250, 4900, 5850, 6500, 7150, 8400, 8450, 9100, 9750, 10400, 11050, 11700, 12350, 14000, 16900, 15399];
const R2 = [3380, 6760, 8450, 13719, 15210, 16900, 18590, 23519, 21970, 23660, 25350, 27040, 28730, 30420, 32110, 39199, 43940, 43119];
E.LF.races.rocktal.techs.forEach((t, i) => {
  assert.ok(Math.abs(E.lfTechTime(t, 1, 0, 1) - R1[i]) <= 1, t.it + ' livello 1');
  assert.ok(Math.abs(E.lfTechTime(t, 2, 0, 1) - R2[i]) <= 1, t.it + ' livello 2');
});
// Durate di livello 1 e 2 delle 18 ricerche Mecha (stesso calcolatore)
const M1 = [1300, 2600, 3500, 4550, 6300, 6500, 7150, 8400, 9100, 9100, 9750, 11200, 11050, 12600, 13300, 14000, 16900, 15399];
const M2 = [3380, 6760, 9799, 11830, 17639, 16900, 18590, 23519, 25479, 23660, 25350, 31359, 28730, 35279, 37239, 39199, 43940, 43119];
E.LF.races.mechas.techs.forEach((t, i) => {
  assert.ok(Math.abs(E.lfTechTime(t, 1, 0, 1) - M1[i]) <= 1, t.it + ' livello 1');
  assert.ok(Math.abs(E.lfTechTime(t, 2, 0, 1) - M2[i]) <= 1, t.it + ' livello 2');
});
// Kaelesh: durate al livello 1 e 2 (proxyforgame, velocità 1, nessuno sconto) e alcuni costi al livello 2
const K1 = [1400, 2600, 3500, 4900, 6300, 7000, 7150, 7200, 9100, 8400, 10500, 10400, 11050, 12600, 13300, 14000, 16900, 15399];
const K2 = [3919, 6760, 9799, 13719, 17639, 19599, 18590, 17280, 25479, 20160, 29399, 27040, 28730, 35279, 37239, 39199, 43940, 43119];
E.LF.races.kaelesh.techs.forEach((t, i) => {
  assert.ok(Math.abs(E.lfTechTime(t, 1, 0, 1) - K1[i]) <= 1, t.it + ' livello 1');
  assert.ok(Math.abs(E.lfTechTime(t, 2, 0, 1) - K2[i]) <= 1, t.it + ' livello 2');
});
const KC2 = { 4: [60000, 45000, 22500], 6: [130000, 130000, 52000], 8: [192000, 120000, 48000], 10: [204000, 96000, 84000], 15: [720000, 360000, 360000] };
for (const [slot, c] of Object.entries(KC2))
  assert.deepStrictEqual(E.lfTechCost(E.LF.races.kaelesh.techs[slot - 1], 2, 0), c, 'costo Kaelesh slot ' + slot);
console.log('Costi e durate delle ricerche forme di vita uguali al gioco');

// Popolazione Rock'tal confrontata con il gioco (Gonnia: Enclave 53, Fattoria 55, Fucina 10, Orictorium 5, velocità 5)
{
  const lv = { quarters: 53, farm: 55, school: 10, high: 5, keys: [] };
  const st = E.population('rocktal', lv, 5, 257018562);
  assert.strictEqual(st.cap, 257018562, 'spazio abitativo');
  assert.ok(Math.abs(st.satiety - 261650324) < 50, 'sazietà');
  assert.ok(Math.abs(st.growth / 3600 - 2830.6) < 0.1, 'crescita al secondo');
  assert.deepStrictEqual([st.t2, st.t3, st.open], [25701856, 1285092, 12]);
  // tabella dell'Enclave (Tech. Info.): spazio al livello 60 e 65
  assert.ok(Math.abs(E.population('rocktal', { ...lv, quarters: 60 }, 5).cap / 1.141e9 - 1) < 0.001);
  assert.ok(Math.abs(E.population('rocktal', { ...lv, quarters: 65 }, 5).cap / 3.283e9 - 1) < 0.001);
  console.log('Popolazione uguale al gioco');
}

// Spazio abitativo delle altre razze con l'edificio che lo aumenta (tabelle di RiV-, docs/riferimenti)
{
  const cap = (r, q, b) => E.population(r, { quarters: q, farm: q, school: 0, high: 0, capBoost: b }, 1).cap;
  assert.strictEqual(cap('mechas', 59, 11 * 0.02), 2196427401);
  assert.strictEqual(cap('humans', 61, 11 * 0.015), 1701549151);
  assert.strictEqual(cap('kaelesh', 60, 18 * 0.02), 1922786087);
  assert.strictEqual(cap('rocktal', 62, 0), 1743064486);
  console.log('Spazio abitativo di tutte le razze uguale alle tabelle');
}

// Bonus delle ricerche forme di vita di tutto l'account confrontato con la pagina "Impostazioni risorse" del gioco
// (31/10/2026, 11 pianeti Rock'tal, livelli delle razze Umani 40, Rock'tal 44, Mecha 42, Kaelesh 43; ricerche in corso escluse).
// Riga "Bonus Tecnologia Forme di vita" / riga della miniera: metallo 70.134 / 287.826, cristallo 11.218 / 59.502, deuterio 13.628 / 42.970.
{
  const R = { m: 'mechas', h: 'humans', r: 'rocktal', k: 'kaelesh' };
  const codes = ['m8 h10 r7 k6 k9 m7 r6 h6 r5 k5 k7 k6', 'm8 h9 r7 k6 k9 m6 r7 h6 r5 k6 k7 k6', 'm8 h9 r7 k6 k9 m6 r6 h6 r5 k5 k7 k6', 'm8 h9 r7 k6 k9 m6 r6 h6 r5 k5 k7 k6',
    'm8 h10 r7 k7 k9 m6 r6 h6 r5 k5 k7 k6', 'h6 h9 r6 k6 k9 m6 r6 h6 r4 k5 k6 k6', 'm8 h9 r6 k5 k9 m6 r6 h6 r5 k5 k6 k6', 'm8 h10 r7 k6 k9 m6 r6 h6 r5 k6 k6 k6',
    'm8 h9 r7 k6 k9 m6 r6 h6 r5 k6 k6 k6', 'm8 h9 r7 k6 k9 m6 r6 h6 r5 k6 k6 k6', 'm8 h9 r6 k6 k9 m7 r5 h6 r5 k5 k6 k5'];
  const pls = codes.map(c => ({ lf_race: 'rocktal', lf_buildings: {}, lf_techs: Object.fromEntries(c.split(' ').map((x, i) => [i + 1, { race: R[x[0]], level: +x.slice(1) }])) }));
  const t = E.techTotals({ lf_level_humans: 40, lf_level_rocktal: 44, lf_level_mechas: 42, lf_level_kaelesh: 43 }, pls);
  assert.ok(Math.abs(t.metal - 70134 / 287826) < 0.0001, 'metallo ' + t.metal);
  assert.ok(Math.abs(t.crystal - 11218 / 59502) < 0.0001, 'cristallo ' + t.crystal);
  assert.ok(Math.abs(t.deut - 13628 / 42970) < 0.0001, 'deuterio ' + t.deut);
  console.log('Bonus delle ricerche forme di vita uguale al gioco (livello della razza del pianeta)');
}

// Cibo delle altre razze con gli edifici che lo cambiano (tabelle di RiV-, slot 13, velocità 1)
{
  const st = (r, lv) => E.population(r, { school: 0, high: 0, ...lv }, 1);
  const m = st('mechas', { quarters: 59, farm: 69, capBoost: 11 * 0.02, foodBoost: 12 * 0.02 });
  assert.ok(Math.abs(m.foodProd - 4969253) < 2 && Math.abs(m.foodCons - 5032068) < 2, 'Mecha');
  const h = st('humans', { quarters: 61, farm: 59, capBoost: 11 * 0.015, foodBoost: 14 * 0.05, consCut: 17 * 0.01 });
  assert.ok(Math.abs(h.foodProd - 2322664) < 2 && Math.abs(h.foodCons - 2334966) < 2, 'Umani');
  assert.ok(Math.abs(h.satiety - 1692584449) < 1000, 'Umani: popolazione con il cibo che manca');
  const k = st('kaelesh', { quarters: 60, farm: 62, capBoost: 18 * 0.02, consCut: 13 * 0.01 });
  assert.ok(Math.abs(k.foodProd - 2550484) < 2 && Math.abs(k.foodCons - 2559247) < 2, 'Kaelesh');
  console.log('Cibo di tutte le razze uguale alle tabelle');
}
