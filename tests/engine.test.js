// Avvio: node tests/engine.test.js
// I dati di esempio sono generici: non vengono da nessun account reale.
const assert = require('assert');
const E = require('../src/engine.js');

// Valori noti dalla wiki di OGame
assert.deepStrictEqual(E.levelCost('metal_mine', 1), [60, 15, 0]);
assert.deepStrictEqual(E.levelCost('metal_mine', 2), [90, 22, 0]);
assert.deepStrictEqual(E.levelCost('crystal_mine', 2), [76, 38, 0]);
assert.deepStrictEqual(E.levelCost('plasma', 1), [2000, 4000, 1000]);
assert.strictEqual(E.consumption.metal_mine(1), 11);
assert.strictEqual(E.solarEnergy(1), 22);
assert.strictEqual(E.satelliteEnergy(40), 30);

// Impero di esempio: economia x5, Esploratore, tre pianeti A, B, C
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
assert.strictEqual(recs[0].type, 'energy', 'il deficit di energia deve venire per primo');
assert.strictEqual(recs[0].planet, 'B');
const cMetal = recs.find(r => r.planet === 'C' && r.key === 'metal_mine');

// Completare la correzione dell'energia deve portare il bilancio a >= 0
const fixPatch = E.applyRecommendation(profile, planets[1], recs[0]);
assert.ok(fixPatch.planet.energy_balance >= 0);
// Completare una miniera imposta il livello e mantiene l'energia >= 0 quando c'è una correzione
const cPatch = E.applyRecommendation(profile, planets[2], cMetal);
assert.strictEqual(cPatch.planet.metal_mine, 30);
assert.ok(cPatch.planet.energy_balance >= 0 || !cMetal.fix);

// Item e bonus forme di vita sono una % della riga miniera; gli item si possono escludere dalla classifica
const boosted = { ...planets[0], item_metal: 40 };
const base = E.planetState(profile, planets[0]).full[0];
assert.ok(Math.abs(E.planetState(profile, boosted).full[0] / base - 1.40) < 1e-9);
const gainWith = E.recommendations(profile, [boosted]).find(r => r.key === 'metal_mine').gainEq;
const gainWithout = E.recommendations({ ...profile, items_in_ranking: false }, [boosted]).find(r => r.key === 'metal_mine').gainEq;
const gainPlain = E.recommendations(profile, [planets[0]]).find(r => r.key === 'metal_mine').gainEq;
assert.ok(gainWith > gainPlain && Math.abs(gainWithout - gainPlain) < 1e-9);
// Il bonus forme di vita è per pianeta
const lfPlanet = { ...planets[0], lf_metal: 25 };
assert.ok(Math.abs(E.planetState(profile, lfPlanet).full[0] / base - 1.25) < 1e-9);
// I dati vecchi senza valori per pianeta usano il valore dell'account
const legacy = { ...planets[0] }; delete legacy.lf_metal;
assert.ok(Math.abs(E.planetState({ ...profile, lf_bonus_metal: 10 }, legacy).full[0] / base - 1.10) < 1e-9);

// I pianeti esclusi non entrano in classifica né nei totali
const excl = planets.map(p => (p.name === 'B' ? { ...p, included: false } : p));
assert.ok(!E.recommendations(profile, excl).some(r => r.planet === 'B'));
assert.ok(E.totals(profile, excl)[0] < E.totals(profile, planets)[0]);

// Astrofisica: 1 + ceil(livello/2) pianeti
assert.deepStrictEqual([0, 1, 2, 3, 20].map(E.maxPlanets), [1, 2, 2, 3, 11]);
assert.strictEqual(E.astroLevelsForNextPlanet(20, 11), 1);
assert.strictEqual(E.astroLevelsForNextPlanet(19, 11), 2);
assert.strictEqual(E.astroLevelsForNextPlanet(21, 11), 0);
assert.deepStrictEqual(E.levelCost('astro', 1), [4000, 8000, 4000]);
assert.deepStrictEqual(E.buildUpCost('metal_mine', 2), [150, 37, 0]);

// Nuova colonia: livelli mediani delle miniere dell'impero
const empire = Array.from({ length: 11 }, (_, i) => ({ ...planets[0], id: 'p' + i, name: 'P' + i, metal_mine: i === 0 ? 10 : 30, energy_balance: 3000 }));
const colony = E.recommendations({ ...profile, astro_tech: 20 }, empire).find(r => r.type === 'colony');
assert.ok(colony && colony.nextLevel === 21 && colony.colony.metal_mine === 30, 'la mediana ignora il pianeta molto indietro');
assert.strictEqual(colony.astroCost[0], 100 * Math.floor(0.5 + 40 * Math.pow(1.75, 20)));
// Limiti
const capped = E.recommendations({ ...profile, cap_metal: 30, cap_plasma: 0, cap_astro: 20, astro_tech: 20 }, empire);
assert.ok(!capped.some(r => (r.key === 'metal_mine' && r.nextLevel > 30) || r.type === 'plasma' || r.type === 'colony'));
assert.ok(capped.some(r => r.key === 'crystal_mine'));
assert.strictEqual(E.applyRecommendation(profile, null, colony).profile.astro_tech, 21);

