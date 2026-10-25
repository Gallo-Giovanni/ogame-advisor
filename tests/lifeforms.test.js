// Run with: node tests/lifeforms.test.js
// Lifeform building costs vs the game (levels 1 and 2 shown in the game, 5% cheaper on that planet)
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
console.log('Lifeform building costs match the game');
