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

// Items: a +40% metal booster raises production; excluding items from rankings keeps gains unchanged
const boosted = { ...planets[0], item_metal: 40 };
const base = E.planetState(profile, planets[0]).full[0];
assert.ok(Math.abs(E.planetState(profile, boosted).full[0] / base - (1 + 0.40 / 1.23)) < 1e-9);
const gainWith = E.recommendations(profile, [boosted]).find(r => r.key === 'metal_mine').gainEq;
const gainWithout = E.recommendations({ ...profile, items_in_ranking: false }, [boosted]).find(r => r.key === 'metal_mine').gainEq;
const gainPlain = E.recommendations(profile, [planets[0]]).find(r => r.key === 'metal_mine').gainEq;
assert.ok(gainWith > gainPlain && Math.abs(gainWithout - gainPlain) < 1e-9);

// Astrophysics: 1 + ceil(level/2) planets
assert.deepStrictEqual([0, 1, 2, 3, 20].map(E.maxPlanets), [1, 2, 2, 3, 11]);
assert.strictEqual(E.astroLevelsForNextPlanet(20, 11), 1); // level 21 opens slot 12
assert.strictEqual(E.astroLevelsForNextPlanet(19, 11), 2); // 20 gives nothing, 21 does
assert.strictEqual(E.astroLevelsForNextPlanet(21, 11), 0); // free slot already
assert.deepStrictEqual(E.levelCost('astro', 1), [4000, 8000, 4000]);
assert.deepStrictEqual(E.buildUpCost('metal_mine', 2), [150, 37, 0]);

const empire = Array.from({ length: 11 }, (_, i) => ({ ...planets[0], id: 'p' + i, name: 'P' + i, position: 8, energy_balance: 3000 }));
const colony = E.recommendations({ ...profile, astro_tech: 20 }, empire).find(r => r.type === 'colony');
assert.ok(colony && colony.nextLevel === 21 && colony.astroCost[0] === Math.floor(4000 * Math.pow(1.75, 20)));
console.log('Colony:', colony.detail, '| ammortamento', (colony.payback / 24).toFixed(1), 'giorni');
// Caps: no suggestion above the chosen level; astro cap blocks the colony
const capped = E.recommendations({ ...profile, cap_metal: 37, cap_plasma: 0, cap_astro: 20, astro_tech: 20 }, empire);
assert.ok(!capped.some(r => r.key === 'metal_mine' || r.type === 'plasma' || r.type === 'colony'));
assert.ok(capped.some(r => r.key === 'crystal_mine'));
// Colony "done" raises Astrophysics and returns the planet to add
assert.strictEqual(E.applyRecommendation(profile, null, colony).profile.astro_tech, 21);

recs.slice(0, 8).forEach(r =>
  console.log(r.planet.padEnd(16), r.title.padEnd(34), 'ammortamento', (r.payback).toFixed(1), 'h |', r.detail));
console.log('\nAll tests passed');
