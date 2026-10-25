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
    techSlotsPerRace: 18,                // guide; slots 1-6 = T1, 7-12 = T2, 13-18 = T3 (game)
    // each slot N holds slot N of ONE race, chosen by the player (game, confirmed by the player)
    raceSwitchCooldownHours: 48,         // guide
    // Effective tech bonus = base x (1 + tech-boost building of the planet) x (1 + race level bonus)  (guide example 2, recomputed: 1.599 vs 1.598 shown)
    techBonusFormula: 'base * (1 + buildingBoost) * (1 + levelBonus)',
    // Cost of a lifeform building at level L = base x factor^(L-1) x L; the Monolith lowers Rock'tal costs
    // and energy (Monolith 5 = -5%, confirmed by the player)
    buildingCostFormula: 'base * factor^(L-1) * L',      // checked on 7 Rock'tal buildings, levels 1-2 and 15->16
    // Energy used by a lifeform building at level L = floor(L x base x factor^L) (fits the Tech Info tables from
    // level 2 up; the tables show level 1 = base). Upgrading uses the difference; the Monolith also lowers it
    // (Magma Forge 15->16: (2940 - 2506) x 0.95 = 413 shown by the game).
    buildingEnergyFormula: 'floor(L * base * factor^L)',
    // Cost of a lifeform tech at level L = base x factor^(L-1) x L, lowered by the research building of the planet
    // where it is researched. Base costs from the game's research window (levels 1 and 2 of six T1 and six T2 techs, all with
    // a -2.5% research discount: 10000 x 0.975 = 9.8k, 10000 x 1.5 x 2 x 0.975 = 29.3k). The factor differs per tech (most 1.5, Telekinetic Drive 1.2). Checked on the game up to level 10 (six T1 techs).
    techCostFormula: 'base * factor^(L-1) * L',
    levelBonusPerLevel: { value: 0.001, source: 'game' }, // game: Humans level 40 = 4%, Rock'tal level 44 = 4.4% (guide says 1% per level: outdated)
  },

  races: {
    rocktal: {
      name: "Rock'tal",
      note: 'Boosts the Collector class bonus (game description). How much: todo.',
      // Values from the game's Tech Info tables. Energy = energy used by the building at that level.
      buildings: {
        meditation_enclave: { it: 'Enclave di Meditazione', used: false }, // no effect on production, energy or costs
        crystal_farm: { it: 'Produzione di cristalli', used: false }, // no effect on production, energy or costs
        rune_forge: { it: 'Fucina delle Rune', used: false }, // no effect on production, energy or costs
        oriktorium: { it: 'Orictorium', used: false }, // no effect on production, energy or costs
        // level 1: 237.5k / 118.8k / 118.8k, 95 energy (game, shown rounded)
        recycling_plant: { it: 'Impianto di Riciclaggio', used: false }, // no effect on production, energy or costs
        magma_forge:        { it: 'Fusione magmatica', effect: { metal: 0.02 }, perLevel: true, source: 'game',
          cost: { base: [10000, 8000, 1000], factor: 1.4 }, energyCons: { base: 40, factor: 1.1 },
          energy: { 13: 1795, 14: 2126, 15: 2506, 16: 2940, 17: 3437, 18: 4003, 19: 4648, 20: 5381, 21: 6216, 22: 7163, 23: 8237, 24: 9455, 25: 10834, 26: 12394, 27: 14158 } },
        crystal_refinery:   { it: 'Cristalleria', effect: { crystal: 0.02 }, perLevel: true, source: 'game',
          cost: { base: [85000, 44000, 25000], factor: 1.4 }, energyCons: { base: 90, factor: 1.1 },
          energy: { 3: 359, 4: 527, 5: 724, 6: 956, 7: 1227, 8: 1543, 9: 1909, 10: 2334, 11: 2824, 12: 3389, 13: 4039, 14: 4784, 15: 5639, 16: 6616, 17: 7733 } },
        deuterium_tuner:    { it: 'Sintonizzatore di deuterio', effect: { deut: 0.02 }, perLevel: true, source: 'game',
          cost: { base: [120000, 50000, 20000], factor: 1.4 }, energyCons: { base: 90, factor: 1.1 },
          energy: { 3: 359, 4: 527, 5: 724, 6: 956, 7: 1227, 8: 1543, 9: 1909, 10: 2334, 11: 2824, 12: 3389, 13: 4039, 14: 4784, 15: 5639, 16: 6616, 17: 7733 } },
        // +1.5% energy and -0.5% energy used by the mines per level (level 10 = +15% / -5%)
        disruption_chamber: { it: 'Camera di Disgregazione', effect: { energy: 0.015, mineConsumption: -0.005 }, perLevel: true, source: 'game',
          cost: { base: [20000, 15000, 10000], factor: 1.2 } },
        // -0.5% cost of resource buildings per level; the game shows it rounded up (level 1 = -1%, level 3 = -2%)
        mineral_centre:     { it: 'Centro di Mineralogia', effect: { mineCost: -0.005 }, perLevel: true, level1Cost: [250000, 150000, 100000], source: 'game',
          cost: { base: [250000, 150000, 100000], factor: 1.8 }, energyCons: { base: 120, factor: 1.3 },
          energy: [120, 405, 790, 1370, 2227, 3475, 5270, 7831, 11452, 16543, 23656, 33549, 47248, 66147, 92134] },
        // cost, energy and build time of Rock'tal buildings; the table is not linear, so the values are kept as shown
        monolith:           { it: 'Monolite', source: 'game',
          cost: { base: [50000, 35000, 15000], factor: 1.5 }, energyCons: { base: 80, factor: 1.3 },
          buildingCostByLevel: { 3: -0.03, 4: -0.04, 5: -0.05, 6: -0.06, 7: -0.08, 8: -0.08, 9: -0.09, 10: -0.10, 11: -0.11, 12: -0.12, 13: -0.13, 14: -0.15, 15: -0.15, 16: -0.16, 17: -0.17 },
          energy: { 3: 527, 4: 913, 5: 1485, 6: 2316, 7: 3513, 8: 5220, 9: 7635, 10: 11028, 11: 15771, 12: 22366, 13: 31499, 14: 44098, 15: 61423, 16: 85173, 17: 117645 } },
        // Rock'tal research building: -0.25% research cost and -2% research time per level (half the cost effect of the Human one)
        tecnologicus_runarum: { it: 'Tecnologicus Runarum', effect: { techCost: -0.0025, techTime: -0.02 }, perLevel: true, source: 'game',
          cost: { base: [40000, 10000, 15000], factor: 1.3 }, energyCons: { base: 15, factor: 1.1 },
          energy: { 8: 257, 9: 318, 10: 389, 11: 470, 12: 564, 13: 673, 14: 797, 15: 939, 16: 1102, 17: 1288, 18: 1501, 19: 1743, 20: 2018, 21: 2331, 22: 2686 } },
        tech_boost: null, // no Rock'tal building boosts lifeform techs (game building list)
        // No effect on production, energy or costs (game descriptions): Enclave di Meditazione, Produzione di cristalli,
        // Fucina delle Rune, Orictorium, Impianto di Riciclaggio
      },
      // all 12 buildings in the order the game shows them (slots 1-12)
      buildingOrder: ['meditation_enclave', 'crystal_farm', 'tecnologicus_runarum', 'rune_forge', 'oriktorium', 'magma_forge', 'disruption_chamber', 'monolith', 'crystal_refinery', 'deuterium_tuner', 'mineral_centre', 'recycling_plant'],
      // 18 techs from the game's Tech Info tables. Slots 1-6 = T1, 7-12 = T2, 13-18 = T3. Base values per level.
      techs: [
        { slot: 1,  tier: 1, key: 'volcanic_batteries',      it: 'Batterie vulcaniche',              perLevel: { energy: 0.0025 }, used: true },
        { slot: 2,  tier: 1, key: 'acoustic_scanning',       it: 'Sondaggio acustico',               perLevel: { crystal: 0.0008 }, used: true },
        { slot: 3,  tier: 1, key: 'high_energy_pump_systems', it: 'Sistemi di pompaggio ad alta energia', perLevel: { deut: 0.0008 }, cost: { base: [15000, 10000, 5000], factor: 1.5 }, used: true },
        { slot: 4,  tier: 1, key: 'cargo_hold_expansion_civil', it: 'Espansione stiva (navi civili)', perLevel: { civil_cargo: 0.004 }, used: false },
        { slot: 5,  tier: 1, key: 'magma_powered_production', it: 'Tecniche estrattive magmatiche',   perLevel: { metal: 0.0008, crystal: 0.0008, deut: 0.0008 }, used: true },
        { slot: 6,  tier: 1, key: 'geothermal_power_plants', it: 'Centrali Geotermoelettriche',      perLevel: { energy: 0.0025 }, used: true },
        { slot: 7,  tier: 2, key: 'depth_sounding',          it: 'Sondaggio da alte profondità',     perLevel: { metal: 0.0008 }, cost: { base: [70000, 40000, 20000], factor: 1.5 }, used: true },
        { slot: 8,  tier: 2, key: 'ion_crystal_heavy_fighter', it: 'Potenziamento da cristallo ionico (Caccia pesante)', perLevel: { ship: 'heavy_fighter', armour: 0.003, shield: 0.003, weapons: 0.003, cargo: 0.003, speed: 0.003 }, used: false },
        // reduces cost and time of the Plasma technology: changes the cost of the Plasma recommendation
        { slot: 9,  tier: 2, key: 'improved_stellarator',    it: 'Concentratore astrale',            perLevel: { plasma_tech_cost: -0.0015, plasma_tech_time: -0.003 }, cost: { base: [75000, 55000, 25000], factor: 1.5 }, used: true },
        { slot: 10, tier: 2, key: 'hardened_diamond_drill_heads', it: 'Punte di diamante irrobustite', perLevel: { metal: 0.0008 }, used: true },
        { slot: 11, tier: 2, key: 'seismic_mining_tech',     it: 'Tecnologie minerarie sismiche',    perLevel: { crystal: 0.0008 }, used: true },
        { slot: 12, tier: 2, key: 'magma_powered_pump_systems', it: 'Sistema di pompaggio al magma', perLevel: { deut: 0.0008 }, used: true },
        // crawler bonus and crawler energy use: whether these % are relative to the crawler values is still to be checked on the game
        { slot: 13, tier: 3, key: 'ion_crystal_modules',     it: 'Moduli Cristalli ionici',          perLevel: { crawler_bonus: 0.001, crawler_energy: -0.001 }, used: true, formula: 'todo' },
        { slot: 14, tier: 3, key: 'optimised_silo_construction', it: 'Costruzione Base ottimizzata', perLevel: { missile_silo_cost: -0.001, missile_silo_time: -0.002 }, used: false },
        { slot: 15, tier: 3, key: 'diamond_energy_transmitter', it: 'Trasmettitore energetico Diamante', perLevel: { energy_tech_cost: -0.001, energy_tech_time: -0.002 }, used: false },
        { slot: 16, tier: 3, key: 'obsidian_shield_reinforcement', it: 'Miglioramento Scudo ossidiana', perLevel: { defense_armour: 0.005, defense_shield: 0.005, defense_weapons: 0.005 }, used: false },
        { slot: 17, tier: 3, key: 'rune_shields',            it: 'Scudi runici',                     perLevel: { armour_tech_cost: -0.002, armour_tech_time: -0.002 }, used: false },
        // raises every Collector class bonus except crawler overload and the build-speedup discount (game description);
        // how it applies (relative to the class bonus?) is still to be checked on the game
        { slot: 18, tier: 3, key: 'rocktal_collector_enhancement', it: "Potenziamento Collezionista Rock`tal", perLevel: { collector_class_bonus: 0.002 }, used: true, formula: 'todo' },
      ],
      techSource: 'game',
      techCosts: null, // todo
    },
    humans: {
      name: 'Umani',
      note: 'Does not boost the class bonus (game description).',
      // Energy used by each building, levels 1-15, from the game's Tech Info tables (needed when we suggest these buildings)
      buildings: {
        residential_sector: { it: 'Zona residenziale', used: false }, // no effect on production, energy or costs
        biosphere_farm: { it: 'Fattoria della Biosfera', used: false }, // no effect on production, energy or costs
        academy_of_sciences: { it: 'Accademia delle Scienze', used: false }, // no effect on production, energy or costs
        neuro_calibration_centre: { it: 'Centro di Neuro-calibrazione', used: false }, // no effect on production, energy or costs
        food_silo: { it: 'Magazzino Alimentare', used: false }, // no effect on production, energy or costs
        skyscraper: { it: 'Grattacielo', used: false }, // no effect on production, energy or costs
        biotech_lab: { it: 'Laboratorio Biotecnologico', used: false }, // no effect on production, energy or costs
        planetary_shield: { it: 'Scudo planetario', used: false }, // no effect on production, energy or costs
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
      // 18 techs from the game's Tech Info tables. Slots 1-6 = T1, 7-12 = T2, 13-18 = T3.
      // perLevel = base effect for each level, before the Metropolis/level boosts. All are linear in the tables.
      // all 12 buildings in the order the game shows them (slots 1-12)
      buildingOrder: ['residential_sector', 'biosphere_farm', 'research_centre', 'academy_of_sciences', 'neuro_calibration_centre', 'high_energy_smelting', 'food_silo', 'fusion_production', 'skyscraper', 'biotech_lab', 'metropolis', 'planetary_shield'],
      // used: true = changes production, energy or costs, so it enters the recommendations.
      techs: [
        { slot: 1,  tier: 1, key: 'intergalactic_envoys',    it: 'Ambasciatori intergalattici',     perLevel: { recon_fleet_speed: 0.01 }, used: false },
        { slot: 2,  tier: 1, key: 'high_performance_extractors', it: 'Estrattori ad alto rendimento', perLevel: { metal: 0.0006, crystal: 0.0006, deut: 0.0006 }, cost: { base: [7000, 10000, 5000], factor: 1.5 }, used: true },
        { slot: 3,  tier: 1, key: 'fusion_drives',           it: 'Propulsore a fusione',            perLevel: { civil_ship_speed: 0.005 }, used: false },
        { slot: 4,  tier: 1, key: 'stealth_field_generator', it: 'Generatore di campo mimetico',    perLevel: { espionage_tech_cost: -0.001, espionage_tech_time: -0.002 }, used: false },
        { slot: 5,  tier: 1, key: 'orbital_den',             it: 'Nascondiglio Orbitale',           perLevel: { protected_resources: 0.04 }, used: false },
        { slot: 6,  tier: 1, key: 'research_ai',             it: 'AI di ricerca',                   perLevel: { research_time: -0.001, lf_research_time: -0.001 }, used: false },
        { slot: 7,  tier: 2, key: 'high_performance_terraformer', it: 'Terraformer ad alte prestazioni', perLevel: { terraformer_cost: -0.001, terraformer_time: -0.002 }, used: false },
        { slot: 8,  tier: 2, key: 'enhanced_production_tech', it: 'Tecnologie di estrazione migliorate', perLevel: { metal: 0.0006, crystal: 0.0006, deut: 0.0006 }, cost: { base: [80000, 50000, 20000], factor: 1.5 }, used: true },
        { slot: 9,  tier: 2, key: 'light_fighter_mk2',       it: 'Caccia leggero mk II',            perLevel: { ship: 'light_fighter', armour: 0.003, shield: 0.003, weapons: 0.003, cargo: 0.003, speed: 0.003 }, used: false },
        { slot: 10, tier: 2, key: 'cruiser_mk2',             it: 'Incrociatore mk II',              perLevel: { ship: 'cruiser', armour: 0.003, shield: 0.003, weapons: 0.003, cargo: 0.003, speed: 0.003 }, used: false },
        { slot: 11, tier: 2, key: 'improved_lab_tech',       it: 'Tecnologia di laboratorio migliorata', perLevel: { research_time: -0.001, lf_research_time: -0.001 }, used: false },
        { slot: 12, tier: 2, key: 'plasma_terraformer',      it: 'Terraformer al plasma',           perLevel: { terraformer_cost: -0.001, terraformer_time: -0.002 }, used: false },
        { slot: 13, tier: 3, key: 'low_temperature_drives',  it: 'Propulsori a bassa temperatura',  perLevel: { espionage_tech_cost: -0.001, espionage_tech_time: -0.002 }, used: false },
        { slot: 14, tier: 3, key: 'bomber_mk2',              it: 'Bombardiere mk II',               perLevel: { ship: 'bomber', armour: 0.003, shield: 0.003, weapons: 0.003, cargo: 0.003, speed: 0.003 }, used: false },
        { slot: 15, tier: 3, key: 'destroyer_mk2',           it: 'Corazzata mk II',                 perLevel: { ship: 'destroyer', armour: 0.003, shield: 0.003, weapons: 0.003, cargo: 0.003, speed: 0.003 }, used: false },
        { slot: 16, tier: 3, key: 'battlecruiser_mk2',       it: 'Incrociatore da battaglia mk II', perLevel: { ship: 'battlecruiser', armour: 0.003, shield: 0.003, weapons: 0.003, cargo: 0.003, speed: 0.003 }, used: false },
        { slot: 17, tier: 3, key: 'robot_assistants',        it: 'Assistenti robot',                perLevel: { research_time: -0.002, lf_research_time: -0.002 }, used: false },
        { slot: 18, tier: 3, key: 'supercomputer',           it: 'Supercomputer',                   perLevel: { astrophysics_research_time: -0.003 }, used: false },
      ],
      techSource: 'game',
      techCosts: null, // todo: costs are not in the Tech Info tab
    },
    mechas: {
      name: 'Mecha',
      // Values from the game's Tech Info tables. Energy = energy used by the building at that level (levels 1-15).
      buildings: {
        assembly_line: { it: 'Linea di produzione', used: false }, // no effect on production, energy or costs
        fusion_cell_factory: { it: 'Fabbrica Celle a fusione', used: false }, // no effect on production, energy or costs
        update_network: { it: 'Network Aggiornamento', used: false }, // no effect on production, energy or costs
        quantum_computer_centre: { it: 'Centro Calcolo Quantistico', used: false }, // no effect on production, energy or costs
        automatised_assembly_centre: { it: 'Centro Assemblaggio Automatizzato', used: false }, // no effect on production, energy or costs
        microchip_assembly_line: { it: 'Linea di produzione Microchip', used: false }, // no effect on production, energy or costs
        production_assembly_hall: { it: 'Sala Catena di Montaggio', used: false }, // no effect on production, energy or costs
        nano_repair_bots: { it: 'Nanobot Riparazione', used: false }, // no effect on production, energy or costs
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
      // all 12 buildings in the order the game shows them (slots 1-12)
      buildingOrder: ['assembly_line', 'fusion_cell_factory', 'robotics_research_centre', 'update_network', 'quantum_computer_centre', 'automatised_assembly_centre', 'high_performance_transformer', 'microchip_assembly_line', 'production_assembly_hall', 'high_performance_synthesizer', 'chip_mass_production', 'nano_repair_bots'],
      // 18 techs from the game's Tech Info tables. Slots 1-6 = T1, 7-12 = T2, 13-18 = T3. Base values per level.
      techs: [
        { slot: 1,  tier: 1, key: 'catalyser_technology',    it: 'Tecnologia Catalizzatore',         perLevel: { deut: 0.0008 }, cost: { base: [10000, 6000, 1000], factor: 1.5 }, used: true },
        { slot: 2,  tier: 1, key: 'plasma_drive',            it: 'Unità al plasma',                  perLevel: { ship_speed: 0.002 }, used: false }, // not the Deathstar
        { slot: 3,  tier: 1, key: 'efficiency_module',       it: 'Modulo Efficienza',                perLevel: { fleet_fuel: -0.0003 }, used: false }, // max -90% of base, server setting
        { slot: 4,  tier: 1, key: 'depot_ai',                it: 'IA deposito',                      perLevel: { alliance_depot_cost: -0.001, alliance_depot_time: -0.002 }, used: false },
        { slot: 5,  tier: 1, key: 'light_fighter_overhaul',  it: 'Revisione generale (Caccia leggero)', perLevel: { ship: 'light_fighter', armour: 0.003, shield: 0.003, weapons: 0.003, cargo: 0.003, speed: 0.003 }, used: false },
        { slot: 6,  tier: 1, key: 'automated_transport_lines', it: 'Linee di trasporto automatizzate', perLevel: { metal: 0.0006, crystal: 0.0006, deut: 0.0006 }, cost: { base: [50000, 50000, 20000], factor: 1.5 }, used: true },
        { slot: 7,  tier: 2, key: 'improved_drone_ai',       it: 'IA Droni migliorata',              perLevel: { espionage_tech_cost: -0.001, espionage_tech_time: -0.002 }, used: false },
        { slot: 8,  tier: 2, key: 'experimental_recycling',  it: 'Tecnica sperimentale Rigenerazione', perLevel: { ship: 'recycler', armour: 0.01, shield: 0.01, weapons: 0.01, cargo: 0.01, speed: 0.01 }, used: false },
        { slot: 9,  tier: 2, key: 'cruiser_overhaul',        it: 'Revisione generale (Incrociatore)', perLevel: { ship: 'cruiser', armour: 0.003, shield: 0.003, weapons: 0.003, cargo: 0.003, speed: 0.003 }, used: false },
        { slot: 10, tier: 2, key: 'slingshot_autopilot',     it: 'Pilota automatico Slingshot',      perLevel: { recall_fuel_recovered: 0.0015 }, used: false },
        { slot: 11, tier: 2, key: 'high_temperature_superconductors', it: 'Superconduttore Alta temperatura', perLevel: { energy_tech_cost: -0.001, energy_tech_time: -0.002 }, used: false },
        { slot: 12, tier: 2, key: 'battleship_overhaul',     it: 'Revisione generale (Nave da battaglia)', perLevel: { ship: 'battleship', armour: 0.003, shield: 0.003, weapons: 0.003, cargo: 0.003, speed: 0.003 }, used: false },
        { slot: 13, tier: 3, key: 'artificial_swarm_intelligence', it: 'Intelligenza collettiva artificiale', perLevel: { metal: 0.0006, crystal: 0.0006, deut: 0.0006 }, used: true },
        { slot: 14, tier: 3, key: 'battlecruiser_overhaul',  it: 'Revisione generale (Incrociatore da battaglia)', perLevel: { ship: 'battlecruiser', armour: 0.003, shield: 0.003, weapons: 0.003, cargo: 0.003, speed: 0.003 }, used: false },
        { slot: 15, tier: 3, key: 'bomber_overhaul',         it: 'Revisione generale (Bombardiere)', perLevel: { ship: 'bomber', armour: 0.003, shield: 0.003, weapons: 0.003, cargo: 0.003, speed: 0.003 }, used: false },
        { slot: 16, tier: 3, key: 'destroyer_overhaul',      it: 'Revisione generale (Corazzata)',   perLevel: { ship: 'destroyer', armour: 0.003, shield: 0.003, weapons: 0.003, cargo: 0.003, speed: 0.003 }, used: false },
        { slot: 17, tier: 3, key: 'experimental_weapons_tech', it: 'Tecnologia Armi sperimentale',   perLevel: { weapons_tech_cost: -0.002, weapons_tech_time: -0.002 }, used: false },
        // raises the General class bonuses (fleet), except the ones listed in the game description
        { slot: 18, tier: 3, key: 'mechan_general_enhancement', it: 'Rinforzo generale Mecha',      perLevel: { general_class_bonus: 0.002 }, used: false },
      ],
      techSource: 'game',
      techCosts: null, // todo
    },
    kaelesh: {
      name: 'Kaelesh',
      note: 'Boosts the Explorer class bonus (game description). How much: todo.',
      buildings: {
        sanctuary: { it: 'Rifugio', used: false }, // no effect on production, energy or costs
        antimatter_condenser: { it: 'Condensatore Antimateria', used: false }, // no effect on production, energy or costs
        halls_of_realisation: { it: 'Sale della Conoscenza', used: false }, // no effect on production, energy or costs
        forum_of_transcendence: { it: 'Forum della Trascendenza', used: false }, // no effect on production, energy or costs
        antimatter_convector: { it: 'Convettore Antimateria', used: false }, // no effect on production, energy or costs
        chrysalis_accelerator: { it: 'Acceleratore Crisalide', used: false }, // no effect on production, energy or costs
        bio_modifier: { it: 'Biomodificatore', used: false }, // no effect on production, energy or costs
        psionic_modulator: { it: 'Modulatore psionico', used: false }, // no effect on production, energy or costs
        ship_manufacturing_hall: { it: 'Sala Fabbricazione Navi', used: false }, // no effect on production, energy or costs
        supra_refractor: { it: 'Soprarifrattore', used: false }, // no effect on production, energy or costs
        // +0.25% effect per level, but ONLY on Kaelesh lifeform techs of this planet (game description),
        // unlike Metropolis and the Mecha buildings that boost all techs of the planet. Energy not shown in the table.
        cloning_lab: { it: 'Laboratorio Clonazione', effect: { techBoostOwnRace: 0.0025 }, perLevel: true, source: 'game' },
        // Kaelesh research building: -0.25% research cost and -2% research time per level (shown rounded)
        vortex_chamber: { it: 'Camera Vortex', effect: { techCost: -0.0025, techTime: -0.02 }, perLevel: true, source: 'game',
          energy: [10, 23, 37, 54, 73, 95, 119, 148, 179, 215, 256, 302, 353, 411, 475] },
        // No effect on production, energy or costs (game descriptions): Rifugio, Condensatore Antimateria,
        // Sale della Conoscenza, Forum della Trascendenza, Convettore Antimateria, Acceleratore Crisalide,
        // Biomodificatore, Modulatore psionico (population needed for tech slots), Sala Fabbricazione Navi, Soprarifrattore
      },
      // all 12 buildings in the order the game shows them (slots 1-12)
      buildingOrder: ['sanctuary', 'antimatter_condenser', 'vortex_chamber', 'halls_of_realisation', 'forum_of_transcendence', 'antimatter_convector', 'cloning_lab', 'chrysalis_accelerator', 'bio_modifier', 'psionic_modulator', 'ship_manufacturing_hall', 'supra_refractor'],
      // 18 techs from the game's Tech Info tables. Slots 1-6 = T1, 7-12 = T2, 13-18 = T3. Base values per level.
      techs: [
        { slot: 1,  tier: 1, key: 'heat_recovery',           it: 'Recupero calore',                  perLevel: { fleet_fuel: -0.0003 }, used: false },
        { slot: 2,  tier: 1, key: 'sulphide_process',        it: 'Tecnologia Processo al solfuro',   perLevel: { deut: 0.0008 }, used: true },
        { slot: 3,  tier: 1, key: 'psionic_network',         it: 'Network psionico',                 perLevel: { expedition_ship_loss: -0.0005 }, used: false },
        { slot: 4,  tier: 1, key: 'telekinetic_tractor_beam', it: 'Raggio di trazione telecinetico', perLevel: { expedition_ships_found: 0.002 }, cost: { base: [20000, 15000, 7500], factor: 1.5 }, used: false },
        { slot: 5,  tier: 1, key: 'enhanced_sensor_technology', it: 'Tecnologia Sensori migliorata', perLevel: { expedition_resources: 0.002 }, cost: { base: [25000, 20000, 10000], factor: 1.5 }, used: false },
        { slot: 6,  tier: 1, key: 'neuromodal_compressor',   it: 'Compattatore neuromodulare',       perLevel: { civil_cargo: 0.004 }, used: false },
        { slot: 7,  tier: 2, key: 'neuro_interface',         it: 'Interfaccia neurologica',          perLevel: { research_time: -0.001, lf_research_time: -0.001 }, used: false },
        { slot: 8,  tier: 2, key: 'interplanetary_analysis_network', it: 'Network di analisi superglobale', perLevel: { phalanx_range: 0.006 }, used: false },
        { slot: 9,  tier: 2, key: 'heavy_fighter_overclocking', it: 'Overclocking (Caccia pesante)', perLevel: { ship: 'heavy_fighter', armour: 0.003, shield: 0.003, weapons: 0.003, cargo: 0.003, speed: 0.003 }, used: false },
        { slot: 10, tier: 2, key: 'telekinetic_drive',       it: 'Sistema Potenziamento telecinetico', perLevel: { expedition_fleet_speed: 0.001 }, cost: { base: [85000, 40000, 35000], factor: 1.2 }, used: false },
        { slot: 11, tier: 2, key: 'sixth_sense',             it: 'Sesto senso',                      perLevel: { expedition_resources: 0.002 }, cost: { base: [120000, 30000, 25000], factor: 1.5 }, used: false },
        { slot: 12, tier: 2, key: 'psychoharmoniser',        it: 'Armonizzatore psicologico',        perLevel: { metal: 0.0006, crystal: 0.0006, deut: 0.0006 }, cost: { base: [100000, 40000, 30000], factor: 1.5 }, used: true },
        { slot: 13, tier: 3, key: 'efficient_swarm_intelligence', it: 'Intelligenza collettiva efficiente', perLevel: { research_time: -0.001, lf_research_time: -0.001 }, used: false },
        { slot: 14, tier: 3, key: 'large_cargo_overclocking', it: 'Overclocking (Cargo pesante)',    perLevel: { ship: 'large_cargo', armour: 0.01, shield: 0.01, weapons: 0.01, cargo: 0.01, speed: 0.01 }, used: false },
        { slot: 15, tier: 3, key: 'gravitation_sensors',     it: 'Sensori Gravità',                  perLevel: { expedition_dark_matter: 0.001 }, used: false },
        { slot: 16, tier: 3, key: 'battleship_overclocking', it: 'Overclocking (Nave da battaglia)', perLevel: { ship: 'battleship', armour: 0.003, shield: 0.003, weapons: 0.003, cargo: 0.003, speed: 0.003 }, used: false },
        { slot: 17, tier: 3, key: 'psionic_shield_matrix',   it: 'Matrice Protezione psionica',      perLevel: { shield_tech_cost: -0.002, shield_tech_time: -0.002 }, used: false },
        // raises the Explorer class bonuses (expeditions etc.), except the ones listed in the game description
        { slot: 18, tier: 3, key: 'kaelesh_discoverer_enhancement', it: 'Rinforzo Esploratore Kaelesh', perLevel: { explorer_class_bonus: 0.002 }, used: false },
      ],
      techSource: 'game',
      techCosts: null, // todo
    },
  },
};

if (typeof module !== 'undefined') module.exports = LIFEFORMS;
