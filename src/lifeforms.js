// Dati delle forme di vita raccolti per OGame Advisor.
// Ogni valore dice da dove viene:
//   'game'  = verificato con i numeri mostrati dal gioco
//   'guide' = guida ufficiale del forum (board.it.ogame.gameforge.com, thread 494520), non ancora verificato sul gioco
//   'todo'  = ancora mancante
// Qui niente è inventato: i valori sconosciuti restano null.

const LIFEFORMS = {
  // Regole comuni a tutte le razze
  rules: {
    buildingsScope: 'planet',            // guida: gli effetti degli edifici valgono solo sul pianeta dove sono costruiti
    techScope: 'account',                // guida: gli effetti delle ricerche valgono su tutti i pianeti; si possono mescolare ricerche di razze diverse
    techSlotsPerRace: 18,                // guida; slot 1-6 = T1, 7-12 = T2, 13-18 = T3 (gioco)
    // ogni slot N contiene lo slot N di UNA razza, scelta dal giocatore (gioco, confermato dal giocatore)
    raceSwitchCooldownHours: 48,         // guida
    // Bonus effettivo di una ricerca = base x (1 + edificio che potenzia le ricerche del pianeta + bonus del livello della razza del pianeta)
    // (FAQ del forum; verificato sulla pagina Impostazioni risorse del gioco con le ricerche di 11 pianeti Rock'tal)
    techBonusFormula: 'base * (1 + buildingBoost + planetRaceLevelBonus)',
    // Costo di un edificio forme di vita al livello L = base x fattore^(L-1) x L; il Monolite riduce i costi Rock'tal
    // e l'energia (Monolite 5 = -5%, confermato dal giocatore)
    buildingCostFormula: 'base * factor^(L-1) * L',      // verificato su 7 edifici Rock'tal, livelli 1-2 e 15->16
    // Energia usata da un edificio forme di vita al livello L = floor(L x base x fattore^L) (coincide con le tabelle Tech Info dal
    // livello 2 in su; le tabelle mostrano livello 1 = base). Un upgrade usa la differenza; anche questa la riduce il Monolite
    // (Fusione magmatica 15->16: (2940 - 2506) x 0,95 = 413 mostrato dal gioco).
    buildingEnergyFormula: 'floor(L * base * factor^L)',
    // Costo di una ricerca forme di vita al livello L = base x fattore^(L-1) x L, ridotto dall'edificio di ricerca del pianeta
    // dove si fa. Costi base dalla finestra di ricerca del gioco (livelli 1 e 2 di sei ricerche T1 e sei T2, tutte con
    // sconto ricerche del 2,5%: 10000 x 0,975 = 9,8k, 10000 x 1,5 x 2 x 0,975 = 29,3k). Il fattore cambia da ricerca a ricerca (quasi tutte 1,5, Sistema Potenziamento telecinetico 1,2). Verificato sul gioco fino al livello 10 (tutte le ricerche T1 e T2 qui sopra).
    techCostFormula: 'base * factor^(L-1) * L',
    levelBonusPerLevel: { value: 0.001, source: 'game' }, // gioco: Umani livello 40 = 4%, Rock'tal livello 44 = 4,4% (la guida dice 1% per livello: superato)
  },

  races: {
    rocktal: {
      name: "Rock'tal",
      note: 'Potenzia il bonus della classe Collezionista (descrizione del gioco). Di quanto: da verificare.',
      // Valori dalle tabelle Tech Info del gioco. Energia = energia usata dall'edificio a quel livello.
      buildings: {
        meditation_enclave: { it: 'Enclave di Meditazione', used: false }, // nessun effetto su produzione, energia o costi
        crystal_farm: { it: 'Produzione di cristalli', used: false }, // nessun effetto su produzione, energia o costi
        rune_forge: { it: 'Fucina delle Rune', used: false }, // nessun effetto su produzione, energia o costi
        oriktorium: { it: 'Orictorium', used: false }, // nessun effetto su produzione, energia o costi
        // livello 1: 237,5k / 118,8k / 118,8k, 95 di energia (gioco, valori arrotondati)
        recycling_plant: { it: 'Impianto di Riciclaggio', used: false }, // nessun effetto su produzione, energia o costi
        magma_forge:        { it: 'Fusione magmatica', effect: { metal: 0.02 }, perLevel: true, source: 'game',
          cost: { base: [10000, 8000, 1000], factor: 1.4 }, energyCons: { base: 40, factor: 1.1 },
          // durata: livello x 2000 x 1,3^livello, ridotta dal Monolite, divisa per (1 + robot) x 2^naniti x velocità
          // (gioco, Gonnia con Robot 10, Naniti 7, Monolite 5: livelli 15, 16, 17 = 3m 27s, 4m 47s, 6m 36s)
          duration: { base: 2000, factor: 1.3 },
          energy: { 13: 1795, 14: 2126, 15: 2506, 16: 2940, 17: 3437, 18: 4003, 19: 4648, 20: 5381, 21: 6216, 22: 7163, 23: 8237, 24: 9455, 25: 10834, 26: 12394, 27: 14158 } },
        crystal_refinery:   { it: 'Cristalleria', effect: { crystal: 0.02 }, perLevel: true, source: 'game',
          cost: { base: [85000, 44000, 25000], factor: 1.4 }, energyCons: { base: 90, factor: 1.1 },
          energy: { 3: 359, 4: 527, 5: 724, 6: 956, 7: 1227, 8: 1543, 9: 1909, 10: 2334, 11: 2824, 12: 3389, 13: 4039, 14: 4784, 15: 5639, 16: 6616, 17: 7733 } },
        deuterium_tuner:    { it: 'Sintonizzatore di deuterio', effect: { deut: 0.02 }, perLevel: true, source: 'game',
          cost: { base: [120000, 50000, 20000], factor: 1.4 }, energyCons: { base: 90, factor: 1.1 },
          energy: { 3: 359, 4: 527, 5: 724, 6: 956, 7: 1227, 8: 1543, 9: 1909, 10: 2334, 11: 2824, 12: 3389, 13: 4039, 14: 4784, 15: 5639, 16: 6616, 17: 7733 } },
        // +1,5% di energia e -0,5% di energia usata dalle miniere per livello (livello 10 = +15% / -5%)
        disruption_chamber: { it: 'Camera di Disgregazione', effect: { energy: 0.015, mineConsumption: -0.005 }, perLevel: true, source: 'game',
          cost: { base: [20000, 15000, 10000], factor: 1.2 } },
        // -0,5% sul costo degli edifici delle risorse per livello; il gioco lo mostra arrotondato per eccesso (livello 1 = -1%, livello 3 = -2%)
        mineral_centre:     { it: 'Centro di Mineralogia', effect: { mineCost: -0.005 }, perLevel: true, level1Cost: [250000, 150000, 100000], source: 'game',
          cost: { base: [250000, 150000, 100000], factor: 1.8 }, energyCons: { base: 120, factor: 1.3 },
          energy: [120, 405, 790, 1370, 2227, 3475, 5270, 7831, 11452, 16543, 23656, 33549, 47248, 66147, 92134] },
        // costo, energia e tempo di costruzione degli edifici Rock'tal; la tabella non è lineare, quindi i valori sono tenuti come li mostra il gioco
        monolith:           { it: 'Monolite', source: 'game',
          cost: { base: [50000, 35000, 15000], factor: 1.5 }, energyCons: { base: 80, factor: 1.3 },
          buildingCostByLevel: { 3: -0.03, 4: -0.04, 5: -0.05, 6: -0.06, 7: -0.08, 8: -0.08, 9: -0.09, 10: -0.10, 11: -0.11, 12: -0.12, 13: -0.13, 14: -0.15, 15: -0.15, 16: -0.16, 17: -0.17 },
          energy: { 3: 527, 4: 913, 5: 1485, 6: 2316, 7: 3513, 8: 5220, 9: 7635, 10: 11028, 11: 15771, 12: 22366, 13: 31499, 14: 44098, 15: 61423, 16: 85173, 17: 117645 } },
        // edificio di ricerca Rock'tal: -0,25% sul costo e -2% sul tempo delle ricerche per livello (metà dell'effetto sul costo di quello Umani)
        tecnologicus_runarum: { it: 'Tecnologicus Runarum', effect: { techCost: -0.0025, techTime: -0.02 }, perLevel: true, source: 'game',
          cost: { base: [40000, 10000, 15000], factor: 1.3 }, energyCons: { base: 15, factor: 1.1 },
          energy: { 8: 257, 9: 318, 10: 389, 11: 470, 12: 564, 13: 673, 14: 797, 15: 939, 16: 1102, 17: 1288, 18: 1501, 19: 1743, 20: 2018, 21: 2331, 22: 2686 } },
        tech_boost: null, // nessun edificio Rock'tal potenzia le ricerche forme di vita (elenco edifici del gioco)
        // Nessun effetto su produzione, energia o costi (descrizioni del gioco): Enclave di Meditazione, Produzione di cristalli,
        // Fucina delle Rune, Orictorium, Impianto di Riciclaggio
      },
      // tutti i 12 edifici nell'ordine in cui li mostra il gioco (slot 1-12)
      buildingOrder: ['meditation_enclave', 'crystal_farm', 'tecnologicus_runarum', 'rune_forge', 'oriktorium', 'magma_forge', 'disruption_chamber', 'monolith', 'crystal_refinery', 'deuterium_tuner', 'mineral_centre', 'recycling_plant'],
      // 18 ricerche dalle tabelle Tech Info del gioco. Slot 1-6 = T1, 7-12 = T2, 13-18 = T3. Valori base per livello.
      techs: [
        { slot: 1,  tier: 1, key: 'volcanic_batteries',      it: 'Batterie vulcaniche',              perLevel: { energy: 0.0025 }, cost: { base: [10000, 6000, 1000], factor: 1.5 }, used: true },
        { slot: 2,  tier: 1, key: 'acoustic_scanning',       it: 'Sondaggio acustico',               perLevel: { crystal: 0.0008 }, used: true },
        { slot: 3,  tier: 1, key: 'high_energy_pump_systems', it: 'Sistemi di pompaggio ad alta energia', perLevel: { deut: 0.0008 }, cost: { base: [15000, 10000, 5000], factor: 1.5 }, used: true },
        { slot: 4,  tier: 1, key: 'cargo_hold_expansion_civil', it: 'Espansione stiva (navi civili)', perLevel: { civil_cargo: 0.004 }, used: false },
        { slot: 5,  tier: 1, key: 'magma_powered_production', it: 'Tecniche estrattive magmatiche',   perLevel: { metal: 0.0008, crystal: 0.0008, deut: 0.0008 }, used: true },
        { slot: 6,  tier: 1, key: 'geothermal_power_plants', it: 'Centrali Geotermoelettriche',      perLevel: { energy: 0.0025 }, used: true },
        { slot: 7,  tier: 2, key: 'depth_sounding',          it: 'Sondaggio da alte profondità',     perLevel: { metal: 0.0008 }, cost: { base: [70000, 40000, 20000], factor: 1.5 }, used: true },
        { slot: 8,  tier: 2, key: 'ion_crystal_heavy_fighter', it: 'Potenziamento da cristallo ionico (Caccia pesante)', perLevel: { ship: 'heavy_fighter', armour: 0.003, shield: 0.003, weapons: 0.003, cargo: 0.003, speed: 0.003 }, used: false },
        // riduce costo e tempo della Tecnologia Plasma: cambia il costo del consiglio sul Plasma
        { slot: 9,  tier: 2, key: 'improved_stellarator',    it: 'Concentratore astrale',            perLevel: { plasma_tech_cost: -0.0015, plasma_tech_time: -0.003 }, cost: { base: [75000, 55000, 25000], factor: 1.5 }, used: true },
        { slot: 10, tier: 2, key: 'hardened_diamond_drill_heads', it: 'Punte di diamante irrobustite', perLevel: { metal: 0.0008 }, used: true },
        { slot: 11, tier: 2, key: 'seismic_mining_tech',     it: 'Tecnologie minerarie sismiche',    perLevel: { crystal: 0.0008 }, used: true },
        { slot: 12, tier: 2, key: 'magma_powered_pump_systems', it: 'Sistema di pompaggio al magma', perLevel: { deut: 0.0008 }, used: true },
        // bonus e consumo dei crawler: se queste % siano relative ai valori dei crawler è ancora da verificare sul gioco
        { slot: 13, tier: 3, key: 'ion_crystal_modules',     it: 'Moduli Cristalli ionici',          perLevel: { crawler_bonus: 0.001, crawler_energy: -0.001 }, used: true, formula: 'todo' },
        { slot: 14, tier: 3, key: 'optimised_silo_construction', it: 'Costruzione Base ottimizzata', perLevel: { missile_silo_cost: -0.001, missile_silo_time: -0.002 }, used: false },
        { slot: 15, tier: 3, key: 'diamond_energy_transmitter', it: 'Trasmettitore energetico Diamante', perLevel: { energy_tech_cost: -0.001, energy_tech_time: -0.002 }, used: false },
        { slot: 16, tier: 3, key: 'obsidian_shield_reinforcement', it: 'Miglioramento Scudo ossidiana', perLevel: { defense_armour: 0.005, defense_shield: 0.005, defense_weapons: 0.005 }, used: false },
        { slot: 17, tier: 3, key: 'rune_shields',            it: 'Scudi runici',                     perLevel: { armour_tech_cost: -0.002, armour_tech_time: -0.002 }, used: false },
        // aumenta tutti i bonus della classe Collezionista tranne il sovraccarico dei crawler e lo sconto sull'accelerazione (descrizione del gioco);
        // come si applica (in proporzione al bonus della classe?) è ancora da verificare sul gioco
        { slot: 18, tier: 3, key: 'rocktal_collector_enhancement', it: "Potenziamento Collezionista Rock`tal", perLevel: { collector_class_bonus: 0.002 }, used: true, formula: 'todo' },
      ],
      techSource: 'game',
      techCosts: null, // da fare
    },
    humans: {
      name: 'Umani',
      note: 'Non potenzia il bonus della classe (descrizione del gioco).',
      // Energia usata da ogni edificio, livelli 1-15, dalle tabelle Tech Info del gioco (serve quando suggeriremo questi edifici)
      buildings: {
        residential_sector: { it: 'Zona residenziale', used: false }, // nessun effetto su produzione, energia o costi
        biosphere_farm: { it: 'Fattoria della Biosfera', used: false }, // nessun effetto su produzione, energia o costi
        academy_of_sciences: { it: 'Accademia delle Scienze', used: false }, // nessun effetto su produzione, energia o costi
        neuro_calibration_centre: { it: 'Centro di Neuro-calibrazione', used: false }, // nessun effetto su produzione, energia o costi
        food_silo: { it: 'Magazzino Alimentare', used: false }, // nessun effetto su produzione, energia o costi
        skyscraper: { it: 'Grattacielo', used: false }, // nessun effetto su produzione, energia o costi
        biotech_lab: { it: 'Laboratorio Biotecnologico', used: false }, // nessun effetto su produzione, energia o costi
        planetary_shield: { it: 'Scudo planetario', used: false }, // nessun effetto su produzione, energia o costi
        high_energy_smelting: { it: 'Fusione ad alta energia', effect: { metal: 0.015 }, perLevel: true, source: 'game',
          energy: [40, 96, 159, 234, 322, 425, 545, 685, 848, 1037, 1255, 1506, 1795, 2126, 2506] },
        fusion_production:    { it: 'Tecniche estrattive a fusione', effect: { crystal: 0.015, deut: 0.01 }, perLevel: true, source: 'game',
          energy: [80, 193, 319, 468, 644, 850, 1091, 1371, 1697, 2074, 2510, 3012, 3590, 4253, 5012] },
        metropolis:           { it: 'Metropolis', effect: { techBoost: 0.005 }, perLevel: true, source: 'game', // potenzia tutte le ricerche di questo pianeta
          energy: [90, 198, 312, 437, 574, 723, 886, 1063, 1256, 1466, 1693, 1939, 2206, 2494, 2806] },
        research_centre:      { it: 'Centro di Ricerca', effect: { techCost: -0.005, techTime: -0.02 }, perLevel: true,
          max: { techCost: -0.25, techTime: -0.99 }, source: 'guide', // livello 15 = -7,5% costo, -30% tempo
          energy: { 13: 353, 14: 411, 15: 475, 16: 548, 17: 629, 18: 719, 19: 819, 20: 932, 21: 1057, 22: 1196, 23: 1350, 24: 1521, 25: 1712, 26: 1923, 27: 2156 } },
        // Nessun effetto su produzione, energia o costi (descrizioni del gioco): Zona residenziale, Fattoria della Biosfera,
        // Accademia delle Scienze, Centro di Neuro-calibrazione, Magazzino Alimentare, Grattacielo,
        // Laboratorio Biotecnologico, Scudo planetario
      },
      // 18 ricerche dalle tabelle Tech Info del gioco. Slot 1-6 = T1, 7-12 = T2, 13-18 = T3.
      // perLevel = effetto base per livello, prima dei potenziamenti di Metropolis e del livello. Nelle tabelle sono tutti lineari.
      // tutti i 12 edifici nell'ordine in cui li mostra il gioco (slot 1-12)
      buildingOrder: ['residential_sector', 'biosphere_farm', 'research_centre', 'academy_of_sciences', 'neuro_calibration_centre', 'high_energy_smelting', 'food_silo', 'fusion_production', 'skyscraper', 'biotech_lab', 'metropolis', 'planetary_shield'],
      // used: true = cambia produzione, energia o costi, quindi entra nei calcoli.
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
      techCosts: null, // da fare: i costi non sono nella scheda Tech Info
    },
    mechas: {
      name: 'Mecha',
      // Valori dalle tabelle Tech Info del gioco. Energia = energia usata dall'edificio a quel livello (livelli 1-15).
      buildings: {
        assembly_line: { it: 'Linea di produzione', used: false }, // nessun effetto su produzione, energia o costi
        fusion_cell_factory: { it: 'Fabbrica Celle a fusione', used: false }, // nessun effetto su produzione, energia o costi
        update_network: { it: 'Network Aggiornamento', used: false }, // nessun effetto su produzione, energia o costi
        quantum_computer_centre: { it: 'Centro Calcolo Quantistico', used: false }, // nessun effetto su produzione, energia o costi
        automatised_assembly_centre: { it: 'Centro Assemblaggio Automatizzato', used: false }, // nessun effetto su produzione, energia o costi
        microchip_assembly_line: { it: 'Linea di produzione Microchip', used: false }, // nessun effetto su produzione, energia o costi
        production_assembly_hall: { it: 'Sala Catena di Montaggio', used: false }, // nessun effetto su produzione, energia o costi
        nano_repair_bots: { it: 'Nanobot Riparazione', used: false }, // nessun effetto su produzione, energia o costi
        // edificio di ricerca Mecha: -0,25% sul costo e -2% sul tempo delle ricerche per livello (valori arrotondati)
        robotics_research_centre: { it: 'Centro Ricerca Robotica', effect: { techCost: -0.0025, techTime: -0.02 }, perLevel: true, source: 'game',
          energy: [13, 30, 49, 70, 95, 123, 155, 192, 233, 280, 333, 392, 459, 534, 618] },
        // +1% di energia e +0,3% di effetto delle ricerche forme di vita di questo pianeta per livello
        high_performance_transformer: { it: 'Trasformatore ad alta potenza', effect: { energy: 0.01, techBoost: 0.003 }, perLevel: true, source: 'game',
          energy: [40, 88, 138, 194, 255, 321, 393, 472, 558, 651, 752, 862, 980, 1108, 1247] },
        high_performance_synthesizer: { it: 'Sintetizzatore Alte prestazioni', effect: { deut: 0.02 }, perLevel: true, source: 'game',
          energy: [60, 145, 239, 351, 483, 637, 818, 1028, 1273, 1556, 1883, 2259, 2692, 3189, 3759] },
        // +0,4% di effetto delle ricerche forme di vita di questo pianeta per livello
        chip_mass_production: { it: 'Produzione di massa di chip', effect: { techBoost: 0.004 }, perLevel: true, source: 'game',
          energy: [70, 154, 243, 340, 446, 562, 689, 827, 977, 1140, 1316, 1508, 1715, 1940, 2182] },
        // Nessun effetto su produzione, energia o costi (descrizioni del gioco): Linea di produzione, Fabbrica Celle a fusione,
        // Network Aggiornamento, Centro Calcolo Quantistico, Centro Assemblaggio Automatizzato (tempo di costruzione delle navi),
        // Linea di produzione Microchip, Sala Catena di Montaggio, Nanobot Riparazione
      },
      // tutti i 12 edifici nell'ordine in cui li mostra il gioco (slot 1-12)
      buildingOrder: ['assembly_line', 'fusion_cell_factory', 'robotics_research_centre', 'update_network', 'quantum_computer_centre', 'automatised_assembly_centre', 'high_performance_transformer', 'microchip_assembly_line', 'production_assembly_hall', 'high_performance_synthesizer', 'chip_mass_production', 'nano_repair_bots'],
      // 18 ricerche dalle tabelle Tech Info del gioco. Slot 1-6 = T1, 7-12 = T2, 13-18 = T3. Valori base per livello.
      techs: [
        { slot: 1,  tier: 1, key: 'catalyser_technology',    it: 'Tecnologia Catalizzatore',         perLevel: { deut: 0.0008 }, cost: { base: [10000, 6000, 1000], factor: 1.5 }, used: true },
        { slot: 2,  tier: 1, key: 'plasma_drive',            it: 'Unità al plasma',                  perLevel: { ship_speed: 0.002 }, used: false }, // non la Morte Nera
        { slot: 3,  tier: 1, key: 'efficiency_module',       it: 'Modulo Efficienza',                perLevel: { fleet_fuel: -0.0003 }, used: false }, // massimo -90% del valore base, impostazione del server
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
        // aumenta i bonus della classe Generale (flotta), tranne quelli elencati nella descrizione del gioco
        { slot: 18, tier: 3, key: 'mechan_general_enhancement', it: 'Rinforzo generale Mecha',      perLevel: { general_class_bonus: 0.002 }, used: false },
      ],
      techSource: 'game',
      techCosts: null, // da fare
    },
    kaelesh: {
      name: 'Kaelesh',
      note: 'Potenzia il bonus della classe Esploratore (descrizione del gioco). Di quanto: da verificare.',
      buildings: {
        sanctuary: { it: 'Rifugio', used: false }, // nessun effetto su produzione, energia o costi
        antimatter_condenser: { it: 'Condensatore Antimateria', used: false }, // nessun effetto su produzione, energia o costi
        halls_of_realisation: { it: 'Sale della Conoscenza', used: false }, // nessun effetto su produzione, energia o costi
        forum_of_transcendence: { it: 'Forum della Trascendenza', used: false }, // nessun effetto su produzione, energia o costi
        antimatter_convector: { it: 'Convettore Antimateria', used: false }, // nessun effetto su produzione, energia o costi
        chrysalis_accelerator: { it: 'Acceleratore Crisalide', used: false }, // nessun effetto su produzione, energia o costi
        bio_modifier: { it: 'Biomodificatore', used: false }, // nessun effetto su produzione, energia o costi
        psionic_modulator: { it: 'Modulatore psionico', used: false }, // nessun effetto su produzione, energia o costi
        ship_manufacturing_hall: { it: 'Sala Fabbricazione Navi', used: false }, // nessun effetto su produzione, energia o costi
        supra_refractor: { it: 'Soprarifrattore', used: false }, // nessun effetto su produzione, energia o costi
        // +0,25% di effetto per livello, ma SOLO sulle ricerche forme di vita Kaelesh di questo pianeta (descrizione del gioco),
        // a differenza di Metropolis e degli edifici Mecha che potenziano tutte le ricerche del pianeta. Energia non indicata nella tabella.
        cloning_lab: { it: 'Laboratorio Clonazione', effect: { techBoostOwnRace: 0.0025 }, perLevel: true, source: 'game' },
        // edificio di ricerca Kaelesh: -0,25% sul costo e -2% sul tempo delle ricerche per livello (valori arrotondati)
        vortex_chamber: { it: 'Camera Vortex', effect: { techCost: -0.0025, techTime: -0.02 }, perLevel: true, source: 'game',
          energy: [10, 23, 37, 54, 73, 95, 119, 148, 179, 215, 256, 302, 353, 411, 475] },
        // Nessun effetto su produzione, energia o costi (descrizioni del gioco): Rifugio, Condensatore Antimateria,
        // Sale della Conoscenza, Forum della Trascendenza, Convettore Antimateria, Acceleratore Crisalide,
        // Biomodificatore, Modulatore psionico (popolazione necessaria per gli slot delle ricerche), Sala Fabbricazione Navi, Soprarifrattore
      },
      // tutti i 12 edifici nell'ordine in cui li mostra il gioco (slot 1-12)
      buildingOrder: ['sanctuary', 'antimatter_condenser', 'vortex_chamber', 'halls_of_realisation', 'forum_of_transcendence', 'antimatter_convector', 'cloning_lab', 'chrysalis_accelerator', 'bio_modifier', 'psionic_modulator', 'ship_manufacturing_hall', 'supra_refractor'],
      // 18 ricerche dalle tabelle Tech Info del gioco. Slot 1-6 = T1, 7-12 = T2, 13-18 = T3. Valori base per livello.
      techs: [
        { slot: 1,  tier: 1, key: 'heat_recovery',           it: 'Recupero calore',                  perLevel: { fleet_fuel: -0.0003 }, used: false },
        { slot: 2,  tier: 1, key: 'sulphide_process',        it: 'Tecnologia Processo al solfuro',   perLevel: { deut: 0.0008 }, used: true },
        { slot: 3,  tier: 1, key: 'psionic_network',         it: 'Network psionico',                 perLevel: { expedition_ship_loss: -0.0005 }, cost: { base: [15000, 10000, 5000], factor: 1.5 }, used: false },
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
        // aumenta i bonus della classe Esploratore (spedizioni ecc.), tranne quelli elencati nella descrizione del gioco
        { slot: 18, tier: 3, key: 'kaelesh_discoverer_enhancement', it: 'Rinforzo Esploratore Kaelesh', perLevel: { explorer_class_bonus: 0.002 }, used: false },
      ],
      techSource: 'game',
      techCosts: null, // da fare
    },
  },
};

