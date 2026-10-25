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
      // Values from the game's Tech Info tables. Energy = energy used by the building at that level.
      buildings: {
        magma_forge:        { it: 'Fusione magmatica', effect: { metal: 0.02 }, perLevel: true, source: 'game',
          energy: { 13: 1795, 14: 2126, 15: 2506, 16: 2940, 17: 3437, 18: 4003, 19: 4648, 20: 5381, 21: 6216, 22: 7163, 23: 8237, 24: 9455, 25: 10834, 26: 12394, 27: 14158 } },
        crystal_refinery:   { it: 'Cristalleria', effect: { crystal: 0.02 }, perLevel: true, source: 'game',
          energy: { 3: 359, 4: 527, 5: 724, 6: 956, 7: 1227, 8: 1543, 9: 1909, 10: 2334, 11: 2824, 12: 3389, 13: 4039, 14: 4784, 15: 5639, 16: 6616, 17: 7733 } },
        deuterium_tuner:    { it: 'Sintonizzatore di deuterio', effect: { deut: 0.02 }, perLevel: true, source: 'game',
          energy: { 3: 359, 4: 527, 5: 724, 6: 956, 7: 1227, 8: 1543, 9: 1909, 10: 2334, 11: 2824, 12: 3389, 13: 4039, 14: 4784, 15: 5639, 16: 6616, 17: 7733 } },
        // +1.5% energy and -0.5% energy used by the mines per level (level 10 = +15% / -5%)
        disruption_chamber: { it: 'Camera di Disgregazione', effect: { energy: 0.015, mineConsumption: -0.005 }, perLevel: true, source: 'game' },
        // -0.5% cost of resource buildings per level; the game shows it rounded up (level 1 = -1%, level 3 = -2%)
        mineral_centre:     { it: 'Centro di Mineralogia', effect: { mineCost: -0.005 }, perLevel: true, level1Cost: [250000, 150000, 100000], source: 'game',
          energy: [120, 405, 790, 1370, 2227, 3475, 5270, 7831, 11452, 16543, 23656, 33549, 47248, 66147, 92134] },
        // cost, energy and build time of Rock'tal buildings; the table is not linear, so the values are kept as shown
        monolith:           { it: 'Monolite', source: 'game',
          buildingCostByLevel: { 3: -0.03, 4: -0.04, 5: -0.05, 6: -0.06, 7: -0.08, 8: -0.08, 9: -0.09, 10: -0.10, 11: -0.11, 12: -0.12, 13: -0.13, 14: -0.15, 15: -0.15, 16: -0.16, 17: -0.17 },
          energy: { 3: 527, 4: 913, 5: 1485, 6: 2316, 7: 3513, 8: 5220, 9: 7635, 10: 11028, 11: 15771, 12: 22366, 13: 31499, 14: 44098, 15: 61423, 16: 85173, 17: 117645 } },
        // Rock'tal research building: -0.25% research cost and -2% research time per level (half the cost effect of the Human one)
        tecnologicus_runarum: { it: 'Tecnologicus Runarum', effect: { techCost: -0.0025, techTime: -0.02 }, perLevel: true, source: 'game',
          energy: { 8: 257, 9: 318, 10: 389, 11: 470, 12: 564, 13: 673, 14: 797, 15: 939, 16: 1102, 17: 1288, 18: 1501, 19: 1743, 20: 2018, 21: 2331, 22: 2686 } },
        tech_boost: null, // no Rock'tal building boosts lifeform techs (game building list)
        // No effect on production, energy or costs (game descriptions): Enclave di Meditazione, Produzione di cristalli,
        // Fucina delle Rune, Orictorium, Impianto di Riciclaggio
      },
      techs: null, // production techs and per-level values: todo
    },
    humans: {
      name: 'Umani',
      note: 'Does not boost the class bonus (game description).',
      // Energy used by each building, levels 1-15, from the game's Tech Info tables (needed when we suggest these buildings)
      buildings: {
        high_energy_smelting: { it: 'Fusione ad alta energia', effect: { metal: 0.015 }, perLevel: true, source: 'game',
          energy: [40, 96, 159, 234, 322, 425, 545, 685, 848, 1037, 1255, 1506, 1795, 2126, 2506] },
        fusion_production:    { it: 'Tecniche estrattive a fusione', effect: { crystal: 0.015, deut: 0.01 }, perLevel: true, source: 'game',
          energy: [80, 193, 319, 468, 644, 850, 1091, 1371, 1697, 2074, 2510, 3012, 3590, 4253, 5012] },
        metropolis:           { it: 'Metropolis', effect: { techBoost: 0.005 }, perLevel: true, source: 'game', // boosts all techs on this planet
          energy: [90, 198, 312, 437, 574, 723, 886, 1063, 1256, 1466, 1693, 1939, 2206, 2494, 2806] },
        research_centre:      { it: 'Centro di Ricerca', effect: { techCost: -0.005, techTime: -0.02 }, perLevel: true,
          max: { techCost: -0.25, techTime: -0.99 }, source: 'guide', // level 15 = -7.5% cost, -30% time
          energy: { 13: 353, 14: 411, 15: 475, 16: 548, 17: 629, 18: 719, 19: 819, 20: 932, 21: 1057, 22: 1196, 23: 1350, 24: 1521, 25: 1712, 26: 1923, 27: 2156 } },
        // No effect on production, energy or costs (game descriptions): Zona residenziale, Fattoria della Biosfera,
        // Accademia delle Scienze, Centro di Neuro-calibrazione, Magazzino Alimentare, Grattacielo,
        // Laboratorio Biotecnologico, Scudo planetario
      },
      techs: null, // todo
    },
    mechas: {
      name: 'Mecha',
      // Values from the game's Tech Info tables. Energy = energy used by the building at that level (levels 1-15).
      buildings: {
        // Mecha research building: -0.25% research cost and -2% research time per level (shown rounded)
        robotics_research_centre: { it: 'Centro Ricerca Robotica', effect: { techCost: -0.0025, techTime: -0.02 }, perLevel: true, source: 'game',
          energy: [13, 30, 49, 70, 95, 123, 155, 192, 233, 280, 333, 392, 459, 534, 618] },
        // +1% energy and +0.3% lifeform tech effect on this planet per level
        high_performance_transformer: { it: 'Trasformatore ad alta potenza', effect: { energy: 0.01, techBoost: 0.003 }, perLevel: true, source: 'game',
          energy: [40, 88, 138, 194, 255, 321, 393, 472, 558, 651, 752, 862, 980, 1108, 1247] },
        high_performance_synthesizer: { it: 'Sintetizzatore Alte prestazioni', effect: { deut: 0.02 }, perLevel: true, source: 'game',
          energy: [60, 145, 239, 351, 483, 637, 818, 1028, 1273, 1556, 1883, 2259, 2692, 3189, 3759] },
        // +0.4% lifeform tech effect on this planet per level
        chip_mass_production: { it: 'Produzione di massa di chip', effect: { techBoost: 0.004 }, perLevel: true, source: 'game',
          energy: [70, 154, 243, 340, 446, 562, 689, 827, 977, 1140, 1316, 1508, 1715, 1940, 2182] },
        // No effect on production, energy or costs (game descriptions): Linea di produzione, Fabbrica Celle a fusione,
        // Network Aggiornamento, Centro Calcolo Quantistico, Centro Assemblaggio Automatizzato (ship build time),
        // Linea di produzione Microchip, Sala Catena di Montaggio, Nanobot Riparazione
      },
      techs: null, // todo
    },
    kaelesh: {
      name: 'Kaelesh',
      note: 'Boosts the Explorer class bonus (game description). How much: todo.',
      buildings: {
        // +0.25% effect per level, but ONLY on Kaelesh lifeform techs of this planet (game description),
        // unlike Metropolis and the Mecha buildings that boost all techs of the planet. Energy not shown in the table.
        cloning_lab: { it: 'Laboratorio Clonazione', effect: { techBoostOwnRace: 0.0025 }, perLevel: true, source: 'game' },
        vortex_chamber: null, // Camera Vortex: research cost/time reduction per level: todo (table not seen yet)
        // No effect on production, energy or costs (game descriptions): Rifugio, Condensatore Antimateria,
        // Sale della Conoscenza, Forum della Trascendenza, Convettore Antimateria, Acceleratore Crisalide,
        // Biomodificatore, Modulatore psionico (population needed for tech slots), Sala Fabbricazione Navi, Soprarifrattore
      },
      techs: null, // todo
    },
  },
};

if (typeof module !== 'undefined') module.exports = LIFEFORMS;
