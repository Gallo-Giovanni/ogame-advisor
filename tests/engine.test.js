// Run with: node tests/engine.test.js
// Sample data is generic: it does not come from any real player account.
const assert = require('assert');
const E = require('../src/engine.js');

// Known values from the OGame wiki
assert.deepStrictEqual(E.levelCost('metal_mine', 1), [60, 15, 0]);
assert.deepStrictEqual(E.levelCost('metal_mine', 2), [90, 22, 0]);
assert.deepStrictEqual(E.levelCost('crystal_mine', 2), [76, 38, 0]);
assert.deepStrictEqual(E.levelCost('plasma', 1), [2000, 4000, 1000]);
assert.strictEqual(E.consumption.metal_mine(1), 11);
assert.strictEqual(E.solarEnergy(1), 22);
assert.strictEqual(E.satelliteEnergy(40), 30);

// Sample empire: economy x5, explorer, three planets A, B, C
const profile = {
  player_class: 'explorer', economy_speed: 5, plasma_tech: 0, energy_tech: 0,
  geologist: false, engineer: false, commanding_staff: false,
  ratio_metal: 1, ratio_crystal: 1.5, ratio_deut: 2.5,
};
const P = (id, name, pos, t, m, c, d, sol, fus, bal) => ({
  id, name, position: pos, temp_max: t, metal_mine: m, crystal_mine: c, deut_synth: d,
  solar_plant: sol, fusion_reactor: fus, solar_satellites: 0, energy_balance: bal,
  lf_metal: 0, lf_crystal: 0, lf_deut: 0, lf_energy: 0,
});
const planets = [
  P(1, 'A', 9, 40, 30, 25, 25, 25, 10, 2000),
  P(2, 'B', 8, 30, 30, 25, 25, 25, 10, -800),
  P(3, 'C', 8, 40, 29, 25, 25, 24, 10, 1200),
];

const recs = E.recommendations(profile, planets);
assert.strictEqual(recs[0].type, 'energy', 'energy deficit must come first');
assert.strictEqual(recs[0].planet, 'B');
const cMetal = recs.find(r => r.planet === 'C' && r.key === 'metal_mine');

// Completing the energy fix must bring the balance to >= 0
const fixPatch = E.applyRecommendation(profile, planets[1], recs[0]);
assert.ok(fixPatch.planet.energy_balance >= 0);
// Completing a mine sets the level and keeps energy >= 0 when a fix is included
const cPatch = E.applyRecommendation(profile, planets[2], cMetal);
assert.strictEqual(cPatch.planet.metal_mine, 30);
assert.ok(cPatch.planet.energy_balance >= 0 || !cMetal.fix);

// Items and lifeform bonuses are a % of the mine row; items can be left out of rankings
const boosted = { ...planets[0], item_metal: 40 };
const base = E.planetState(profile, planets[0]).full[0];
assert.ok(Math.abs(E.planetState(profile, boosted).full[0] / base - 1.40) < 1e-9);
const gainWith = E.recommendations(profile, [boosted]).find(r => r.key === 'metal_mine').gainEq;
const gainWithout = E.recommendations({ ...profile, items_in_ranking: false }, [boosted]).find(r => r.key === 'metal_mine').gainEq;
const gainPlain = E.recommendations(profile, [planets[0]]).find(r => r.key === 'metal_mine').gainEq;
assert.ok(gainWith > gainPlain && Math.abs(gainWithout - gainPlain) < 1e-9);
// Lifeform bonus is per planet
const lfPlanet = { ...planets[0], lf_metal: 25 };
assert.ok(Math.abs(E.planetState(profile, lfPlanet).full[0] / base - 1.25) < 1e-9);
// Older data without per-planet values falls back to the account value
const legacy = { ...planets[0] }; delete legacy.lf_metal;
assert.ok(Math.abs(E.planetState({ ...profile, lf_bonus_metal: 10 }, legacy).full[0] / base - 1.10) < 1e-9);

// Excluded planets are ignored in rankings and totals
const excl = planets.map(p => (p.name === 'B' ? { ...p, included: false } : p));
assert.ok(!E.recommendations(profile, excl).some(r => r.planet === 'B'));
assert.ok(E.totals(profile, excl)[0] < E.totals(profile, planets)[0]);

// Astrophysics: 1 + ceil(level/2) planets
assert.deepStrictEqual([0, 1, 2, 3, 20].map(E.maxPlanets), [1, 2, 2, 3, 11]);
assert.strictEqual(E.astroLevelsForNextPlanet(20, 11), 1);
assert.strictEqual(E.astroLevelsForNextPlanet(19, 11), 2);
assert.strictEqual(E.astroLevelsForNextPlanet(21, 11), 0);
assert.deepStrictEqual(E.levelCost('astro', 1), [4000, 8000, 4000]);
assert.deepStrictEqual(E.buildUpCost('metal_mine', 2), [150, 37, 0]);

// New colony: median mine levels of the empire
const empire = Array.from({ length: 11 }, (_, i) => ({ ...planets[0], id: 'p' + i, name: 'P' + i, metal_mine: i === 0 ? 10 : 30, energy_balance: 3000 }));
const colony = E.recommendations({ ...profile, astro_tech: 20 }, empire).find(r => r.type === 'colony');
assert.ok(colony && colony.nextLevel === 21 && colony.colony.metal_mine === 30, 'median ignores the planet far behind');
assert.strictEqual(colony.astroCost[0], Math.floor(4000 * Math.pow(1.75, 20)));
// Caps
const capped = E.recommendations({ ...profile, cap_metal: 30, cap_plasma: 0, cap_astro: 20, astro_tech: 20 }, empire);
assert.ok(!capped.some(r => (r.key === 'metal_mine' && r.nextLevel > 30) || r.type === 'plasma' || r.type === 'colony'));
assert.ok(capped.some(r => r.key === 'crystal_mine'));
assert.strictEqual(E.applyRecommendation(profile, null, colony).profile.astro_tech, 21);

console.log('All tests passed');