// Costi da due fogli di calcolo della community (CasualSAB Lifeforms Tech Tree Planner e K2MT), usati per tutto quello che
// non è ancora stato verificato sul gioco. I valori verificati sul gioco hanno la precedenza e coincidono con i fogli
// (14 ricerche e 7 edifici Rock'tal confrontati). Edifici: nello stesso ordine di buildingOrder. Ricerche: slot 1-18.
// Energia: base e fattore ricavati dalle tabelle Tech Info del gioco (coincidono a tutti i livelli delle tabelle).
LIFEFORMS.sheet = {
  humans: {
    buildings: [[[7,2,0], 1.2], [[5,2,0], 1.23], [[20000,25000,10000], 1.3], [[5000,3200,1500], 1.7], [[50000,40000,50000], 1.7], [[9000,6000,3000], 1.5], [[25000,13000,7000], 1.09], [[50000,25000,15000], 1.5], [[75000,20000,25000], 1.09], [[150000,30000,15000], 1.12], [[80000,35000,60000], 1.5], [[250000,125000,125000], 1.2]],
    techs: [[[5000,2500,500], 1.3], [[7000,10000,5000], 1.5], [[15000,10000,5000], 1.3], [[20000,15000,7500], 1.3], [[25000,20000,10000], 1.4], [[35000,25000,15000], 1.5], [[70000,40000,20000], 1.3], [[80000,50000,20000], 1.5], [[320000,240000,100000], 1.5], [[320000,240000,100000], 1.5], [[120000,30000,25000], 1.5], [[100000,40000,30000], 1.3], [[200000,100000,100000], 1.3], [[160000,120000,50000], 1.5], [[160000,120000,50000], 1.5], [[320000,240000,100000], 1.5], [[300000,180000,120000], 1.5], [[500000,300000,200000], 1.3]],
    energy: {'high_energy_smelting': [40,1.1], 'fusion_production': [80,1.1], 'metropolis': [90,1.05], 'research_centre': [10,1.08]},
  },
  rocktal: {
    buildings: [[[9,3,0], 1.2], [[7,2,0], 1.2], [[40000,10000,15000], 1.3], [[5000,3800,1000], 1.7], [[50000,40000,50000], 1.65], [[10000,8000,1000], 1.4], [[20000,15000,10000], 1.2], [[50000,35000,15000], 1.5], [[85000,44000,25000], 1.4], [[120000,50000,20000], 1.4], [[250000,150000,100000], 1.8], [[250000,125000,125000], 1.5]],
    techs: [[[10000,6000,1000], 1.5], [[7500,12500,5000], 1.5], [[15000,10000,5000], 1.5], [[20000,15000,7500], 1.3], [[25000,20000,10000], 1.5], [[50000,50000,20000], 1.5], [[70000,40000,20000], 1.5], [[160000,120000,50000], 1.5], [[75000,55000,25000], 1.5], [[85000,40000,35000], 1.5], [[120000,30000,25000], 1.5], [[100000,40000,30000], 1.5], [[200000,100000,100000], 1.2], [[220000,110000,110000], 1.3], [[240000,120000,120000], 1.3], [[250000,250000,250000], 1.4], [[500000,300000,200000], 1.5], [[300000,180000,120000], 1.7]],
  },
  mechas: {
    buildings: [[[6,2,0], 1.21], [[5,2,0], 1.18], [[30000,20000,10000], 1.3], [[5000,3800,1000], 1.8], [[50000,40000,50000], 1.8], [[7500,7000,1000], 1.3], [[35000,15000,10000], 1.5], [[50000,20000,30000], 1.07], [[100000,10000,3000], 1.14], [[100000,40000,20000], 1.5], [[55000,50000,30000], 1.5], [[250000,125000,125000], 1.4]],
    techs: [[[10000,6000,1000], 1.5], [[7500,12500,5000], 1.3], [[15000,10000,5000], 1.5], [[20000,15000,7500], 1.3], [[160000,120000,50000], 1.5], [[50000,50000,20000], 1.5], [[70000,40000,20000], 1.3], [[160000,120000,50000], 1.5], [[160000,120000,50000], 1.5], [[85000,40000,35000], 1.2], [[120000,30000,25000], 1.3], [[160000,120000,50000], 1.5], [[200000,100000,100000], 1.5], [[160000,120000,50000], 1.5], [[320000,240000,100000], 1.5], [[320000,240000,100000], 1.5], [[500000,300000,200000], 1.5], [[300000,180000,120000], 1.7]],
    energy: {'robotics_research_centre': [13,1.08], 'high_performance_transformer': [40,1.05], 'high_performance_synthesizer': [60,1.1], 'chip_mass_production': [70,1.05]},
  },
  kaelesh: {
    buildings: [[[4,3,0], 1.21], [[6,3,0], 1.21], [[20000,20000,30000], 1.3], [[7500,5000,800], 1.8], [[60000,30000,50000], 1.8], [[8500,5000,3000], 1.25], [[15000,15000,20000], 1.2], [[75000,25000,30000], 1.05], [[87500,25000,30000], 1.2], [[150000,30000,30000], 1.5], [[75000,50000,55000], 1.2], [[500000,250000,250000], 1.4]],
    techs: [[[10000,6000,1000], 1.5], [[7500,12500,5000], 1.5], [[15000,10000,5000], 1.5], [[20000,15000,7500], 1.5], [[25000,20000,10000], 1.5], [[50000,50000,20000], 1.3], [[70000,40000,20000], 1.5], [[80000,50000,20000], 1.2], [[320000,240000,100000], 1.5], [[85000,40000,35000], 1.2], [[120000,30000,25000], 1.5], [[100000,40000,30000], 1.5], [[200000,100000,100000], 1.5], [[160000,120000,50000], 1.5], [[240000,120000,120000], 1.5], [[320000,240000,100000], 1.5], [[500000,300000,200000], 1.5], [[300000,180000,120000], 1.7]],
    energy: {'vortex_chamber': [10,1.08]},
  },
};
// Durata delle ricerche forme di vita (secondi): livello x base x fattore^livello, dal foglio CasualSAB;
// verificata sul gioco: Estrattori ad alto rendimento 9 -> 10 su Gonnia (Tecnologicus Runarum 10, velocità 5) = 12o 15m 14s.
LIFEFORMS.techDuration = {"humans":[[1000,1.2],[2000,1.3],[2500,1.3],[3500,1.3],[4500,1.2],[5000,1.3],[8000,1.3],[6000,1.3],[6500,1.4],[7000,1.4],[7500,1.3],[10000,1.3],[8500,1.3],[9000,1.4],[9500,1.4],[10000,1.4],[11000,1.3],[13000,1.3]],"rocktal":[[1000,1.3],[2000,1.3],[2500,1.3],[3500,1.4],[4500,1.3],[5000,1.3],[5500,1.3],[6000,1.4],[6500,1.3],[7000,1.3],[7500,1.3],[8000,1.3],[8500,1.3],[9000,1.3],[9500,1.3],[10000,1.4],[13000,1.3],[11000,1.4]],"mechas":[[1000,1.3],[2000,1.3],[2500,1.4],[3500,1.3],[4500,1.4],[5000,1.3],[5500,1.3],[6000,1.4],[6500,1.4],[7000,1.3],[7500,1.3],[8000,1.4],[8500,1.3],[9000,1.4],[9500,1.4],[10000,1.4],[13000,1.3],[11000,1.4]],"kaelesh":[[1000,1.4],[2000,1.3],[2500,1.4],[3500,1.4],[4500,1.4],[5000,1.4],[5500,1.3],[6000,1.2],[6500,1.4],[7000,1.2],[7500,1.4],[8000,1.3],[8500,1.3],[9000,1.4],[9500,1.4],[10000,1.4],[13000,1.3],[11000,1.4]]};
// Durata degli edifici forme di vita (secondi): livello x base x fattore^livello, nello stesso ordine di buildingOrder.
// Ricavata dai tempi di livello 1 e 2 di tutti i 48 edifici (calcolatore proxyforgame, velocità 1, senza robot) e
// verificata sul gioco con la Fusione magmatica (livelli 15, 16, 17 su Gonnia).
LIFEFORMS.buildingDuration = {"rocktal": [[40, 1.21], [40, 1.21], [16000, 1.25], [16000, 1.6], [64000, 1.7], [2000, 1.3], [16000, 1.25], [40000, 1.4], [40000, 1.2], [52000, 1.2], [90000, 1.3], [95000, 1.3]], "humans": [[40, 1.21], [40, 1.25], [16000, 1.25], [16000, 1.6], [64000, 1.7], [2000, 1.3], [12000, 1.17], [28000, 1.2], [40000, 1.2], [52000, 1.2], [90000, 1.3], [95000, 1.2]], "mechas": [[40, 1.22], [48, 1.2], [16000, 1.25], [16000, 1.6], [64000, 1.7], [2000, 1.3], [16000, 1.4], [12000, 1.17], [40000, 1.3], [52000, 1.2], [50000, 1.3], [95000, 1.4]], "kaelesh": [[40, 1.22], [40, 1.22], [16000, 1.25], [16000, 1.7], [64000, 1.8], [2000, 1.35], [12000, 1.2], [16000, 1.18], [40000, 1.2], [52000, 1.8], [90000, 1.3], [95000, 1.3]]};
// Correzioni dal calcolatore proxyforgame (livelli 1 e 2 di tutte le ricerche Umani): Nascondiglio Orbitale ha base 4140, non 4500
LIFEFORMS.techDuration.humans[4] = [4140, 1.2];
// completa i dati: costo (ed energia) dai fogli dove manca il valore verificato sul gioco
for (const [race, sh] of Object.entries(LIFEFORMS.sheet)) {
  const R = LIFEFORMS.races[race];
  R.buildingOrder.forEach((key, i) => {
    const b = R.buildings[key];
    if (b && !b.cost && sh.buildings[i]) b.cost = { base: sh.buildings[i][0], factor: sh.buildings[i][1], source: 'sheet' };
    const e = (sh.energy || {})[key];
    if (b && e && !b.energyCons) b.energyCons = { base: e[0], factor: e[1], source: 'game' };
    const du = LIFEFORMS.buildingDuration[race][i];
    if (b && du && !b.duration) b.duration = { base: du[0], factor: du[1] };
  });
  R.techs.forEach((t, i) => {
    if (!t.cost && sh.techs[i]) t.cost = { base: sh.techs[i][0], factor: sh.techs[i][1], source: 'sheet' };
    const d = LIFEFORMS.techDuration[race][i];
    if (d) t.duration = { base: d[0], factor: d[1] };
  });
}

if (typeof module !== 'undefined') module.exports = LIFEFORMS;
