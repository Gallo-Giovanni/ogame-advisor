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
// Costi dai fogli della community: coincidono con quelli verificati sul gioco, e completano le altre razze
for (const [race, R] of Object.entries(LF.races)) R.buildingOrder.forEach((k, i) => {
  const b = R.buildings[k], sh = LF.sheet[race].buildings[i];
  assert.ok(b.cost, race + ' ' + k + ' ha un costo');
  if (b.cost.source !== 'sheet') assert.deepStrictEqual([b.cost.base, b.cost.factor], sh, race + ' ' + k + ': foglio uguale al gioco');
});
// Fusione ad alta energia (Umani) entra nei consigli come la Fusione magmatica
const E2 = require('../src/engine.js');
const hum = { id: 'h', name: 'H', position: 8, temp_max: 40, metal_mine: 30, crystal_mine: 25, deut_synth: 25, solar_plant: 25, fusion_reactor: 0,
  solar_satellites: 0, energy_balance: 3000, lf_race: 'humans', lf_buildings: { high_energy_smelting: 5 }, lf_techs: {} };
const rec = E2.recommendations({ player_class: 'explorer', economy_speed: 5, ratio_metal: 1, ratio_crystal: 1.5, ratio_deut: 2.5 }, [hum]).find(r => r.key === 'high_energy_smelting');
assert.ok(rec && rec.nextLevel === 6 && rec.race === 'humans');
assert.deepStrictEqual(rec.buildCost, E2.lfBuildingCost(LF.races.humans.buildings.high_energy_smelting, 6, 0));
// Durata della Fusione magmatica su Gonnia (Robot 10, Naniti 7, Monolite 5, velocità 5): 15 = 3m 27s, 16 = 4m 47s, 17 = 6m 36s
assert.deepStrictEqual([15, 16, 17].map(L => E2.lfBuildingTime(mf, L, 0.05, 10, 7, 5)), [207, 287, 396]);
// Durate di livello 1 e 2 di tutti gli edifici (velocità 1, senza robot): la formula le riproduce
// (al secondo; al minuto quando il calcolatore non mostra i secondi)
const DU = { rocktal: [[48,117],[48,117],[20000,50000],[25600,81920],[108780,369900],[2600,6760],[20000,50000],[56000,156780],[48000,115200],[62400,149760],[117000,304200],[123480,321060]],
  humans: [[48,117],[50,125],[20000,50000],[25600,81920],[108780,369900],[2600,6760],[14040,32853],[33600,80640],[48000,115200],[62400,149760],[117000,304200],[114000,273600]],
  mechas: [[48,119],[57,138],[20000,50000],[25600,81920],[108780,369900],[2600,6760],[22400,62719],[14040,32853],[52000,135180],[62400,149760],[65000,168960],[132960,372360]],
  kaelesh: [[48,119],[48,119],[20000,50000],[27200,92460],[115200,414720],[2700,7290],[14400,34560],[18880,44556],[48000,115200],[93600,336960],[117000,304200],[123480,321060]] };
