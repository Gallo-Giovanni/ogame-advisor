// Avvio: node tests/lifeforms.test.js
// Costi degli edifici forme di vita confrontati con il gioco (livelli 1 e 2 mostrati dal gioco, il 5% più economici su quel pianeta)
const assert = require('assert');
const LF = require('../src/lifeforms.js');
const cost = (b, L) => b.cost.base.map(x => x * Math.pow(b.cost.factor, L - 1) * L * 0.95);
const shown = {
  magma_forge: [[9500, 7600, 950], [26600, 21300, 2700]],
  crystal_refinery: [[80800, 41800, 23800], [226100, 117000, 66500]],
  deuterium_tuner: [[114000, 47500, 19000], [319200, 133000, 53200]],
  disruption_chamber: [[19000, 14300, 9500], [45600, 34200, 22800]],
  tecnologicus_runarum: [[38000, 9500, 14300], [98800, 24700, 37100]],
};
for (const [key, levels] of Object.entries(shown)) {
  const b = LF.races.rocktal.buildings[key];
  levels.forEach((want, i) => cost(b, i + 1).forEach((got, r) =>
    assert.ok(Math.abs(got - want[r]) <= want[r] * 0.006 + 60, `${key} L${i + 1} res ${r}: ${got} vs ${want[r]}`)));
}
console.log('Costi degli edifici forme di vita uguali al gioco');

// Centro di Mineralogia e Monolite, livelli 1 e 2 (stesso pianeta, Monolite 5 = -5%)
const more = {
  mineral_centre: [[237500, 142500, 95000], [855000, 513000, 342000]],
  monolith: [[47500, 33300, 14300], [142500, 99800, 42800]],
};
for (const [key, levels] of Object.entries(more)) {
  const b = LF.races.rocktal.buildings[key];
  levels.forEach((want, i) => cost(b, i + 1).forEach((got, r) =>
    assert.ok(Math.abs(got - want[r]) <= want[r] * 0.006 + 60, `${key} L${i + 1} res ${r}: ${got} vs ${want[r]}`)));
}

// Motore: Fusione magmatica 15 -> 16 con Monolite 5 (gioco: 23,65M / 18,92M, energia -413)
const E = require('../src/engine.js');
const mf = LF.races.rocktal.buildings.magma_forge;
const c16 = E.lfBuildingCost(mf, 16, 0.05);
assert.ok(Math.abs(c16[0] - 23650000) < 10000 && Math.abs(c16[1] - 18920000) < 10000);
assert.strictEqual(Math.ceil((E.lfBuildingEnergy(mf, 16) - E.lfBuildingEnergy(mf, 15)) * 0.95), 413);
// la formula dell'energia coincide con le tabelle Tech Info
for (const [key, table] of [['magma_forge', 'energy'], ['crystal_refinery', 'energy'], ['mineral_centre', 'energy'], ['monolith', 'energy'], ['tecnologicus_runarum', 'energy']]) {
  const b = LF.races.rocktal.buildings[key], t = b[table];
  const entries = Array.isArray(t) ? t.map((v, i) => [i + 1, v]) : Object.entries(t).map(([l, v]) => [+l, v]);
  for (const [L, v] of entries) if (L >= 2) assert.ok(Math.abs(E.lfBuildingEnergy(b, L) - v) <= 1, `${key} energy L${L}: ${E.lfBuildingEnergy(b, L)} vs ${v}`);
}
console.log('Energia e Monolite uguali al gioco');
