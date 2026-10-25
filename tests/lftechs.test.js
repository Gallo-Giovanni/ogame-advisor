// Run with: node tests/lftechs.test.js
// Lifeform research costs vs the game's research window (levels 1 and 2, planet with a -2.5% research discount).
// The game shows thousands with one decimal (9.8k) and smaller values in full (975).
const assert = require('assert');
const E = require('../src/engine.js');
const shown = x => (x >= 1000 ? Math.round(x / 100) * 100 : Math.round(x));
const cases = [
  ['mechas', 1, [9800, 5900, 975], [29300, 17600, 2900]],
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
  assert.deepStrictEqual(E.lfTechCost(t, 1, 0.025).map(shown), l1, t.it + ' level 1');
  assert.deepStrictEqual(E.lfTechCost(t, 2, 0.025).map(shown), l2, t.it + ' level 2');
}
// Tecnologicus Runarum 10 = -2.5% research cost on its planet
assert.ok(Math.abs(E.researchDisc({ lf_race: 'rocktal', lf_buildings: { tecnologicus_runarum: 10 } }) - 0.025) < 1e-12);

// Recommendation: researched on one planet, gains on every planet; Done raises the level
const profile = { player_class: 'explorer', economy_speed: 5, plasma_tech: 0, energy_tech: 0, ratio_metal: 1, ratio_crystal: 1.5, ratio_deut: 2.5 };
const P = (id, techs) => ({ id, name: id, position: 8, temp_max: 40, metal_mine: 30, crystal_mine: 25, deut_synth: 25, solar_plant: 25,
  fusion_reactor: 0, solar_satellites: 0, energy_balance: 5000, lf_race: 'rocktal', lf_buildings: { tecnologicus_runarum: 10 }, lf_techs: techs });
const a = P('A', { 7: { race: 'rocktal', level: 5 } }), b = P('B', {});
const one = E.recommendations(profile, [a]).find(r => r.type === 'lftech');
const two = E.recommendations(profile, [a, b]).find(r => r.type === 'lftech');
assert.ok(one && one.slot === 7 && one.nextLevel === 6);
assert.ok(Math.abs(two.gainEq / one.gainEq - 2) < 1e-9, 'gain counts every planet');
assert.deepStrictEqual(one.cost, E.lfTechCost(E.LF.races.rocktal.techs[6], 6, 0.025));
assert.strictEqual(E.applyRecommendation(profile, a, one).planet.lf_techs[7].level, 6);
console.log('Lifeform research costs match the game');
