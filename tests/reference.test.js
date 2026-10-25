// Checks the engine against the numbers shown by the game's "Impostazioni risorse" page for one
// reference configuration (economy x5, explorer, Trader alliance, all officers, position 9, 48 °C).
// Only game numbers are used here, no player data. Run with: node tests/reference.test.js
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
  // lifeform rows of the game page (buildings + technology bonus) as % of the mine row
  lf_metal: (69638 + 42845) / 232127 * 100,
  lf_crystal: (5950 + 8348) / 59502 * 100,
  lf_deut: (4215 + 10035) / 42159 * 100,
  lf_energy: 15,
};
const near = (got, want, tol, what) => assert.ok(Math.abs(got - want) <= tol, `${what}: got ${Math.round(got)}, game shows ${want}`);

// Single rows of the game page
const pos = 1 + E.positionBonus(9).metal;
near(E.baseProd.metal_mine(37) * 5 * pos, 232127, 1, 'metal mine row');
near(E.baseProd.crystal_mine(31) * 5, 59502, 1, 'crystal mine row');
near(E.baseProd.deut_synth(32, 48) * 5, 42159, 1, 'deuterium row');
near(E.baseProd.metal_mine(38) * 5 * pos, 262241, 1, 'metal mine level 38 (tech info)');
near(E.consumption.metal_mine(37), 12581, 1, 'metal mine energy (tech info)');
near(E.fusionEnergy(10, 17), 2191, 1, 'fusion energy');
near(E.solarEnergy(27), 7079, 0, 'solar plant energy');
near(750 * E.satelliteEnergy(48), 23250, 0, 'satellites energy');

// Totals per hour
const st = E.planetState(profile, planet);
near(st.actual[0], 514247, 5, 'metal per hour');
near(st.actual[1], 90274, 5, 'crystal per hour');
near(st.actual[2], 64507, 5, 'deuterium per hour');
near(st.need + st.balance, 42926, 2, 'energy produced');
console.log('Reference page matched: metal', Math.round(st.actual[0]), 'crystal', Math.round(st.actual[1]), 'deut', Math.round(st.actual[2]), 'energy', st.need + st.balance);
