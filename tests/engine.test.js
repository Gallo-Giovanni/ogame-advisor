// Run with: node tests/engine.test.js
const assert = require('assert');
const E = require('../src/engine.js');

// Known values from the OGame wiki
assert.deepStrictEqual(E.levelCost('metal_mine', 1), [60, 15, 0]);
assert.deepStrictEqual(E.levelCost('metal_mine', 2), [90, 22, 0]);
assert.deepStrictEqual(E.levelCost('crystal_mine', 2), [76, 38, 0]);
assert.deepStrictEqual(E.levelCost('plasma', 1), [2000, 4000, 1000]);
assert.strictEqual(E.consumption.metal_mine(1), 11);
assert.strictEqual(E.solarEnergy(1), 22);
assert.strictEqual(E.satelliteEnergy(48), 31);

// Sample empire (West s278-it, explorer, speed x5) - planets from the empire view
const profile = {
  player_class: 'explorer', economy_speed: 5, plasma_tech: 0, energy_tech: 0,
  geologist: false, engineer: false, commanding_staff: false,
  lf_bonus_metal: 0, lf_bonus_crystal: 0, lf_bonus_deut: 0, lf_bonus_energy: 0,
  ratio_metal: 1, ratio_crystal: 1.5, ratio_deut: 2.5,
};
const P = (id, name, g, s, p, t, m, c, d, sol, fus, bal) => ({
  id, name, galaxy: g, system: s, position: p, temp_max: t,
  metal_mine: m, crystal_mine: c, deut_synth: d, solar_plant: sol, fusion_reactor: fus,
  solar_satellites: 0, energy_balance: bal,
});
const planets = [
  P(1, 'Betulla', 1, 196, 9, 48, 37, 31, 32, 27, 10, 2072),
  P(2, 'Callido', 1, 364, 8, 36, 37, 31, 32, 27, 11, -833),
  P(3, 'Legno', 5, 40, 8, 48, 36, 31, 32, 26, 11, 1230),
];

const recs = E.recommendations(profile, planets);
assert.strictEqual(recs[0].type, 'energy', 'energy deficit must come first');
assert.strictEqual(recs[0].planet, 'Callido');
const legnoMetal = recs.find(r => r.planet === 'Legno' && r.key === 'metal_mine');
assert.ok(legnoMetal.fix, 'Legno metal 36->37 must require extra energy');

// Completing the energy fix on Callido must bring the balance to >= 0
const fixPatch = E.applyRecommendation(profile, planets[1], recs[0]);
assert.ok(fixPatch.planet.energy_balance >= 0);
assert.strictEqual(fixPatch.planet.solar_satellites, recs[0].fix.count);
// Completing Legno metal 36->37 sets the level and keeps energy >= 0
const legnoPatch = E.applyRecommendation(profile, planets[2], legnoMetal);
assert.strictEqual(legnoPatch.planet.metal_mine, 37);
assert.ok(legnoPatch.planet.energy_balance >= 0);

recs.slice(0, 8).forEach(r =>
  console.log(r.planet.padEnd(16), r.title.padEnd(34), 'ammortamento', (r.payback).toFixed(1), 'h |', r.detail));
console.log('\nAll tests passed');