// Crawler: bonus Collezionista x1,5, +10% di crawler con il Geologo, sovraccarico solo per il Collezionista
const cr = { ...planets[0], crawlers: 10000, crawler_pct: 150 };
assert.strictEqual(E.maxCrawlers(cr, profile), 640);
assert.strictEqual(E.maxCrawlers(cr, { ...profile, player_class: 'collector', geologist: true }), 704);
const noOver = E.planetState(profile, cr), over = E.planetState({ ...profile, player_class: 'collector' }, cr);
assert.ok(Math.abs(noOver.mult.metal / 1.23 - (1 + 640 * 0.0002)) < 1e-9, 'chi non è Collezionista si ferma al 100%');
assert.ok(Math.abs(over.mult.metal / 1.23 - (1.25 + 640 * 0.0003 * 1.5)) < 1e-9, 'sovraccarico del Collezionista al 150%');

// Il booster su tutte e tre le risorse si somma a quello della singola risorsa, non all'energia
const both = E.planetState(profile, { ...planets[0], item_metal: 40, item_all: 40 });
assert.ok(Math.abs(both.full[0] / base - 1.80) < 1e-9);
assert.ok(Math.abs(both.mult.energy - E.planetState(profile, planets[0]).mult.energy) < 1e-12);

// ---- Forme di vita ----
// Effetto ricerca = base x livello x (1 + potenziamento edifici del pianeta) x (1 + 0,1% x livello razza) (esempio della guida: x1,045 x1,02)
const human = { ...planets[0], id: 'h', lf_race: 'humans', lf_buildings: { metropolis: 9 }, lf_techs: { 2: { race: 'humans', level: 10 } } };
const lfProfile = { ...profile, lf_level_humans: 20 };
const eff = E.techEffect(lfProfile, human, 2, human.lf_techs[2]);
assert.ok(Math.abs(eff.metal - 0.0006 * 10 * 1.045 * 1.02) < 1e-12);
// Le ricerche agiscono su tutti i pianeti: anche un pianeta senza forme di vita riceve il totale dell'account
const plain = { ...planets[1], id: 'p' };
const withLf = E.withLifeforms(lfProfile, [human, plain]);
assert.ok(withLf._lf.computed);
const baseRow = E.planetState({ ...profile, _lf: { computed: true, tech: { metal: 0, crystal: 0, deut: 0, energy: 0, plasma_tech_cost: 0 } } }, plain).full[0];
assert.ok(Math.abs(E.planetState(withLf, plain).full[0] / baseRow - (1 + eff.metal)) < 1e-9);
// Edifici Rock'tal: Fusione magmatica 15 = +30% metallo (come la pagina del gioco), Camera di Disgregazione 10 = -5% energia miniere
const rock = { ...planets[0], id: 'r', lf_race: 'rocktal', lf_buildings: { magma_forge: 15, disruption_chamber: 10 }, lf_techs: {} };
const be = E.buildingEffects(rock);
assert.ok(Math.abs(be.metal - 0.30) < 1e-12 && Math.abs(be.mineConsumption + 0.05) < 1e-12 && Math.abs(be.energy - 0.15) < 1e-12);
const rockState = E.planetState(E.withLifeforms(profile, [rock]), rock);
const rockPlain = E.planetState(profile, { ...rock, lf_race: null });
assert.ok(Math.abs(rockState.full[0] / rockPlain.full[0] - 1.30) < 1e-9);
// Il Laboratorio Clonazione Kaelesh potenzia solo le ricerche Kaelesh del suo pianeta
const kae = { ...planets[0], id: 'k', lf_race: 'kaelesh', lf_buildings: { cloning_lab: 10 },
  lf_techs: { 2: { race: 'kaelesh', level: 10 }, 8: { race: 'humans', level: 10 } } };
assert.ok(Math.abs(E.techEffect(profile, kae, 2, kae.lf_techs[2]).deut - 0.0008 * 10 * 1.025) < 1e-12);
assert.ok(Math.abs(E.techEffect(profile, kae, 8, kae.lf_techs[8]).metal - 0.0006 * 10) < 1e-12);
// Il Concentratore astrale Rock'tal riduce il costo del Plasma
const stel = { ...planets[0], id: 's', lf_race: null, lf_techs: { 9: { race: 'rocktal', level: 10 } } };
const plasmaRec = E.recommendations(profile, [stel]).find(r => r.type === 'plasma');
assert.deepStrictEqual(plasmaRec.cost, E.levelCost('plasma', 1).map(x => Math.round(x * (1 - 0.015))));

// Il bonus dei crawler si ferma a +50% (guida ufficiale)
const many = { ...planets[0], metal_mine: 60, crystal_mine: 60, deut_synth: 60, crawlers: 5000, crawler_pct: 150 };
const coll = { ...profile, player_class: 'collector' };
const ms = E.planetState(coll, many).mult.metal / 1.23;
assert.ok(Math.abs(ms - (1 + 0.25 + 0.5)) < 1e-9);
// energyModel conta i satelliti solari
assert.strictEqual(E.energyModel(profile, { ...planets[0], solar_satellites: 100 }).produced - E.energyModel(profile, planets[0]).produced, 100 * E.satelliteEnergy(40));

// Piano: applica l'upgrade migliore e ricalcola; livelli della stessa voce raggruppati, primo passo = migliore attuale
const planSteps = E.plan(profile, planets, 30);
assert.strictEqual(planSteps[0].title, E.recommendations(profile, planets)[0].title);
const groups = E.planGroups(planSteps);
assert.strictEqual(groups.reduce((t, g) => t + g.count, 0), planSteps.length);
assert.ok(groups.some(g => g.count > 1), 'qualche voce resta la scelta migliore per più livelli');
assert.ok(groups.every(g => g.steps.every((x, i) => i === 0 || x.nextLevel === g.steps[i - 1].nextLevel + 1 || x.type === 'energy')));

console.log('Tutti i test superati');