for (const [race, arr] of Object.entries(DU)) arr.forEach(([t1, t2], i) => {
  const b = LF.races[race].buildings[LF.races[race].buildingOrder[i]];
  [[1, t1], [2, t2]].forEach(([L, t]) => { const got = E2.lfBuildingTime(b, L, 0, 0, 0, 1); assert.ok(got - t >= 0 && got - t < (t > 3600 ? 60 : 1), race + ' ' + b.it + ' livello ' + L + ': ' + got + ' invece di ' + t); });
});
console.log('Energia e Monolite uguali al gioco; costi dei fogli coerenti; durate di tutti gli edifici forme di vita coerenti');
// Requisiti degli edifici forme di vita (Albero tecnologico del gioco, Umani): Fusione ad alta energia 1 richiede il
// Centro di Ricerca 5, che richiede Zona residenziale 21 e Fattoria della Biosfera 22; costo e livelli entrano nel consiglio
{
  const h2 = { ...hum, lf_buildings: { residential_sector: 10, biosphere_farm: 12 } };
  const r2 = E2.recommendations({ player_class: 'explorer', economy_speed: 5, ratio_metal: 1, ratio_crystal: 1.5, ratio_deut: 2.5 }, [h2]).find(r => r.key === 'high_energy_smelting');
  assert.deepStrictEqual(r2.lfPre.map(x => [x.key, x.from, x.to]), [['residential_sector', 10, 21], ['biosphere_farm', 12, 22], ['research_centre', 0, 5]]);
  const H = LF.races.humans.buildings, sum = (b, a, z) => { let c = [0, 0, 0]; for (let L = a + 1; L <= z; L++) c = c.map((x, i) => x + E2.lfBuildingCost(b, L)[i]); return c; };
  const pre = [sum(H.residential_sector, 10, 21), sum(H.biosphere_farm, 12, 22), sum(H.research_centre, 0, 5)].reduce((a, c) => a.map((x, i) => x + c[i]));
  const own = E2.lfBuildingCost(H.high_energy_smelting, 1);
  assert.deepStrictEqual(r2.cost.map((x, i) => x - (r2.fix ? r2.fix.cost[i] : 0)), own.map((x, i) => x + pre[i]));
  const done = E2.applyRecommendation({ economy_speed: 5 }, h2, r2).planet.lf_buildings;
  assert.deepStrictEqual([done.residential_sector, done.biosphere_farm, done.research_centre, done.high_energy_smelting], [21, 22, 5, 1]);
  console.log('ok requisiti edifici forme di vita (Umani)');
}
// Requisiti Rock'tal: Centro di Mineralogia su un pianeta nuovo richiede tutta la catena fino all'Enclave di Meditazione
{
  const LFr = LF.races.rocktal;
  const pl = { id: 'r', name: 'R', position: 8, temp_max: 40, metal_mine: 20, crystal_mine: 16, deut_synth: 12, solar_plant: 25, lf_race: 'rocktal', lf_buildings: { meditation_enclave: 30, crystal_farm: 25 }, lf_techs: {} };
  const recs = E2.recommendations({ player_class: 'explorer', economy_speed: 5, ratio_metal: 1, ratio_crystal: 1.5, ratio_deut: 2.5 }, [pl]);
  const cr = recs.find(r => r.key === 'crystal_refinery');
  assert.deepStrictEqual(cr.lfPre.map(x => [x.key, x.to]), [['meditation_enclave', 41], ['rune_forge', 1], ['monolith', 1]]);
  const tr = recs.find(r => r.key === 'tecnologicus_runarum');
  assert.ok(!tr || tr.lfPre.length === 0, 'Enclave 30 e Produzione di cristalli 25 bastano per il Tecnologicus Runarum');
  console.log('ok requisiti Rock\'tal');
}
// Requisiti Mecha: Sintetizzatore Alte prestazioni su un pianeta nuovo
{
  const pl = { id: 'm', name: 'M', position: 8, temp_max: 40, metal_mine: 20, crystal_mine: 16, deut_synth: 12, solar_plant: 25, lf_race: 'mechas', lf_buildings: { assembly_line: 20, fusion_cell_factory: 20 }, lf_techs: {} };
  const recs = E2.recommendations({ player_class: 'explorer', economy_speed: 5, ratio_metal: 1, ratio_crystal: 1.5, ratio_deut: 2.5 }, [pl]);
  const hs = recs.find(r => r.key === 'high_performance_synthesizer');
  assert.deepStrictEqual(hs.lfPre.map(x => [x.key, x.to]), [['assembly_line', 41], ['update_network', 1], ['microchip_assembly_line', 2]]);
  console.log('ok requisiti Mecha');
}
// Requisiti Kaelesh: Convettore Antimateria su un pianeta nuovo
{
  const pl = { id: 'k', name: 'K', position: 8, temp_max: 40, metal_mine: 20, crystal_mine: 16, deut_synth: 12, solar_plant: 25, lf_race: 'kaelesh', lf_buildings: { sanctuary: 15, antimatter_condenser: 18 }, lf_techs: {} };
  const recs = E2.recommendations({ player_class: 'explorer', economy_speed: 5, ratio_metal: 1, ratio_crystal: 1.5, ratio_deut: 2.5 }, [pl]);
  const ac = recs.find(r => r.key === 'antimatter_convector');
  if (ac) assert.deepStrictEqual(ac.lfPre.map(x => [x.key, x.to]), [['sanctuary', 20], ['antimatter_condenser', 21], ['vortex_chamber', 5]]);
  const pre = E2.lfPrereq({}, pl, 'kaelesh', 'ship_manufacturing_hall');
  assert.deepStrictEqual(pre.steps.map(x => [x.key, x.to]), [['sanctuary', 42], ['halls_of_realisation', 1], ['chrysalis_accelerator', 1], ['bio_modifier', 6], ['forum_of_transcendence', 1]]);
  console.log('ok requisiti Kaelesh');
}
