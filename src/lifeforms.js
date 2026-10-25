// Lifeform data collected for OGame Advisor. Not used by the app yet.
// Every value says where it comes from:
//   'game'  = checked against numbers shown by the game
//   'guide' = official forum guide (board.it.ogame.gameforge.com, thread 494520), not yet checked on the game
//   'todo'  = still missing
// Nothing here is guessed: unknown values stay null.

const LIFEFORMS = {
  // Rules shared by all races
  rules: {
    buildingsScope: 'planet',            // guide: building effects apply only on the planet where they are built
    techScope: 'account',                // guide: tech effects apply to all planets; techs of different races can be mixed
    techSlotsPerRace: 18,                // guide
    raceSwitchCooldownHours: 48,         // guide
    // Effective tech bonus = base x (1 + tech-boost building of the planet) x (1 + race level bonus)  (guide example 2, recomputed: 1.599 vs 1.598 shown)
    techBonusFormula: 'base * (1 + buildingBoost) * (1 + levelBonus)',
    levelBonusPerLevel: { value: 0.001, source: 'game' }, // game: Humans level 40 = 4%, Rock'tal level 44 = 4.4% (guide says 1% per level: outdated)
  },

  races: {
    rocktal: {
      name: "Rock'tal",
      note: 'Boosts the Collector class bonus (game description). How much: todo.',
      buildings: {
        magma_forge:        { it: 'Fusione magmatica',          effect: { metal: 0.02 },  perLevel: true, source: 'game' },
        crystal_refinery:   { it: 'Cristalleria',               effect: { crystal: 0.02 }, perLevel: true, source: 'game' },
        deuterium_tuner:    { it: 'Sintonizzatore di deuterio', effect: { deut: 0.02 },    perLevel: true, source: 'game' },
        disruption_chamber: { it: 'Camera di Disgregazione',    effect: { energy: 0.015 }, perLevel: true, source: 'game' },
        mineral_centre:     { it: 'Centro di Mineralogia',      effect: { mineCost: -0.005 }, perLevel: true, level1Cost: [250000, 150000, 100000], source: 'game' },
        tech_boost:         null, // building that boosts lifeform techs: todo
        research_cost:      null, // equivalent of the Humans Research Centre: todo
      },
      techs: null, // production techs and per-level values: todo
    },
    humans: {
      name: 'Umani',
      note: 'Does not boost the class bonus (game description).',
      buildings: {
        metropolis:      { it: 'Metropolis', effect: { techBoost: 0.005 }, perLevel: true, source: 'guide' }, // level 9 = +4.5%
        research_centre: { it: 'Centro di Ricerca', effect: { techCost: -0.005, techTime: -0.02 }, perLevel: true,
                           max: { techCost: -0.25, techTime: -0.99 }, source: 'guide' }, // level 15 = -7.5% cost, -30% time
      },
      techs: null, // todo
    },
    mechas: { name: 'Mecha', buildings: null, techs: null },   // todo
    kaelesh: { name: 'Kaelesh', buildings: null, techs: null }, // todo
  },
};

if (typeof module !== 'undefined') module.exports = LIFEFORMS;
