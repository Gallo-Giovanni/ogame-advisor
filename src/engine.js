// OGame Advisor - motore di calcolo
// Funzioni pure: niente DOM, niente rete. Funziona nel browser e in Node (per i test).

const Engine = (() => {
  // Dati delle forme di vita (src/lifeforms.js): variabile globale nel browser, require() in Node
  const LF = typeof LIFEFORMS !== 'undefined' ? LIFEFORMS
    : (typeof require !== 'undefined' ? require('./lifeforms.js') : null);
  const LF_RACES = ['humans', 'rocktal', 'mechas', 'kaelesh'];
  const LF_KEYS = ['metal', 'crystal', 'deut', 'energy', 'plasma_tech_cost'];
  const RES = ['metal', 'crystal', 'deut'];

  // ---- Costo per costruire un livello (dal livello-1 al livello) ----
  const BUILD = {
    metal_mine:     { base: [60, 15, 0],      factor: 1.5 },
    crystal_mine:   { base: [48, 24, 0],      factor: 1.6 },
    deut_synth:     { base: [225, 75, 0],     factor: 1.5 },
    solar_plant:    { base: [75, 30, 0],      factor: 1.5 },
    fusion_reactor: { base: [900, 360, 180],  factor: 1.8 },
  };
  const SATELLITE_COST = [0, 2000, 500];
  const PLASMA = { base: [2000, 4000, 1000], factor: 2 };
  const ASTRO = { base: [4000, 8000, 4000], factor: 1.75 };
  const COLONY_SHIP = [10000, 20000, 10000];

  function levelCost(key, level) {
    // L'Astrofisica è arrotondata alle centinaia: 100 x round(40 / 80 / 40 x 1,75^(livello-1)) (guida ufficiale)
    if (key === 'astro') return [40, 80, 40].map(x => 100 * Math.floor(0.5 + x * Math.pow(1.75, level - 1)));
    const b = key === 'plasma' ? PLASMA : BUILD[key];
    const m = Math.pow(b.factor, level - 1);
    return b.base.map(x => Math.floor(x * m));
  }

  // Tempo di costruzione di un edificio classico, in secondi (guida ufficiale, verificato sul gioco: Miniera di metallo
  // 37 e 38 con Robot 12, Naniti 6, velocità 5 = 15o 45m 4s e 23o 37m 36s, al secondo). Si usa il costo SENZA lo
  // sconto del Centro di Mineralogia. Naniti, Avamposto lunare, Falange e Portale non hanno il termine max(4 - livello/2, 1).
  function buildTime(cost, level, robot, nanite, speed, noMax = false) {
    const k = noMax ? 1 : Math.max(4 - level / 2, 1);
    return Math.max(1, Math.round((cost[0] + cost[1]) / (2500 * k * (1 + (robot || 0)) * Math.pow(2, nanite || 0) * (speed || 1)) * 3600));
  }

  // Tempo di una ricerca classica, in secondi: (metallo + cristallo) / (1000 x (1 + laboratori)) ore, diviso per la
  // velocità delle ricerche; Esploratore -25%, Tecnico (ufficiale) -25%, ricerche forme di vita sul tempo delle ricerche (valore negativo).
  // labs = livello effettivo dei laboratori (quello del pianeta più i migliori collegati dalla Rete interplanetaria).
  // Verificato sul gioco: Rete interplanetaria 10 su Gonnia, laboratori 150, Esploratore, Tecnico, velocità ricerca x15 = 3g 9o 22m.
  function researchTime(cost, labs, speed, explorer, lfTime = 0, technocrat = false) {
    return Math.max(1, Math.round((cost[0] + cost[1]) / (1000 * (1 + (labs || 0))) * (explorer ? 0.75 : 1) * (technocrat ? 0.75 : 1) * (1 + Math.min(0, lfTime)) / (speed || 1) * 3600));
  }
  // Livello effettivo dei laboratori per una ricerca fatta su `planet`: il suo laboratorio più i migliori `irn` degli altri pianeti
  function labLevel(planet, planets, irn) {
    const lab = p => +((p.buildings || {})[31]) || 0;
    const others = planets.filter(p => p !== planet && p.id !== planet.id).map(lab).sort((a, b) => b - a).slice(0, irn || 0);
    return lab(planet) + others.reduce((t, x) => t + x, 0);
  }

  // ---- Produzione base all'ora (prima dei bonus e della velocità) ----
  const g = L => L * Math.pow(1.1, L);
  const baseProd = {
    metal_mine:   L => 30 * g(L),
    crystal_mine: L => 20 * g(L),
    deut_synth:   (L, tMax) => 10 * g(L) * (1.44 - 0.004 * tMax),
  };

  // ---- Energia ----
  const consumption = {
    metal_mine:   L => Math.ceil(10 * g(L)),
    crystal_mine: L => Math.ceil(10 * g(L)),
    deut_synth:   L => Math.ceil(20 * g(L)),
  };
  // Le tecnologie delle forme di vita possono ridurre l'energia usata dalle miniere (es. -5%)
  // Riduzione del consumo delle miniere: dagli edifici forme di vita del pianeta quando sono inseriti
  // (Camera di Disgregazione Rock'tal), altrimenti dal valore manuale dell'account
  const consFactor = (profile, planet) => {
    if (profile && profile._lf && profile._lf.computed && planet) return Math.max(0, 1 + buildingEffects(planet).mineConsumption);
    return 1 - Math.min(100, +profile.energy_consumption_reduction || 0) / 100;
  };
  // La centrale a fusione consuma deuterio: 10 x L x 1,1^L all'ora, per la velocità dell'economia
  const fusionDeut = L => 10 * g(L);

  // Crawler (verificati sulla pagina del gioco): ogni crawler attivo aggiunge lo 0,02% di ogni riga miniera
  // (x1,5 per la classe Collezionista) e consuma 50 di energia, entrambi in proporzione alla % di produzione dei crawler.
  // Funzionano al massimo 8 crawler per livello di miniera (metallo + cristallo + deuterio); un Collezionista con il
  // Geologo ne ha il 10% in più. Solo il Collezionista può spingerli fino al 150%, e ogni 10% oltre il 100%
  // costa il 20% di energia in più (guida ufficiale).
  const isCollector = profile => profile && profile.player_class === 'collector';
  const maxCrawlers = (planet, profile) => Math.floor(8 * ((+planet.metal_mine || 0) + (+planet.crystal_mine || 0) + (+planet.deut_synth || 0))
    * (isCollector(profile) && profile.geologist ? 1.1 : 1));
  const crawlerPct = (planet, profile) => {
    const p = (planet.crawler_pct === undefined || planet.crawler_pct === null || planet.crawler_pct === '' ? 100 : +planet.crawler_pct) / 100;
    return Math.max(0, Math.min(p, isCollector(profile) ? 1.5 : 1));
  };
  const workingCrawlers = (planet, profile) => Math.min(+planet.crawlers || 0, maxCrawlers(planet, profile));
  // i crawler aggiungono al massimo +50% di produzione (guida ufficiale: un Collezionista al 150% ci arriva con 1.111 crawler)
  const crawlerBonus = (profile, planet) =>
    Math.min(0.5, workingCrawlers(planet, profile) * 0.0002 * (isCollector(profile) ? 1.5 : 1) * crawlerPct(planet, profile));
  const crawlerEnergy = (profile, planet) => {
    const p = crawlerPct(planet, profile);
    const energyShare = p <= 1 ? p : 1 + 2 * (p - 1); // sovraccarico: +20% di energia ogni +10%
    return Math.round(workingCrawlers(planet, profile) * 50 * energyShare * consFactor(profile, planet));
  };

  // Centro di Mineralogia (Rock'tal): ogni livello rende le tre miniere più economiche dello 0,5% (verificato sul gioco al livello 1:
  // i costi di tutte e tre le miniere). La tabella Tech Info del gioco
  // lo mostra arrotondato per eccesso (1, 1, 2, 2, 3 ... e 8 al livello 14, dove 14 x 0,5 = 7,000000001 con i decimali del computer).
  // Il livello 1 costa 250.000 metallo, 150.000 cristallo e 100.000 deuterio (prima degli sconti del Monolite).
  const MRC_LEVEL1 = [250000, 150000, 100000];

  // Costo ed energia degli edifici forme di vita (formule in src/lifeforms.js). Il Monolite (Rock'tal) riduce entrambi
  // per gli edifici Rock'tal; la sua tabella è usata così come la mostra il gioco.
  const monolithDisc = planet => {
    if (!LF || !planet || planet.lf_race !== 'rocktal') return 0;
    const lvl = +((planet.lf_buildings || {}).monolith) || 0;
    return lvl ? -(LF.races.rocktal.buildings.monolith.buildingCostByLevel[lvl] || 0) : 0;
  };
  const lfBuildingCost = (b, L, disc = 0) => b.cost.base.map(x => Math.round(x * Math.pow(b.cost.factor, L - 1) * L * (1 - disc)));
  // energia libera che serve per costruire un livello (solo alcuni edifici, es. Condensatore Antimateria Kaelesh)
  const lfBuildEnergy = (b, L) => (b && b.buildEnergy && L > 0 ? Math.floor(L * b.buildEnergy.base * Math.pow(b.buildEnergy.factor, L)) : 0);
  const lfBuildingEnergy = (b, L) => (L <= 0 ? 0 : L === 1 ? b.energyCons.base : Math.floor(L * b.energyCons.base * Math.pow(b.energyCons.factor, L)));
  const MRC_ENERGY_L1 = 120;
  const mrcLevel = planet => (planet.mrc_level === undefined || planet.mrc_level === null || planet.mrc_level === '' ? null : +planet.mrc_level);
  const mineCost = (key, level, mrc) => levelCost(key, level).map(x => Math.round(x * (1 - 0.005 * (mrc || 0))));
  const solarEnergy = L => Math.floor(20 * g(L));
  const fusionEnergy = (L, energyTech) => Math.floor(30 * L * Math.pow(1.05 + 0.01 * energyTech, L));
  const satelliteEnergy = tMax => Math.max(1, Math.floor((tMax + 140) / 6));

  // ---- Forme di vita ----
  // Effetti degli edifici forme di vita di un pianeta (razza del pianeta, livelli in planet.lf_buildings)
  function buildingEffects(planet) {
    const e = { metal: 0, crystal: 0, deut: 0, energy: 0, mineConsumption: 0, techBoost: 0, techBoostOwnRace: 0 };
    const race = planet && planet.lf_race;
    if (!LF || !race || !LF.races[race]) return e;
    const levels = planet.lf_buildings || {};
    for (const [key, b] of Object.entries(LF.races[race].buildings)) {
      if (!b || !b.effect || key === 'mineral_centre') continue; // il Centro agisce sui costi (mrc_level)
      const lvl = +levels[key] || 0;
      for (const k of Object.keys(e)) if (b.effect[k]) e[k] += b.effect[k] * lvl;
    }
    return e;
  }
  // Sconto sul costo delle ricerche di un pianeta: il suo edificio di ricerca (Centro di Ricerca, Tecnologicus Runarum, ...)
  function researchDisc(planet) {
    const race = planet && planet.lf_race;
    if (!LF || !race || !LF.races[race]) return 0;
    const levels = planet.lf_buildings || {};
    let d = 0;
    for (const [key, b] of Object.entries(LF.races[race].buildings)) {
      if (!b || !b.effect || !b.effect.techCost) continue;
      const x = b.effect.techCost * (+levels[key] || 0);
      d += b.max && b.max.techCost ? Math.max(b.max.techCost, x) : x;
    }
    return -d;
  }
  // Riduzione del tempo delle ricerche forme di vita data dall'edificio di ricerca del pianeta (-2% per livello, massimo 99%)
  function researchTimeDisc(planet) {
    const race = planet && planet.lf_race;
    if (!LF || !race || !LF.races[race]) return 0;
    let d = 0;
    for (const [key, b] of Object.entries(LF.races[race].buildings))
      if (b && b.effect && b.effect.techTime) d += -b.effect.techTime * (+((planet.lf_buildings || {})[key]) || 0);
    return Math.min(0.99, d);
  }
  // Durata di una ricerca forme di vita in secondi: livello x base x fattore^livello, ridotta dall'edificio di ricerca e
  // dalle ricerche sul tempo delle ricerche forme di vita, divisa per la velocità di sviluppo
  const lfTechTime = (t, L, timeDisc, speed, lfTime = 0) => !t.duration ? null
    : Math.max(1, Math.floor(L * t.duration.base * Math.pow(t.duration.factor, L) * (1 - timeDisc) * (1 + Math.min(0, lfTime)) / (speed || 1)));
  // Durata di un edificio forme di vita in secondi (solo quelli con la durata verificata): livello x base x fattore^livello,
  // ridotta dal Monolite (edifici Rock'tal), divisa per (1 + Fabbrica di robot) x 2^Naniti x velocità di sviluppo
  const lfBuildingTime = (b, L, disc, robot, nanite, speed) => !b.duration ? null
    : Math.max(1, Math.floor(L * b.duration.base * Math.pow(b.duration.factor, L) * (1 - disc) / ((1 + (robot || 0)) * Math.pow(2, nanite || 0) * (speed || 1))));
  const lfTechCost = (t, L, disc = 0) => t.cost.base.map(x => Math.round(x * Math.pow(t.cost.factor, L - 1) * L * (1 - disc)));
  // Effetto base di una ricerca, potenziato dagli edifici del suo pianeta e dal livello della sua razza
  // (gioco: effettivo = base x (1 + potenziamento edifici) x (1 + 0,1% x livello razza))
  // keys: quali effetti restituire (di base: quelli usati dalla produzione); 'all' = tutti gli effetti numerici della ricerca
  function techEffect(profile, planet, slot, entry, keys = LF_KEYS) {
    const out = {};
    if (!LF || !entry || !LF.races[entry.race] || !(+entry.level > 0)) return out;
    const tech = LF.races[entry.race].techs[slot - 1];
    if (!tech) return out;
    const be = buildingEffects(planet);
    // Potenziamento = edifici del pianeta che potenziano le ricerche + livello della razza DEL PIANETA, sommati
    // (FAQ del forum; verificato sulla pagina Impostazioni risorse del gioco: 24,367% metallo contro 24,367% calcolato)
    const levelBonus = planet.lf_race ? LF.rules.levelBonusPerLevel.value * (+profile['lf_level_' + planet.lf_race] || 0) : 0;
    const boost = 1 + be.techBoost + (entry.race === 'kaelesh' ? be.techBoostOwnRace : 0) + levelBonus;
    const ks = keys === 'all' ? Object.keys(tech.perLevel).filter(k => typeof tech.perLevel[k] === 'number') : keys;
    for (const k of ks) if (tech.perLevel[k]) out[k] = tech.perLevel[k] * +entry.level * boost;
    return out;
  }
  // Le ricerche forme di vita agiscono su tutti i pianeti: somma su tutto l'account (tutti i pianeti, anche quelli esclusi)
  function techTotals(profile, planets) {
    const t = Object.fromEntries(LF_KEYS.map(k => [k, 0]));
    for (const p of planets) {
      const techs = p.lf_techs || {};
      for (const slot of Object.keys(techs)) {
        const eff = techEffect(profile, p, +slot, techs[slot]);
        for (const k of LF_KEYS) t[k] += eff[k] || 0;
      }
    }
    return t;
  }
  // Tutti gli effetti numerici delle ricerche forme di vita dell'account (spedizioni, tempi di ricerca, ...), sommati sui pianeti
  function allTechTotals(profile, planets) {
    const t = {};
    for (const p of planets) for (const [slot, e] of Object.entries(p.lf_techs || {})) {
      const eff = techEffect(profile, p, +slot, e, 'all');
      for (const k in eff) t[k] = (t[k] || 0) + eff[k];
    }
    return t;
  }
  const hasLifeforms = p => !!p.lf_race || Object.values(p.lf_techs || {}).some(e => e && e.race && +e.level > 0);
  // Profilo con i totali delle forme di vita. Se nessun pianeta ha razza o ricerche, si usano
  // le percentuali manuali di ogni pianeta (lf_metal...), come prima.
  function withLifeforms(profile, planets) {
    const computed = planets.some(hasLifeforms);
    return { ...profile, _lf: { computed, tech: techTotals(profile, planets) } };
  }

  // ---- Bonus ----
  function positionBonus(pos) {
    const metal = { 8: 0.35, 7: 0.23, 9: 0.23, 6: 0.17, 10: 0.17 }[pos] || 0;
    const crystal = { 1: 0.40, 2: 0.30, 3: 0.20 }[pos] || 0;
    return { metal, crystal, deut: 0 };
  }

  // Come OGame somma i bonus (verificato sulla pagina "Impostazioni risorse" del gioco):
  // riga miniera = base x (1 + bonus di posizione); Plasma, Geologo, Staff, classe, alleanza, forme di vita e
  // item sono ciascuno una percentuale di quella riga, sommate tra loro.
  // withItems: include i booster (item) temporanei del pianeta (valori in percentuale)
  function multipliers(profile, planet, withItems = true) {
    const pos = positionBonus(planet.position);
    // booster per singola risorsa più il booster su tutte e tre le risorse (l'energia ha il suo)
    const it = k => (withItems ? ((+planet[k] || 0) + (k === 'item_energy' ? 0 : +planet.item_all || 0)) / 100 : 0);
    // Bonus forme di vita: da razza, edifici e ricerche quando inseriti; altrimenti la % manuale del pianeta
    // (i dati vecchi usano il valore dell'account)
    const LFX = profile._lf && profile._lf.computed;
    const be = LFX ? buildingEffects(planet) : null;
    const lfMap = { lf_metal: 'metal', lf_crystal: 'crystal', lf_deut: 'deut', lf_energy: 'energy' };
    const lf = (k, old) => LFX ? be[lfMap[k]] + profile._lf.tech[lfMap[k]]
      : (planet[k] !== undefined && planet[k] !== null && planet[k] !== '' ? +planet[k] : +profile[old] || 0) / 100;
    const common = (profile.geologist ? 0.10 : 0)
      + (profile.commanding_staff ? 0.02 : 0)
      + (profile.player_class === 'collector' ? 0.25 : 0)
      + (profile.alliance_trader ? 0.05 : 0);
    const p = profile.plasma_tech || 0;
    const cr = crawlerBonus(profile, planet);
    return {
      posMetal: 1 + pos.metal, posCrystal: 1 + pos.crystal,
      metal:   (1 + pos.metal) * (1 + common + cr + p * 0.01 + lf('lf_metal', 'lf_bonus_metal') + it('item_metal')),
      crystal: (1 + pos.crystal) * (1 + common + cr + p * 0.0066 + lf('lf_crystal', 'lf_bonus_crystal') + it('item_crystal')),
      deut:    1 + common + cr + p * 0.0033 + lf('lf_deut', 'lf_bonus_deut') + it('item_deut'),
      energy:  1 + (profile.engineer ? 0.10 : 0) + (profile.commanding_staff ? 0.02 : 0)
               + (profile.player_class === 'collector' ? 0.10 : 0) + (profile.alliance_trader ? 0.05 : 0)
               + lf('lf_energy', 'lf_bonus_energy') + it('item_energy'),
    };
  }

  // Valore di un gruppo di risorse [m, c, d] in metallo equivalente
  const value = (bundle, profile) =>
    bundle[0] * profile.ratio_metal + bundle[1] * profile.ratio_crystal + bundle[2] * profile.ratio_deut;
  const toMetalEq = (bundle, profile) => value(bundle, profile) / profile.ratio_metal;

  // Energia prodotta dal pianeta (centrale solare, centrale a fusione, satelliti solari, con i bonus) ed
  // energia usata da miniere e crawler, dai livelli degli edifici
  function energyModel(profile, planet, mult = multipliers(profile, planet), needOwn) {
    if (needOwn === undefined) needOwn = Math.round((consumption.metal_mine(planet.metal_mine)
      + consumption.crystal_mine(planet.crystal_mine) + consumption.deut_synth(planet.deut_synth)) * consFactor(profile, planet))
      + crawlerEnergy(profile, planet);
    const produced = Math.floor((solarEnergy(planet.solar_plant)
      + fusionEnergy(planet.fusion_reactor, profile.energy_tech)
      + (+planet.solar_satellites || 0) * satelliteEnergy(planet.temp_max)) * mult.energy);
    return { produced, need: needOwn, balance: produced - needOwn };
  }

  // ---- Stato del pianeta ----
  function planetState(profile, planet) {
    const speed = profile.economy_speed;
    const mult = multipliers(profile, planet);
    // Gli upgrade durano per sempre, gli item scadono: il giocatore decide se contarli nella classifica
    const multRank = multipliers(profile, planet, profile.items_in_ranking === true);
    // Energia usata da miniere e crawler (anche gli edifici forme di vita consumano, ma quanto lo sa solo il gioco)
    const needOwn = Math.round((consumption.metal_mine(planet.metal_mine)
      + consumption.crystal_mine(planet.crystal_mine)
      + consumption.deut_synth(planet.deut_synth)) * consFactor(profile, planet)) + crawlerEnergy(profile, planet);
    const { produced: producedModel } = energyModel(profile, planet, mult, needOwn);

    let balance, produced, need;
    if (planet.energy_balance !== null && planet.energy_balance !== undefined && planet.energy_balance !== '') {
      // Bilancio del gioco: sempre preferito. Il fattore del gioco è prodotta / fabbisogno totale, e il
      // fabbisogno totale conta anche gli edifici forme di vita, quindi si ricava dall'energia prodotta.
      balance = +planet.energy_balance;
      produced = producedModel > 0 ? producedModel : needOwn + balance;
      need = Math.max(produced - balance, 0);
    } else {
      produced = producedModel;
      need = needOwn;
      balance = produced - need;
    }
    const factor = need > 0 ? Math.max(0, Math.min(1, produced / need)) : 1;

    // Produzione oraria delle miniere al 100% (senza reddito base)
    const full = [
      baseProd.metal_mine(planet.metal_mine) * mult.metal * speed,
      baseProd.crystal_mine(planet.crystal_mine) * mult.crystal * speed,
      Math.max(0, baseProd.deut_synth(planet.deut_synth, planet.temp_max)) * mult.deut * speed,
    ];
    // Quanto rende davvero il pianeta all'ora: miniere al fattore di energia, più il reddito base, meno il deuterio della fusione
    const income = [30 * speed * mult.posMetal, 15 * speed * mult.posCrystal, 0];
    const fuel = fusionDeut(planet.fusion_reactor || 0) * speed;
    const actual = full.map((x, i) => x * factor + income[i] - (i === 2 ? fuel : 0));
    return { mult, multRank, need, produced, balance, factor, full, income, fuel, actual };
  }

  // Modo più economico per aggiungere `energy` unità su un pianeta: satelliti, livelli di centrale solare o di centrale a fusione.
  // La fusione consuma deuterio ogni ora: se si conoscono costo e guadagno dell'upgrade (ctx) vince l'opzione con
  // l'ammortamento più breve, (costo + energia) / (guadagno - deuterio bruciato); altrimenti il deuterio conta per FUEL_HOURS ore.
  // profile.energy_satellites_only: il giocatore vuole solo satelliti.
  const FUEL_HOURS = 24 * 90;
  // ---- Requisiti (albero delle tecnologie del gioco) ----
  // Chiavi: b<id> edificio del pianeta, r<id> ricerca dell'account, s<id> nave. Quando qualcosa è a 0 e serve per un
  // consiglio, si controllano i requisiti (anche quelli dei requisiti) e quello che manca si aggiunge al costo.
  // Il Laboratorio di ricerca conta come il più alto dell'account; se manca, va costruito sul pianeta del consiglio.
  // Un livello non inserito conta come 0: i campi si chiedono a mano (account e scheda del pianeta) o arrivano
  // con l'importazione dalla Vista impero.
  const REQ = {
    b12: [['b3', 5], ['r113', 3]],             // Centrale a fusione
    b15: [['b14', 10], ['r108', 10]],          // Fabbrica di naniti
    b21: [['b14', 2]],                         // Cantiere spaziale
    r113: [['b31', 1]],                        // Tecnologia energetica
    r120: [['b31', 1], ['r113', 2]],           // Tecnologia laser
    r121: [['b31', 4], ['r120', 5], ['r113', 4]], // Tecnologia ionica
    r122: [['b31', 4], ['r113', 8], ['r120', 10], ['r121', 5]], // Tecnologia plasma
    r106: [['b31', 3]],                        // Tecnologia spionaggio
    r108: [['b31', 1]],                        // Tecnologia informatica
    r110: [['b31', 6], ['r113', 3]],           // Tecnologia degli scudi
    r111: [['b31', 2]],                        // Tecnologia delle corazze
    r114: [['b31', 7], ['r113', 5], ['r110', 5]], // Tecnologia iperspaziale
    r115: [['b31', 1], ['r113', 1]],           // Propulsore a combustione
    r117: [['b31', 2], ['r113', 1]],           // Propulsore a impulso
    r124: [['b31', 3], ['r106', 4], ['r117', 3]], // Astrofisica
    s208: [['b21', 4], ['r117', 3]],           // Nave colonizzatrice
    b33: [['b15', 1], ['r113', 12]],           // Terraformer
    s212: [['b21', 1]],                        // Satellite solare
    s217: [['b21', 5], ['r115', 4], ['r111', 4], ['r120', 4]], // Crawler
  };
  const REQ_COST = {
    b14: [[400, 120, 200], 2], b15: [[1000000, 500000, 100000], 2], b21: [[400, 200, 100], 2], b31: [[200, 400, 200], 2],
    r106: [[200, 1000, 200], 2], r108: [[0, 400, 600], 2], r110: [[200, 600, 0], 2], r111: [[1000, 0, 0], 2],
    r113: [[0, 800, 400], 2], r114: [[0, 4000, 2000], 2], r115: [[400, 0, 600], 2], r117: [[2000, 4000, 600], 2],
    r120: [[200, 100, 0], 2], r121: [[1000, 300, 100], 2],
    b22: [[1000, 0, 0], 2], b23: [[1000, 500, 0], 2], b24: [[1000, 1000, 0], 2], // depositi
    b33: [[0, 50000, 100000], 2], // Terraformer
  };
  const REQ_NAMES = {
    b3: 'Sintetizzatore di deuterio', b12: 'Centrale a fusione', b14: 'Fabbrica di robot', b15: 'Fabbrica di naniti', b21: 'Cantiere spaziale',
    b31: 'Laboratorio di ricerca', b22: 'Deposito di metallo', b23: 'Deposito di cristallo', b24: 'Cisterna di deuterio', b33: 'Terraformer', r106: 'Tecnologia per lo spionaggio', r108: 'Tecnologia informatica', r110: 'Tecnologia degli scudi',
    r111: 'Tecnologia delle corazze', r113: 'Tecnologia energetica', r114: 'Tecnologia iperspaziale', r115: 'Propulsore a combustione',
    r117: 'Propulsore a impulso', r120: 'Tecnologia dei laser', r121: 'Tecnologia ionica', r122: 'Tecnologia del plasma', r124: 'Astrofisica',
  };
  // colonne del pianeta e campi del profilo che hanno un nome proprio
  const B_COL = { 1: 'metal_mine', 2: 'crystal_mine', 3: 'deut_synth', 4: 'solar_plant', 12: 'fusion_reactor', 14: 'robotics_factory', 15: 'nanite_factory' };
  const R_COL = { 113: 'energy_tech', 114: 'hyperspace_tech', 122: 'plasma_tech', 124: 'astro_tech' };
  function reqCost(key, level) {
    if (key === 'b3') return levelCost('deut_synth', level);
    if (key === 'b12') return levelCost('fusion_reactor', level);
    if (key === 'r122') return levelCost('plasma', level);
    if (key === 'r124') return levelCost('astro', level);
    const [base, f] = REQ_COST[key];
    return base.map(x => Math.floor(x * Math.pow(f, level - 1)));
  }
  function buildingLevel(planet, id) {
    const col = B_COL[id];
    if (col && planet[col] != null && planet[col] !== '') return +planet[col] || 0;
    const b = planet.buildings || {};
    return +b[id] || 0;
  }
  function researchLevel(profile, id) {
    const col = R_COL[id];
    if (col && profile[col] != null && profile[col] !== '') return +profile[col] || 0; // campo proprio, si modifica a mano
    return +((profile.research || {})[id]) || 0;
  }
  // Requisiti mancanti di `key` (anche a catena): { cost, steps: [{ key, from, to }], levels: { key: livello dopo } }
  function prereq(profile, planet, planets, key) {
    const all = planets && planets.length ? planets : [planet];
    const lv = {};
    const cur = k => {
      if (k in lv) return lv[k];
      const id = +k.slice(1);
      if (k === 'b31') return Math.max(0, ...all.map(p => buildingLevel(p, 31)));
      return k[0] === 'b' ? buildingLevel(planet, id) : researchLevel(profile, id);
    };
    let cost = [0, 0, 0];
    const steps = [];
    const need = (k, level) => {
      const from = cur(k);
      if (from >= level) return;
      for (const [rk, rl] of REQ[k] || []) need(rk, rl);
      for (let L = from + 1; L <= level; L++) { const c = reqCost(k, L); cost = cost.map((x, i) => x + c[i]); }
      lv[k] = level;
      steps.push({ key: k, from, to: level });
    };
    for (const k of [].concat(key)) {
      if (Array.isArray(k)) need(k[0], k[1]); // [chiave, livello]: serve proprio quel livello (es. Astrofisica 1)
      else for (const [rk, rl] of REQ[k] || []) need(rk, rl);
    }
    // stesso edificio o ricerca alzato più volte (es. Laboratorio 0 → 2 e poi 2 → 3): una riga sola, al primo posto
    const merged = [];
    for (const x of steps) { const m = merged.find(y => y.key === x.key); if (m) m.to = Math.max(m.to, x.to); else merged.push({ ...x }); }
    return { cost, steps: merged, levels: lv };
  }
  // Depositi: capienza = 5000 x parte intera di 2,5 x e^(20 x livello / 33) (Tech Info del gioco: livello 1 = 20.000,
  // 7 = 865.000, 15 = 110.925.000, 27 = 159.789 milioni). Per pagare un upgrade con la produzione del pianeta ogni
  // risorsa del costo deve stare nel suo deposito; con profile.count_storage = false non si conta (risorse portate
  // con le flotte, che possono superare il deposito).
  const storageCap = L => 5000 * Math.floor(2.5 * Math.exp(20 * L / 33));
  function storageNeed(profile, planet, cost, T) {
    const out = { cost: [0, 0, 0], time: 0, steps: [] };
    if (profile.count_storage === false || !planet) return out;
    [22, 23, 24].forEach((id, r) => {
      const from = buildingLevel(planet, id);
      let to = from;
      while (storageCap(to) < cost[r] && to < 40) to++;
      if (to === from) return;
      for (let L = from + 1; L <= to; L++) {
        const c = reqCost('b' + id, L); out.cost = out.cost.map((x, i) => x + c[i]);
        if (T) out.time += T.build(planet, c, L);
      }
      out.steps.push({ key: 'b' + id, from, to });
    });
    return out;
  }
  // Campi del pianeta (Vista impero: usati e totali). Ogni livello di edificio classico occupa un campo (non il
  // Porto spaziale né gli edifici forme di vita: verificato sulla Vista impero). Il Terraformer al livello L dà
  // floor(5,5 x L) campi in più (verificato: 1 = +5, 2 = +11, 3 = +16, 5 = +27) e occupa anche lui un campo per livello.
  // Campi non noti: nessun limite.
  const terraFields = L => Math.floor(5.5 * L);
  function fieldsNeed(profile, planet, n, T, planets) {
    const out = { cost: [0, 0, 0], time: 0, steps: [], used: n, gain: 0 };
    const f = planet && planet.fields;
    if (!f || !(f.max > 0) || n <= 0) return out;
    const free = f.max - f.used;
    if (free >= n) return out;
    const t0 = buildingLevel(planet, 33);
    let t = t0;
    while (free + terraFields(t) - terraFields(t0) - (t - t0) < n && t < t0 + 40) t++;
    const pre = prereq(profile, planet, planets, 'b33'); // Fabbrica di naniti 1, Tecnologia energetica 12 e i loro requisiti
    out.cost = pre.cost.slice();
    if (T) out.time = T.pre(planet, pre.steps);
    for (let L = t0 + 1; L <= t; L++) { const c = reqCost('b33', L); out.cost = out.cost.map((x, i) => x + c[i]); if (T) out.time += T.build(planet, c, L); }
    out.steps = pre.steps.concat({ key: 'b33', from: t0, to: t });
    out.used = n + (t - t0) + pre.steps.filter(x => x.key[0] === 'b').reduce((a, x) => a + x.to - x.from, 0);
    out.gain = terraFields(t) - terraFields(t0);
    return out;
  }
  // il Terraformer chiede anche energia disponibile per essere costruito: 1.000 x 2^(livello-1) (gioco: 1 = 1k, 4 = 8k, 6 = 32k)
  const fieldsText = fn => (fn.steps.length ? `; il pianeta non ha campi liberi: servono ${prereqText(fn.steps)}, già compresi nel costo e nel tempo` : '');
  // Energia richiesta per costruire (Terraformer, alcuni edifici Kaelesh): se l'energia libera dopo l'upgrade non basta,
  // si aggiunge l'energia che manca (satelliti, solare o fusione), con costo e tempo. Dopo la costruzione resta al pianeta.
  function buildEnergyFix(profile, planet, need, free, T, planets) {
    if (!(need > 0) || free >= need) return null;
    const fix = energyFix(profile, planet, need - Math.max(0, free), { planets });
    return fix && { fix, need, time: T ? T.fix(planet, fix) : 0 };
  }
  const buildEnergyText = be => (be ? `; per costruirlo serve ${fmt(be.need)} di energia libera: in più ${fixText(be.fix)}, già compreso nel costo` : '');
  const storageText = sn => (sn.steps.length ? `; per pagarlo servono i depositi ${prereqText(sn.steps)}, già compresi nel costo e nel tempo` : '');
  const waitText = h => { const m = Math.max(1, Math.round(h * 60)), d = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60), mm = m % 60;
    return [d ? d + 'g' : '', hh ? hh + 'o' : '', !d && mm ? mm + 'm' : ''].filter(Boolean).join(' ') || '1m'; };
  const prereqText = steps => steps.map(x => `${REQ_NAMES[x.key]} ${x.from} → ${x.to}`).join(', ');
  // modifiche da salvare per i requisiti fatti: edifici sul pianeta, ricerche sul profilo
  function prereqPatch(profile, planet, steps, patch, prof) {
    for (const x of steps || []) {
      const id = +x.key.slice(1);
      if (x.key[0] === 'b') {
        if (B_COL[id]) patch[B_COL[id]] = x.to;
        patch.buildings = { ...(planet.buildings || {}), ...(patch.buildings || {}), [id]: x.to };
      } else {
        if (R_COL[id]) prof[R_COL[id]] = x.to;
        if (profile.research) prof.research = { ...profile.research, ...(prof.research || {}), [id]: x.to };
      }
    }
  }
  // compatibilità: requisiti della Centrale a fusione
  function fusionPrereq(profile, planet, planets) {
    const pr = prereq(profile, planet, planets, 'b12');
    const et = 'r113' in pr.levels ? pr.levels.r113 : +profile.energy_tech || 0;
    return { cost: pr.cost, steps: pr.steps, energyTech: et };
  }
  function energyFix(profile, planet, energy, ctx) {
    if (energy <= 0) return null;
    const mult = multipliers(profile, planet, profile.items_in_ranking === true);
    const perSat = Math.floor(satelliteEnergy(planet.temp_max) * mult.energy);
    const sats = Math.ceil(energy / perSat);
    const satPre = prereq(profile, planet, ctx && ctx.planets, 's212');
    const satCost = SATELLITE_COST.map((x, i) => x * sats + satPre.cost[i]);
    const satOpt = { kind: 'satellites', count: sats, added: sats * perSat, cost: satCost, eq: toMetalEq(satCost, profile), pre: satPre.steps };

    let lvl = planet.solar_plant, added = 0, solarCost = [0, 0, 0];
    while (added < energy && lvl < planet.solar_plant + 50) {
      lvl++;
      solarCost = solarCost.map((x, i) => x + levelCost('solar_plant', lvl)[i]);
      added = Math.floor((solarEnergy(lvl) - solarEnergy(planet.solar_plant)) * mult.energy);
    }
    const solarOpt = added >= energy
      ? { kind: 'solar', from: planet.solar_plant, to: lvl, added, cost: solarCost, eq: toMetalEq(solarCost, profile) }
      : null;
    satOpt.fuelEq = 0; if (solarOpt) solarOpt.fuelEq = 0;
    if (profile.energy_satellites_only) return satOpt;
    if (ctx && ctx.noFusion) return solarOpt && solarOpt.eq < satOpt.eq ? solarOpt : satOpt;

    const f0 = +planet.fusion_reactor || 0;
    const pre = fusionPrereq(profile, planet, ctx && ctx.planets);
    const et = Math.max(+profile.energy_tech || 0, pre.energyTech);
    let fl = f0, fAdded = 0, fCost = pre.cost.slice();
    while (fAdded < energy && fl < f0 + 30) {
      fl++;
      fCost = fCost.map((x, i) => x + levelCost('fusion_reactor', fl)[i]);
      fAdded = Math.floor((fusionEnergy(fl, et) - fusionEnergy(f0, et)) * mult.energy);
    }
    let fusionOpt = null;
    if (fAdded >= energy) {
      const fuel = (fusionDeut(fl) - fusionDeut(f0)) * profile.economy_speed;
      fusionOpt = { kind: 'fusion', from: f0, to: fl, added: fAdded, cost: fCost, eq: toMetalEq(fCost, profile), fuel, fuelEq: toMetalEq([0, 0, fuel], profile), pre: pre.steps };
    }
    // Tecnologia energetica: alza l'energia di tutte le centrali a fusione (30 x L x (1,05 + 0,01 x tecnologia)^L).
    // Conta solo l'energia in più su questo pianeta (gli altri pianeti con la fusione ne guadagnano anche loro).
    let etOpt = null;
    if (f0 > 0) {
      const et0 = +profile.energy_tech || 0;
      let e = et0, add = 0, c = [0, 0, 0];
      while (add < energy && e < et0 + 10) {
        e++;
        c = c.map((x, i) => x + reqCost('r113', e)[i]);
        add = Math.floor((fusionEnergy(f0, e) - fusionEnergy(f0, et0)) * mult.energy);
      }
      if (add >= energy) etOpt = { kind: 'energytech', from: et0, to: e, added: add, cost: c, eq: toMetalEq(c, profile), fuelEq: 0 };
    }
    // Ricerche forme di vita sull'energia (es. Batterie vulcaniche, Centrali Geotermoelettriche): +x% di energia su
    // tutti i pianeti; anche qui conta solo l'energia in più su questo pianeta. Solo ricerche già scelte in uno slot.
    let lfOpt = null;
    if (LF && ctx && ctx.planets) {
      const raw = solarEnergy(planet.solar_plant) + fusionEnergy(f0, +profile.energy_tech || 0) + (+planet.solar_satellites || 0) * satelliteEnergy(planet.temp_max);
      for (const p of ctx.planets) for (const [slot, entry] of Object.entries(p.lf_techs || {})) {
        const tech = entry && LF.races[entry.race] && LF.races[entry.race].techs[+slot - 1];
        if (!tech || !tech.cost || !tech.perLevel.energy) continue;
        const L = +entry.level || 0;
        if (L === 0) continue; // slot ancora da aprire: la ricerca compare nei consigli normali
        const d = (techEffect(profile, p, +slot, { ...entry, level: L + 1 }).energy || 0) - (techEffect(profile, p, +slot, entry).energy || 0);
        const add = Math.floor(raw * d);
        if (add < energy) continue;
        const c = lfTechCost(tech, L + 1, researchDisc(p));
        const o = { kind: 'lfenergy', planetId: p.id, planetName: p.name, slot: +slot, race: entry.race, it: tech.it, from: L, to: L + 1, added: add, cost: c, eq: toMetalEq(c, profile), fuelEq: 0 };
        if (!lfOpt || o.eq < lfOpt.eq) lfOpt = o;
      }
    }
    const opts = [satOpt, solarOpt, fusionOpt, etOpt, lfOpt].filter(Boolean);
    const score = o => ctx && ctx.gainEq > 0
      ? (ctx.gainEq - o.fuelEq > 0 ? (ctx.costEq + o.eq) / (ctx.gainEq - o.fuelEq) : Infinity)
      : o.eq + o.fuelEq * FUEL_HOURS;
    const best = opts.reduce((b, o) => (score(o) < score(b) ? o : b));
    return best;
  }

  // ---- Popolazione delle forme di vita ----
  // Parametri dal file pubblico del server (serverData.xml, lifeformSettings), uguali per tutti i server.
  // Verificati su un pianeta Rock'tal con le tabelle "Tech. Info." del gioco: spazio = base x (L+1) x fattore^L,
  // crescita all'ora = base x (L+1) x 1,2^L, cibo prodotto e consumato = base x (L+1) x fattore^L x velocità economia.
  // T2 = abitanti T1 x 1% per livello della "scuola"; T3 = T2 x 1% per livello del "liceo" (verificato: 10% e 5%).
  const POP = {
    // Edifici che cambiano la popolazione, come [posizione nell'ordine del gioco, effetto per livello(, massimo)] (dal serverData.xml,
    // verificati sulle tabelle di RiV-): capBoost = spazio abitativo in più, foodBoost = cibo prodotto in più, consCut = consumo di cibo in meno
    humans:  { cap: [210, 1.21],  growth: [16, 1.2], cons: [9, 1.15],  food: [10, 1.14], capBoost: [8, 0.015], foodBoost: [9, 0.05], consCut: [6, 0.01, 0.8] },
    rocktal: { cap: [150, 1.216], growth: [12, 1.2], cons: [5, 1.15],  food: [6, 1.14] },
    mechas:  { cap: [500, 1.205], growth: [24, 1.2], cons: [22, 1.15], food: [23, 1.12], capBoost: [8, 0.02], foodBoost: [7, 0.02] },
    // needCut: il Modulatore psionico riduce la popolazione richiesta da tutti gli slot del pianeta (serverData: 2% per livello, massimo 30%)
    kaelesh: { cap: [250, 1.21],  growth: [16, 1.2], cons: [11, 1.15], food: [12, 1.14], capBoost: [7, 0.02], consCut: [5, 0.01, 0.5], needCut: [9, 0.02, 0.3] },
  };
  const EXTRA = ['capBoost', 'foodBoost', 'consCut', 'needCut'];
  // popolazione richiesta per uno slot su un pianeta, con la riduzione del Modulatore psionico
  const slotNeed = (lv, slot) => Math.ceil(SLOT_POP[slot - 1] * (1 - ((lv && lv.needCut) || 0)));
  // popolazione necessaria per ogni slot di ricerca: T1 per gli slot 1-6, T2 per 7-12, T3 per 13-18
  const SLOT_POP = [200e3, 300e3, 400e3, 500e3, 750e3, 1e6, 1.2e6, 3e6, 5e6, 7e6, 9e6, 11e6, 13e6, 26e6, 56e6, 112e6, 224e6, 448e6];
  const popF = ([b, f], L) => (L > 0 ? b * (L + 1) * Math.pow(f, L) : 0);
  const extraVal = (race, kind, L) => { const e = POP[race] && POP[race][kind]; return e ? Math.min(e[2] || Infinity, L * e[1]) : 0; };
  // livelli: quarters (abitazioni), farm (cibo), school (T1 -> T2), high (T2 -> T3) e gli edifici che cambiano spazio e cibo
  function popLevels(race, planet) {
    const o = LF && LF.races[race] ? LF.races[race].buildingOrder : null;
    if (!o) return null;
    const b = planet.lf_buildings || {};
    const lv = { quarters: +b[o[0]] || 0, farm: +b[o[1]] || 0, school: +b[o[3]] || 0, high: +b[o[4]] || 0, keys: [o[0], o[1], o[3], o[4]], extra: {} };
    for (const kind of EXTRA) {
      const e = POP[race] && POP[race][kind]; if (!e) continue;
      const L = +b[o[e[0]]] || 0;
      lv.extra[kind] = { key: o[e[0]], level: L };
      lv[kind] = extraVal(race, kind, L);
    }
    return lv;
  }
  function population(race, lv, speed, imported) {
    const P = POP[race]; if (!P) return null;
    const cap = Math.floor(popF(P.cap, lv.quarters) * (1 + (lv.capBoost || 0))), growth = popF(P.growth, lv.quarters);
    const foodProd = popF(P.food, lv.farm) * (1 + (lv.foodBoost || 0)) * speed, foodCons = popF(P.cons, lv.quarters) * (1 - (lv.consCut || 0)) * speed;
    const satiety = foodCons > 0 ? Math.floor(cap * foodProd / foodCons) : 0;
    const t1 = imported != null ? imported : Math.min(cap, satiety);
    const t2 = Math.floor(t1 * lv.school / 100), t3 = Math.floor(t2 * lv.high / 100);
    const have = i => (i < 6 ? t1 : i < 12 ? t2 : t3);
    let open = 0; while (open < 18 && have(open) >= slotNeed(lv, open + 1)) open++;
    return { cap, growth, foodProd, foodCons, satiety, t1, t2, t3, open, fed: satiety >= cap, need: s => slotNeed(lv, s) };
  }
  // Requisiti in più per portare gli edifici forme di vita ai livelli `targets`: per ogni edificio che parte da 0 si
  // aggiungono i livelli richiesti dall'Albero tecnologico oltre ai livelli già previsti (cache: le stesse combinazioni ritornano spesso)
  const preCache = new Map();
  function targetPrereq(profile, planet, race, targets) {
    const levels = planet.lf_buildings || {};
    const fresh = Object.keys(targets).filter(k => targets[k] > 0 && !(+levels[k] > 0)).sort();
    if (!fresh.length) return { cost: [0, 0, 0], eq: 0, steps: [] };
    const ck = JSON.stringify([race, levels, fresh, fresh.map(k => targets[k]), Object.entries(targets).sort()]);
    if (preCache.has(ck)) return preCache.get(ck);
    const virt = { ...planet, lf_buildings: { ...levels } };
    for (const [k, v] of Object.entries(targets)) virt.lf_buildings[k] = Math.max(+virt.lf_buildings[k] || 0, v);
    for (const k of fresh) virt.lf_buildings[k] = 0; // da costruire: i suoi requisiti vanno controllati
    let cost = [0, 0, 0]; const steps = [];
    for (const k of fresh) {
      const lp = lfPrereq(profile, virt, race, k);
      lp.steps.forEach(y => { virt.lf_buildings[y.key] = y.to; steps.push(y); });
      cost = cost.map((c, i) => c + lp.cost[i]);
      virt.lf_buildings[k] = targets[k];
    }
    const out = { cost, eq: toMetalEq(cost, profile), steps };
    if (preCache.size > 5000) preCache.clear();
    preCache.set(ck, out);
    return out;
  }
  // sconto del Monolite (Rock'tal) a un dato livello, dalla tabella del gioco
  const monoDiscAt = m => (m > 0 && LF ? -(LF.races.rocktal.buildings.monolith.buildingCostByLevel[m] || 0) : 0);
  // Combinazione più economica per aprire lo slot `slot` (1-18): abitazioni, cibo, scuola e liceo, più gli edifici che
  // aumentano spazio o cibo (Umani, Mecha, Kaelesh) e il Monolite (Rock'tal). Costi cumulati precalcolati per livello.
  const planCache = new Map();
  function popPlan(race, planet, slot, speed, profile) {
    const lv = popLevels(race, planet); if (!lv || !POP[race]) return null;
    const ck = JSON.stringify([race, planet.lf_buildings || {}, slot, speed, profile.ratio_metal, profile.ratio_crystal, profile.ratio_deut]);
    if (planCache.has(ck)) return planCache.get(ck);
    const res = popPlanRun(race, planet, slot, speed, profile, lv);
    if (planCache.size > 500) planCache.clear();
    planCache.set(ck, res);
    return res;
  }
  function popPlanRun(race, planet, slot, speed, profile, lv) {
    const R = LF.races[race], P = POP[race];
    const need = SLOT_POP[slot - 1], tier = slot <= 6 ? 1 : slot <= 12 ? 2 : 3;
    // costo cumulato (vettore ed equivalente) per salire da `from` a ogni livello fino a `from + n`
    const prefix = (key, from, n, disc) => {
      const v = [[0, 0, 0]], eq = [0];
      for (let L = from + 1; L <= from + n; L++) {
        const c = lfBuildingCost(R.buildings[key], L, typeof disc === 'function' ? disc(L) : disc);
        const prev = v[v.length - 1], nv = prev.map((x, i) => x + c[i]);
        v.push(nv); eq.push(toMetalEq(nv, profile));
      }
      return { v, eq, from };
    };
    const m0 = race === 'rocktal' ? +((planet.lf_buildings || {}).monolith) || 0 : 0;
    const megs = race === 'rocktal' ? Array.from({ length: 13 }, (_, i) => m0 + i).filter(m => m <= 17) : [0];
    const ext = EXTRA.filter(k => P[k]).map(k => ({ kind: k, ...lv.extra[k] }));
    let best = null;
    for (const meg of megs) {
      const disc = race === 'rocktal' ? monoDiscAt(meg) : 0;
      const pMeg = race === 'rocktal' ? prefix('monolith', m0, meg - m0, L => monoDiscAt(L - 1)) : null;
      const megV = pMeg ? pMeg.v[meg - m0] : [0, 0, 0], megEq = pMeg ? pMeg.eq[meg - m0] : 0;
      const pq = prefix(lv.keys[0], lv.quarters, 30, disc), pf = prefix(lv.keys[1], lv.farm, 60, disc);
      const ps = prefix(lv.keys[2], lv.school, 40, disc), ph = prefix(lv.keys[3], lv.high, 40, disc);
      const span = 40; // livelli in più provati per ogni edificio extra
      const pe = ext.map(e => prefix(e.key, e.level, span, disc));
      // combinazioni degli edifici extra: prima a passi (più larghi con tre edifici), poi attorno alla migliore a passi di 1
      const grid = steps => { let out = [[]]; steps.forEach(vals => { const next = []; for (const c of out) for (const d of vals) next.push([...c, d]); out = next; }); return out; };
      const coarse = ext.length >= 3 ? 3 : ext.length === 2 ? 2 : 1;
      const range = (lo, hi, st) => { const r = []; for (let d = Math.max(0, lo); d <= Math.min(span, hi); d += st) r.push(d); return r; };
      const byCost = list => list.sort((x, y) => x.reduce((t, d, i) => t + pe[i].eq[d], 0) - y.reduce((t, d, i) => t + pe[i].eq[d], 0));
      const phases = [byCost(grid(ext.map(() => range(0, span, coarse))))];
      for (const combos of phases) {
      for (const combo of combos) {
        const vals = {}; let exEq = 0;
        ext.forEach((e, i) => { vals[e.kind] = extraVal(race, e.kind, e.level + combo[i]); exEq += pe[i].eq[combo[i]]; });
        const base = megEq + exEq;
        if (best && base >= best.eq) break; // combinazioni ordinate per costo: le successive costano ancora di più
        for (let dq = 0; dq <= 30; dq++) {
          const q = lv.quarters + dq;
          const cap = popF(P.cap, q) * (1 + (vals.capBoost || 0));
          const cons = popF(P.cons, q) * (1 - (vals.consCut || 0));
          let df = 0; while (df < 60 && popF(P.food, lv.farm + df) * (1 + (vals.foodBoost || 0)) < cons) df++;
          if (df === 60) continue;
          const partial = base + pq.eq[dq] + pf.eq[df];
          if (best && partial >= best.eq) continue;
          const needE = need * (1 - (vals.needCut || 0));
          const tryOne = (ds, dh) => {
            const sc = lv.school + ds, hi = lv.high + dh, t2 = cap * sc / 100, t3 = t2 * hi / 100;
            if ((tier === 1 ? cap : tier === 2 ? t2 : t3) < needE) return;
            let eq = partial + ps.eq[ds] + ph.eq[dh];
            if (best && eq >= best.eq) return;
            // requisiti degli edifici da costruire da zero (Albero tecnologico): il loro costo entra nel confronto
            const targets = { [lv.keys[0]]: q, [lv.keys[1]]: lv.farm + df, [lv.keys[2]]: sc, [lv.keys[3]]: hi };
            ext.forEach((e, i) => { targets[e.key] = e.level + combo[i]; });
            if (race === 'rocktal') targets.monolith = meg;
            const pre = targetPrereq(profile, planet, race, targets);
            eq += pre.eq;
            if (best && eq >= best.eq) return;
            const cost = [megV, pq.v[dq], pf.v[df], ps.v[ds], ph.v[dh], pre.cost, ...pe.map((x, i) => x.v[combo[i]])].reduce((t, c) => t.map((y, i) => y + c[i]), [0, 0, 0]);
            best = { quarters: q, farm: lv.farm + df, school: sc, high: hi, monolith: meg, monolithFrom: m0, disc, cost, eq, cap, t2, t3, growth: popF(P.growth, q),
              pre: pre.steps, extra: ext.map((e, i) => ({ kind: e.kind, key: e.key, from: e.level, to: e.level + combo[i] })) };
          };
          if (tier === 1) { tryOne(0, 0); continue; }
          for (let ds = Math.max(0, 1 - lv.school); ds <= 40; ds++) {
            const sc = lv.school + ds;
            if (tier === 2) { if (cap * sc / 100 >= needE) { tryOne(ds, 0); break; } continue; }
            for (let dh = Math.max(0, 1 - lv.high); dh <= 40; dh++) if (cap * sc / 100 * (lv.high + dh) / 100 >= needE) { tryOne(ds, dh); break; }
          }
        }
      }
        // seconda fase: attorno alla combinazione migliore trovata con questo Monolite, a passi di 1
        if (phases.length === 1 && coarse > 1 && best && best.monolith === meg && best.extra.length) {
          const c0 = best.extra.map(e => e.to - e.from);
          phases.push(byCost(grid(c0.map(d => range(d - coarse + 1, d + coarse - 1, 1)))));
        }
      }
    }
    return best && { ...best, from: lv, need, needAfter: Math.ceil(need * (1 - extraVal(race, 'needCut', (best.extra.find(e => e.kind === 'needCut') || { to: 0 }).to))), tier };
  }

  const MINES = [
    { key: 'metal_mine',   label: 'Miniera di metallo',   res: 0, cap: 'cap_metal' },
    { key: 'crystal_mine', label: 'Miniera di cristallo', res: 1, cap: 'cap_crystal' },
    { key: 'deut_synth',   label: 'Sintetizzatore di deuterio', res: 2, cap: 'cap_deut' },
  ];

  // Un limite è "ferma al livello N": i livelli oltre N non vengono mai suggeriti. Vuoto = nessun limite.
  const overCap = (cap, level) => cap !== null && cap !== undefined && cap !== '' && level > +cap;

  // ---- Astrofisica: pianeti consentiti = 1 + ceil(livello / 2) ----
  const maxPlanets = astro => 1 + Math.ceil(astro / 2);
  // Livelli di Astrofisica da ricercare prima di poter colonizzare un altro pianeta
  function astroLevelsForNextPlanet(astro, planetCount) {
    let lvl = astro;
    while (maxPlanets(lvl) <= planetCount) lvl++;
    return lvl - astro;
  }

  // Costo per costruire una miniera dal livello 0 fino a `level`
  const buildUpCost = (key, level) => {
    let t = [0, 0, 0];
    for (let n = 1; n <= level; n++) t = t.map((x, i) => x + levelCost(key, n)[i]);
    return t;
  };

  const EXP_RES_SHARE = 0.7;
  // Spedizioni contemporanee: radice quadrata dell'Astrofisica (per difetto), +2 per la classe Esploratore
  const expeditionSlots = profile => Math.floor(Math.sqrt(+profile.astro_tech || 0)) + (profile.player_class === 'explorer' ? 2 : 0);
  // Resa media delle spedizioni al giorno dal registro del giocatore: { res, ships } in metallo equivalente, o null
  function expeditionAvg(profile) {
    if (profile.expedition_in_ranking === false) return null;
    const log = (Array.isArray(profile.expedition_log) ? profile.expedition_log : []).filter(e => e && (+e.r > 0 || +e.s > 0));
    if (!log.length) return null;
    const total = log.reduce((t, e) => t + (+e.r || 0) + (+e.s || 0), 0) / log.length;
    const withN = log.filter(e => +e.n > 0);
    const perExp = withN.length ? withN.reduce((t, e) => t + ((+e.r || 0) + (+e.s || 0)) / +e.n, 0) / withN.length : null;
    // il valore del gioco (MSU) comprende risorse e navi trovate: ~70% risorse, ~30% navi (ritrovamenti di risorse e
    // di navi dei registri del giocatore, circa 51 e 22 su 143 spedizioni)
    return { total, res: total * EXP_RES_SHARE, ships: total * (1 - EXP_RES_SHARE), days: log.length, perExp };
  }

  // ---- Tempo prima che un consiglio produca (ore) ----
  // Ogni consiglio somma all'ammortamento il tempo per farlo: costruzione o ricerca, più l'energia che gli serve e i
  // requisiti. Edifici e ricerche vanno in code separate, quindi i requisiti contano come il più lungo dei due.
  const SHIP_STRUCT = { s212: 2000, s208: 30000 }; // metallo + cristallo (satellite, colonizzatrice)
  function timing(profile, planets) {
    const speed = profile.economy_speed || 1;
    const rSpeed = +profile.research_speed || speed;
    const lfTech = (profile._lf && profile._lf.tech) || {};
    const explorer = profile.player_class === 'explorer', techno = !!(profile.technocrat || profile.commanding_staff);
    const irn = researchLevel(profile, 123);
    const robot = p => +p.robotics_factory || +((p.buildings || {})[14]) || 0;
    const nanite = p => +p.nanite_factory || +((p.buildings || {})[15]) || 0;
    const H = sec => (sec || 0) / 3600;
    const best = planets.reduce((a, p) => (!a || labLevel(p, planets, irn) > labLevel(a, planets, irn) ? p : a), null);
    const T = {
      build: (planet, cost, L, noMax) => H(buildTime(cost, L, robot(planet), nanite(planet), speed, noMax)),
      levels: (planet, key, from, to) => { let h = 0; for (let L = from + 1; L <= to; L++) h += T.build(planet, levelCost(key, L), L); return h; },
      research: cost => H(researchTime(cost, best ? labLevel(best, planets, irn) : 0, rSpeed, explorer, lfTech.research_time || 0, techno)),
      ships: (planet, key, n, shipyard) => H(SHIP_STRUCT[key] * n / (2500 * (1 + Math.max(1, shipyard)) * Math.pow(2, nanite(planet)) * speed) * 3600),
      // requisiti: edifici e ricerche in parallelo
      pre: (planet, steps) => {
        let b = 0, r = 0;
        for (const x of steps || []) for (let L = x.from + 1; L <= x.to; L++) {
          if (x.key[0] === 'b') b += T.build(planet, reqCost(x.key, L), L, x.key === 'b15');
          else r += T.research(reqCost(x.key, L));
        }
        return Math.max(b, r);
      },
      // energia aggiunta da un consiglio
      fix: (planet, fix) => {
        if (!fix) return 0;
        const shipyard = Math.max(buildingLevel(planet, 21), ...((fix.pre || []).filter(x => x.key === 'b21').map(x => x.to)));
        let own;
        if (fix.kind === 'satellites') own = T.ships(planet, 's212', fix.count, shipyard);
        else if (fix.kind === 'fusion') own = T.levels(planet, 'fusion_reactor', fix.from, fix.to);
        else if (fix.kind === 'energytech') { own = 0; for (let L = fix.from + 1; L <= fix.to; L++) own += T.research(reqCost('r113', L)); }
        else if (fix.kind === 'lfenergy') { const p = planets.find(x => x.id === fix.planetId) || planet; own = T.lfTech(p, LF.races[fix.race].techs[fix.slot - 1], fix.to); }
        else own = T.levels(planet, 'solar_plant', fix.from, fix.to);
        return T.pre(planet, fix.pre) + own;
      },
      lfBuilding: (planet, b, L, disc) => H(lfBuildingTime(b, L, disc, robot(planet), nanite(planet), speed)),
      lfTech: (planet, t, L) => H(lfTechTime(t, L, researchTimeDisc(planet), speed, lfTech.lf_research_time || 0)),
      best,
    };
    return T;
  }
  const COLONY_FLIGHT_H = 0; // il volo della colonizzatrice dipende da universo e distanza: non si stima
  // Slot di ricerca forme di vita ancora chiuso: edifici (abitazioni, cibo, scuola, liceo, extra, Monolite) per avere la
  // popolazione che lo apre, con costo e tempo di costruzione. Popolazione: quella importata se c'è, altrimenti stimata.
  function slotUnlock(profile, planet, slot, T) {
    const race = planet.lf_race;
    if (!race || !POP[race]) return null;
    const lv = popLevels(race, planet); if (!lv) return null;
    const res = planet.resources || {};
    const st = population(race, lv, profile.economy_speed, res.popMax ? +res.pop : null);
    if (st.open >= slot) return null;
    const plan = popPlan(race, planet, slot, profile.economy_speed, profile);
    if (!plan) return null;
    const R = LF.races[race], disc = plan.disc || 0;
    const steps = [];
    const add = (key, from, to) => { if (to > from) steps.push({ key, it: (R.buildings[key] || {}).it || key, from, to }); };
    if (race === 'rocktal') add('monolith', plan.monolithFrom, plan.monolith);
    add(lv.keys[0], lv.quarters, plan.quarters); add(lv.keys[1], lv.farm, plan.farm);
    add(lv.keys[2], lv.school, plan.school); add(lv.keys[3], lv.high, plan.high);
    plan.extra.forEach(e => add(e.key, e.from, e.to));
    let time = 0; const cost = plan.cost.slice();
    for (const x of steps) for (let L = x.from + 1; L <= x.to; L++) time += T ? T.lfBuilding(planet, R.buildings[x.key], L, disc) : 0;
    // requisiti degli edifici da costruire (es. Accademia delle Scienze -> Zona residenziale 41): già nel costo del piano
    const pre = plan.pre || [];
    for (const y of pre) for (let L = y.from + 1; L <= y.to; L++) time += T ? T.lfBuilding(planet, R.buildings[y.key], L, disc) : 0;
    const merged = [];
    for (const y of pre.concat(steps)) { const m = merged.find(z => z.key === y.key); if (m) { m.from = Math.min(m.from, y.from); m.to = Math.max(m.to, y.to); } else merged.push({ ...y }); }
    // ordine di costruzione: ogni edificio dopo quelli che richiede
    const req = R.requires || {}, ordered = [];
    const visit = (k, seen = new Set()) => { if (ordered.some(x => x.key === k) || seen.has(k)) return; seen.add(k);
      Object.keys(req[k] || {}).forEach(r => visit(r, seen)); const it = merged.find(x => x.key === k); if (it) ordered.push(it); };
    merged.forEach(x => visit(x.key));
    // dopo le costruzioni gli abitanti devono crescere fino alla nuova capienza (come nella scheda Sblocco slot: è un minimo)
    const grow = plan.growth > 0 ? Math.max(0, plan.cap - st.t1) / plan.growth : 0;
    time += grow;
    return { cost, time, grow, steps: ordered, artifacts: slot <= 6 ? 200 : slot <= 12 ? 400 : 600 };
  }
  // Requisiti di un edificio forme di vita sul suo pianeta (a catena): costo, energia in più, tempo (stessa coda) e
  // livelli da raggiungere. Solo per le razze di cui conosciamo l'Albero tecnologico (LF.races[race].requires).
  function lfPrereq(profile, planet, race, key, T) {
    const R = LF && LF.races[race], req = (R && R.requires) || {};
    const levels = planet.lf_buildings || {}, lv = {}, steps = [];
    const disc = monolithDisc(planet);
    let cost = [0, 0, 0], energy = 0, time = 0, buildE = 0;
    const cur = k => (k in lv ? lv[k] : +levels[k] || 0);
    const need = (k, level) => {
      const from = cur(k);
      if (from >= level) return;
      for (const [rk, rl] of Object.entries(req[k] || {})) need(rk, rl);
      const b = R.buildings[k];
      if (b && b.cost) for (let L = from + 1; L <= level; L++) {
        const c = lfBuildingCost(b, L, disc); cost = cost.map((x, i) => x + c[i]);
        if (T) time += T.lfBuilding(planet, b, L, disc);
      }
      if (b && b.energyCons) energy += Math.ceil((lfBuildingEnergy(b, level) - lfBuildingEnergy(b, from)) * (1 - disc));
      buildE = Math.max(buildE, lfBuildEnergy(b, level));
      lv[k] = level;
      steps.push({ key: k, it: (b && b.it) || k, from, to: level });
    };
    for (const [rk, rl] of Object.entries(req[key] || {})) need(rk, rl);
    return { cost, energy, time, steps, buildE };
  }

  function colonyRecommendation(profile, planets, gainEq) {
    if (!planets.length) return null;
    const astro = profile.astro_tech || 0;
    const steps = astroLevelsForNextPlanet(astro, planets.length);
    if (steps > 0 && overCap(profile.cap_astro, astro + steps)) return null;

    // Colonia nuova tipica: livelli medi dell'impero (con limite), temperatura media, posizione 8
    // Livello mediano dell'impero: non risente di un pianeta molto indietro o molto avanti
    const avg = k => {
      const v = planets.map(p => +p[k] || 0).sort((a, b) => a - b);
      const m = v.length >> 1;
      return v.length % 2 ? v[m] : Math.floor((v[m - 1] + v[m]) / 2);
    };
    const cap = (k, v) => (overCap(profile[k], v) ? +profile[k] : v);
    // nel piano la colonia resta quella di partenza (profile._colonyFix): non cresce mentre il piano alza le altre miniere
    const fixed = profile._colonyFix || null;
    const target = fixed ? { metal_mine: fixed.metal_mine, crystal_mine: fixed.crystal_mine, deut_synth: fixed.deut_synth } : {
      metal_mine: cap('cap_metal', avg('metal_mine')),
      crystal_mine: cap('cap_crystal', avg('crystal_mine')),
      deut_synth: cap('cap_deut', avg('deut_synth')),
    };
    const colony = {
      name: 'Nuova colonia', position: 8, temp_max: Math.round(planets.reduce((s, p) => s + (+p.temp_max || 0), 0) / planets.length),
      ...target, solar_plant: 0, fusion_reactor: 0, solar_satellites: 0,
      lf_metal: 0, lf_crystal: 0, lf_deut: 0, lf_energy: 0, // una colonia nuova non ha ancora edifici forme di vita
      buildings: { 1: target.metal_mine, 2: target.crystal_mine, 3: target.deut_synth }, // niente cantiere: i satelliti lo richiedono
    };

    let cost = [0, 0, 0];
    const add = c => (cost = cost.map((x, i) => x + c[i]));
    // requisiti: Astrofisica (se serve un livello) e Nave colonizzatrice, sul pianeta dove costano meno
    const goals = ['s208'].concat(steps ? [['r124', 1]] : []);
    let pre = null, prePlanet = null;
    for (const p of planets) { const x = prereq(profile, p, planets, goals); if (!pre || toMetalEq(x.cost, profile) < toMetalEq(pre.cost, profile)) { pre = x; prePlanet = p; } }
    const preSteps = pre ? pre.steps.filter(x => x.key !== 'r124') : [];
    if (pre) preSteps.forEach(x => { for (let L = x.from + 1; L <= x.to; L++) add(reqCost(x.key, L)); });
    const astroCost = [0, 0, 0];
    for (let n = astro + 1; n <= astro + steps; n++) { const c = levelCost('astro', n); add(c); c.forEach((x, i) => { astroCost[i] += x; }); }
    add(COLONY_SHIP);
    MINES.forEach(m => add(buildUpCost(m.key, target[m.key])));
    const needEnergy = Math.round((consumption.metal_mine(target.metal_mine) + consumption.crystal_mine(target.crystal_mine) + consumption.deut_synth(target.deut_synth)) * consFactor(profile, colony));
    const fix = energyFix(profile, colony, needEnergy, { noFusion: true }); // colonia nuova: solare o satelliti
    if (fix) add(fix.cost);
    // tempo: requisiti e Astrofisica (ricerca) insieme ai requisiti edifici, poi la colonizzatrice e le miniere (il volo non si stima)
    // sul pianeta nuovo (senza Fabbrica di robot), una dopo l'altra
    const T = timing(profile, planets), shipPlanet = prePlanet || planets[0];
    let astroH = 0;
    for (let n = astro + 1; n <= astro + steps; n++) astroH += T.research(levelCost('astro', n));
    const preB = preSteps.filter(x => x.key[0] === 'b'), preR = preSteps.filter(x => x.key[0] === 'r');
    const shipyard = Math.max(buildingLevel(shipPlanet, 21), ...preB.filter(x => x.key === 'b21').map(x => x.to));
    // sulla colonia si costruiscono prima Fabbrica di robot e Fabbrica di naniti ai livelli mediani dell'impero (come le
    // miniere: una colonia media), con il loro costo; poi miniere ed energia con quei livelli
    const robT = fixed ? fixed.robotics_factory : Math.max(Math.min(10, avg('robotics_factory')), avg('nanite_factory') > 0 ? 10 : 0);
    const naniT = fixed ? fixed.nanite_factory : avg('nanite_factory');
    if (fixed) colony.temp_max = fixed.temp_max;
    let robotH = 0;
    for (let L = 1; L <= robT; L++) { add(reqCost('b14', L)); robotH += T.build({ ...colony, robotics_factory: L - 1 }, reqCost('b14', L), L); }
    for (let L = 1; L <= naniT; L++) { add(reqCost('b15', L)); robotH += T.build({ ...colony, robotics_factory: robT, nanite_factory: L - 1 }, reqCost('b15', L), L, true); }
    const built = { ...colony, robotics_factory: robT, nanite_factory: naniT };
    const colonyH = robotH + MINES.reduce((h, m) => h + T.levels(built, m.key, 0, target[m.key]), 0) + T.fix(built, fix);
    // le miniere della colonia producono già mentre si costruiscono le successive: della loro costruzione conta la metà
    const wait = Math.max(T.pre(shipPlanet, preB), T.pre(shipPlanet, preR) + astroH)
      + T.ships(shipPlanet, 's208', 1, shipyard) + COLONY_FLIGHT_H + colonyH / 2;

    // Produzione del nuovo pianeta al 100% (senza item: un pianeta nuovo non ne ha attivi)
    const mult = multipliers(profile, colony, false);
    const s = profile.economy_speed;
    const prod = [
      baseProd.metal_mine(target.metal_mine) * mult.metal * s,
      baseProd.crystal_mine(target.crystal_mine) * mult.crystal * s,
      Math.max(0, baseProd.deut_synth(target.deut_synth, colony.temp_max)) * mult.deut * s,
    ];
    const gain = gainEq(prod);
    const eq = toMetalEq(cost, profile);
    const astroText = steps ? `Astrofisica ${astro} → ${astro + steps}` : 'hai già uno slot libero';
    return {
      type: 'colony', planet: 'Nuovo pianeta', title: steps ? `Nuova colonia (${astroText})` : 'Colonizza lo slot libero',
      detail: `${steps ? astroText + ' + ' : ''}nave colonizzatrice + miniere ${target.metal_mine}/${target.crystal_mine}/${target.deut_synth}${fix ? ' + ' + fixText(fix) : ''} (pianeta medio in posizione 8)${preSteps.length ? `; prima servono ${prereqText(preSteps)}${prePlanet && planets.length > 1 ? ` (su ${prePlanet.name})` : ''}, già compresi nel costo` : ''}`,
      pre: preSteps, prePlanet: prePlanet && prePlanet.id, cost, astroCost, costEq: eq, gainPerHour: prod, gainEq: gain,
      wait, payback: gain > 0 ? eq / gain + wait : Infinity, nextLevel: astro + steps,
      // il pianeta come sarà dopo la colonia (miniere, robot, naniti, energia): nel piano entra tra i pianeti
      colony: { ...built, solar_plant: fix && fix.kind === 'solar' ? fix.to : 0, solar_satellites: fix && fix.kind === 'satellites' ? fix.count : 0,
        buildings: { ...colony.buildings, 4: fix && fix.kind === 'solar' ? fix.to : 0, 14: robT, 15: naniT } },
    };
  }

  // ---- Tutte le azioni possibili, in ordine di tempo di ammortamento ----
  // I pianeti che il giocatore ha escluso dai calcoli vengono ignorati ovunque
  const active = planets => planets.filter(p => p.included !== false);

  function recommendations(profile, allPlanets) {
    if (!profile._lf) profile = withLifeforms(profile, allPlanets);
    const planets = active(allPlanets);
    const out = [];
    const T = timing(profile, planets);
    const ratio = [profile.ratio_metal, profile.ratio_crystal, profile.ratio_deut].map(r => r / profile.ratio_metal);
    const gainEq = arr => arr.reduce((s, x, i) => s + x * ratio[i], 0);

    planets.forEach(planet => {
      const st = planetState(profile, planet);

      // 1) Deficit di energia adesso: si sta perdendo produzione
      if (st.balance < 0) {
        const lost = st.full.map(x => x * (1 - st.factor));
        const fix = energyFix(profile, planet, -st.balance, { costEq: 0, gainEq: gainEq(lost), planets: allPlanets });
        if (fix.fuel) lost[2] -= fix.fuel; // deuterio bruciato dalla centrale a fusione
        const gain = gainEq(lost);
        out.push({
          type: 'energy', planetId: planet.id, planet: planet.name,
          title: 'Rimetti in pari l\'energia',
          detail: fixText(fix) + ` (deficit ${fmt(-st.balance)}, miniere al ${Math.round(st.factor * 100)}%)`,
          cost: fix.cost, costEq: fix.eq, gainPerHour: lost, gainEq: gain, wait: T.fix(planet, fix),
          payback: gain > 0 ? fix.eq / gain + T.fix(planet, fix) : Infinity, urgent: true, fix,
        });
      }

      // 2) Ogni miniera +1, compresa l'energia che le servirà
      MINES.forEach(m => {
        const L = planet[m.key];
        const next = L + 1;
        if (overCap(profile[m.cap], next)) return; // "ferma al livello" del giocatore
        const cost = mineCost(m.key, next, mrcLevel(planet));
        const extraNeed = Math.round((consumption[m.key](next) - consumption[m.key](L)) * consFactor(profile, planet));
        const marginAfter = Math.max(0, st.balance) - extraNeed;
        const prodDelta = [0, 0, 0];
        const mult = [st.multRank.metal, st.multRank.crystal, st.multRank.deut][m.res];
        const base = m.key === 'deut_synth'
          ? Math.max(0, baseProd.deut_synth(next, planet.temp_max)) - Math.max(0, baseProd.deut_synth(L, planet.temp_max))
          : baseProd[m.key](next) - baseProd[m.key](L);
        prodDelta[m.res] = base * mult * profile.economy_speed;
        const fix = marginAfter < 0 ? energyFix(profile, planet, -marginAfter, { costEq: toMetalEq(cost, profile), gainEq: gainEq(prodDelta), planets: allPlanets }) : null;
        const sn = storageNeed(profile, planet, cost, T); // depositi per poter pagare il livello
        const totalCost = cost.map((x, i) => x + sn.cost[i] + (fix ? fix.cost[i] : 0));
        if (fix && fix.fuel) prodDelta[2] -= fix.fuel; // deuterio bruciato dalla centrale a fusione
        const gain = gainEq(prodDelta);
        const eq = toMetalEq(totalCost, profile);

        // campi: la miniera, i depositi, la centrale e gli edifici richiesti occupano un campo per livello
        const newLevels = 1 + sn.steps.reduce((a, x) => a + x.to - x.from, 0)
          + (fix && fix.kind !== 'satellites' ? fix.to - fix.from : 0) + ((fix && fix.pre) || []).filter(x => x.key[0] === 'b').reduce((a, x) => a + x.to - x.from, 0);
        const fn = fieldsNeed(profile, planet, newLevels, T, allPlanets);
        fn.cost.forEach((x, i) => { totalCost[i] += x; });
        // il Terraformer chiede energia libera per essere costruito: 1.000 x 2^(livello-1) (gioco: 1 = 1k, 4 = 8k, 6 = 32k)
        const terraTo = fn.steps.length ? fn.steps[fn.steps.length - 1].to : 0;
        const beT = terraTo ? buildEnergyFix(profile, planet, 1000 * Math.pow(2, terraTo - 1), marginAfter < 0 ? (fix ? fix.added + marginAfter : 0) : marginAfter, T, allPlanets) : null;
        if (beT) beT.fix.cost.forEach((x, i) => { totalCost[i] += x; });
        const eq2 = toMetalEq(totalCost, profile);
        const energyText = (fix ? `serve anche energia: ${fixText(fix)}` : `energia sufficiente (margine dopo: ${fmt(marginAfter)})`) + storageText(sn) + fieldsText(fn) + buildEnergyText(beT);
        // campi, depositi, energia e miniera nella stessa coda edifici (i satelliti nel cantiere, in parallelo)
        const fixH = T.fix(planet, fix), mineH = T.levels(planet, m.key, L, next) + sn.time + fn.time + (beT ? beT.time : 0);
        const wait = fix && fix.kind === 'satellites' ? Math.max(mineH, fixH) : mineH + fixH;
        let rec = {
          type: 'mine', key: m.key, planetId: planet.id, planet: planet.name,
          title: `${m.label} ${L} → ${next}`, detail: energyText,
          cost: totalCost, buildCost: cost, costEq: eq2, gainPerHour: prodDelta, gainEq: gain,
          wait, payback: gain > 0 ? eq2 / gain + wait : Infinity, fix, nextLevel: next, store: sn.steps, terra: fn.steps.length ? fn : null, newFields: fn.used, fixBuild: beT && beT.fix,
        };
        if (mrcLevel(planet) === 0) {
          const mc = mineCost(m.key, next, 1);
          // il Centro stesso consuma 120 di energia al livello 1 (tabella del gioco): va contato
          const margin2 = marginAfter - MRC_ENERGY_L1;
          const fix2 = margin2 < 0 ? energyFix(profile, planet, -margin2, { noFusion: true }) : null;
          const mrc1 = MRC_LEVEL1.map(x => Math.round(x * (1 - monolithDisc(planet))));
          const bCost = mc.map((x, i) => x + mrc1[i] + sn.cost[i] + fn.cost[i] + (fix2 ? fix2.cost[i] : 0));
          const bEq = toMetalEq(bCost, profile);
          if (gain > 0 && bEq < eq) rec = {
            ...rec, withMrc: true, title: `Centro di Mineralogia 1 + ${m.label} ${L} → ${next}`,
            detail: `il Centro di Mineralogia rende le miniere di questo pianeta più economiche dello 0,5%; ${fix2 ? 'serve anche energia: ' + fixText(fix2) : 'energia sufficiente'}`,
            cost: bCost, buildCost: mc, costEq: bEq, payback: bEq / gain + mineH + T.fix(planet, fix2), wait: mineH + T.fix(planet, fix2), fix: fix2,
          };
        }
        out.push(rec);
      });

      // Edifici di produzione forme di vita della razza del pianeta (solo quelli con costi ed energia noti)
      if (LF && planet.lf_race && LF.races[planet.lf_race] && profile._lf && profile._lf.computed) {
        const disc = monolithDisc(planet);
        const levels = planet.lf_buildings || {};
        for (const [key, b] of Object.entries(LF.races[planet.lf_race].buildings)) {
          if (!b || !b.cost || !b.energyCons || !b.effect) continue;
          const res = ['metal', 'crystal', 'deut'].filter(r => b.effect[r]);
          if (!res.length) continue;
          const L = +levels[key] || 0, next = L + 1;
          const lp = lfPrereq(profile, planet, planet.lf_race, key, T); // edifici forme di vita da sbloccare prima
          const cost = lfBuildingCost(b, next, disc);
          const extraNeed = Math.ceil((lfBuildingEnergy(b, next) - lfBuildingEnergy(b, L)) * (1 - disc)) + lp.energy;
          const marginAfter = Math.max(0, st.balance) - extraNeed;
          const pos = positionBonus(planet.position), s = profile.economy_speed;
          const row = [
            baseProd.metal_mine(planet.metal_mine) * (1 + pos.metal) * s,
            baseProd.crystal_mine(planet.crystal_mine) * (1 + pos.crystal) * s,
            Math.max(0, baseProd.deut_synth(planet.deut_synth, planet.temp_max)) * s,
          ];
          const prodDelta = [0, 1, 2].map(i => row[i] * (b.effect[['metal', 'crystal', 'deut'][i]] || 0));
          const fix = marginAfter < 0 ? energyFix(profile, planet, -marginAfter, { costEq: toMetalEq(cost, profile), gainEq: gainEq(prodDelta), planets: allPlanets }) : null;
          const sn = storageNeed(profile, planet, cost, T);
          const freeAfter = marginAfter < 0 ? (fix ? fix.added + marginAfter : 0) : marginAfter;
          const be = buildEnergyFix(profile, planet, Math.max(lfBuildEnergy(b, next), lp.buildE), freeAfter, T, allPlanets);
          const totalCost = cost.map((x, i) => x + lp.cost[i] + sn.cost[i] + (fix ? fix.cost[i] : 0) + (be ? be.fix.cost[i] : 0));
          if (fix && fix.fuel) prodDelta[2] -= fix.fuel; // deuterio bruciato dalla centrale a fusione
          const gain = gainEq(prodDelta), eq = toMetalEq(totalCost, profile);
          const wait = lp.time + sn.time + T.lfBuilding(planet, b, next, disc) + T.fix(planet, fix) + (be ? be.time : 0);
          out.push({
            type: 'lfbuilding', key, race: planet.lf_race, planetId: planet.id, planet: planet.name,
            title: `${b.it} ${L} → ${next}`,
            detail: `${fix ? 'serve anche energia: ' + fixText(fix) : 'energia sufficiente'} (consuma ${fmt(extraNeed)} di energia in più)${lp.steps.length ? `; prima servono ${lp.steps.map(x => `${x.it} ${x.from} → ${x.to}`).join(', ')}, già compresi nel costo e nel tempo` : ''}${storageText(sn)}${buildEnergyText(be)}`,
            lfPre: lp.steps, store: sn.steps, fixBuild: be && be.fix,
            cost: totalCost, buildCost: cost, costEq: eq, gainPerHour: prodDelta, gainEq: gain,
            wait, payback: gain > 0 ? eq / gain + wait : Infinity, fix, nextLevel: next, extraNeed,
          });
        }
      }
    });

    // Ricerche forme di vita con costi noti: si fanno su un pianeta e aumentano la produzione di tutti i pianeti
    if (LF && profile._lf && profile._lf.computed) {
      const s = profile.economy_speed;
      const rows = planets.map(pl => {
        const pos = positionBonus(pl.position);
        return [baseProd.metal_mine(pl.metal_mine) * (1 + pos.metal) * s, baseProd.crystal_mine(pl.crystal_mine) * (1 + pos.crystal) * s,
          Math.max(0, baseProd.deut_synth(pl.deut_synth, pl.temp_max)) * s];
      });
      const sumRow = [0, 1, 2].map(i => rows.reduce((t, r) => t + r[i], 0));
      // Spedizioni: resa media al giorno inserita dal giocatore (risorse e navi, in metallo equivalente come il
      // gioco, MSU). Le ricerche che aumentano risorse o navi trovate, o il bonus della classe Esploratore, rendono
      // la loro parte: resa x (aumento / (1 + bonus attuale)). Solo con la spunta "conta le spedizioni nei consigli".
      const ex = expeditionAvg(profile);
      const allT = ex ? allTechTotals(profile, allPlanets) : {};
      const EXP_KEYS = ['expedition_resources', 'expedition_ships_found', 'explorer_class_bonus'];
      planets.forEach(planet => {
        const disc = researchDisc(planet);
        for (const [slot, entry] of Object.entries(planet.lf_techs || {})) {
          if (!entry || !entry.race || !LF.races[entry.race]) continue;
          const tech = LF.races[entry.race].techs[+slot - 1];
          if (!tech || !tech.cost) continue;
          const isExp = ex && EXP_KEYS.some(k => tech.perLevel[k]) && (!tech.perLevel.explorer_class_bonus || profile.player_class === 'explorer');
          if (!isExp && (!tech.used || !['metal', 'crystal', 'deut'].some(r => tech.perLevel[r]))) continue; // ricerche sull'energia o sul costo del Plasma: valutate a parte
          const L = +entry.level || 0, next = L + 1;
          const now = techEffect(profile, planet, +slot, { race: entry.race, level: L });
          const after = techEffect(profile, planet, +slot, { race: entry.race, level: next });
          const prodDelta = [0, 1, 2].map(i => { const k = ['metal', 'crystal', 'deut'][i]; return sumRow[i] * ((after[k] || 0) - (now[k] || 0)); });
          let expH = 0;
          if (isExp) {
            const a = techEffect(profile, planet, +slot, { race: entry.race, level: next }, 'all'), b = techEffect(profile, planet, +slot, { race: entry.race, level: L }, 'all');
            const d = k => (a[k] || 0) - (b[k] || 0);
            expH = (ex.res * d('expedition_resources') / (1 + (allT.expedition_resources || 0))
              + ex.ships * d('expedition_ships_found') / (1 + (allT.expedition_ships_found || 0))
              + ex.total * d('explorer_class_bonus') / (1 + (allT.explorer_class_bonus || 0))) / 24;
            prodDelta[0] += expH; // in metallo equivalente
          }
          // slot ancora chiuso (livello 0 e popolazione insufficiente): si aggiungono gli edifici per aprirlo (popPlan)
          const un = L === 0 ? slotUnlock(profile, planet, +slot, T) : null;
          const cost = lfTechCost(tech, next, disc).map((x, i) => x + (un ? un.cost[i] : 0));
          const gain = gainEq(prodDelta), eq = toMetalEq(cost, profile);
          const wait = T.lfTech(planet, tech, next) + (un ? un.time : 0);
          out.push({
            type: 'lftech', key: tech.key, race: entry.race, slot: +slot, planetId: planet.id, planet: planet.name,
            title: `${tech.it} ${L} → ${next}`,
            detail: `ricerca forme di vita: ${isExp ? `aumenta la resa delle spedizioni di circa ${fmt(expH * 24)} al giorno (dalla tua resa media)` : 'aumenta la produzione di tutti i pianeti'}${disc ? ` (costo già scontato del ${(disc * 100).toLocaleString('it-IT', { maximumFractionDigits: 2 })}%)` : ''}${un ? `; lo slot è ancora chiuso: per aprirlo servono ${un.steps.map(x => `${x.it} ${x.from} → ${x.to}`).join(', ')}, già compresi nel costo e nel tempo, più almeno ${waitText(un.grow)} perché la popolazione cresca, anche questo compreso; scegliere la ricerca dello slot invece di tirarla a sorte costa ${fmt(un.artifacts)} manufatti` : ''}`,
            unlock: un && un.steps, cost, costEq: eq, gainPerHour: prodDelta, gainEq: gain,
            wait, payback: gain > 0 ? eq / gain + wait : Infinity, nextLevel: next,
          });
        }
      });
    }

    // 3) Tecnologia Plasma (globale)
    const nextPlasma = (profile.plasma_tech || 0) + 1;
    const plasmaAllowed = !overCap(profile.cap_plasma, nextPlasma);
    const plasmaDisc = profile._lf ? Math.max(-0.99, profile._lf.tech.plasma_tech_cost) : 0; // es. Concentratore astrale Rock'tal
    const plasmaPre = prereq(profile, planets[0] || {}, planets, 'r122');
    const plasmaCost = levelCost('plasma', nextPlasma).map((x, i) => Math.round(x * (1 + plasmaDisc)) + plasmaPre.cost[i]);
    const plasmaGain = [0, 0, 0];
    planets.forEach(planet => {
      const s = profile.economy_speed;
      const pos = positionBonus(planet.position);
      plasmaGain[0] += baseProd.metal_mine(planet.metal_mine) * (1 + pos.metal) * 0.01 * s;
      plasmaGain[1] += baseProd.crystal_mine(planet.crystal_mine) * (1 + pos.crystal) * 0.0066 * s;
      plasmaGain[2] += Math.max(0, baseProd.deut_synth(planet.deut_synth, planet.temp_max)) * 0.0033 * s;
    });
    const pEq = toMetalEq(plasmaCost, profile), pGain = gainEq(plasmaGain);
    const pWait = T.pre(T.best || planets[0] || {}, plasmaPre.steps) + T.research(levelCost('plasma', nextPlasma).map(x => Math.round(x * (1 + plasmaDisc))));
    if (plasmaAllowed) out.push({
      type: 'plasma', planet: 'Tutti i pianeti', title: `Tecnologia Plasma ${nextPlasma - 1} → ${nextPlasma}`,
      detail: 'ricerca: aumenta la produzione di tutte le miniere' + (plasmaPre.steps.length ? `; prima servono ${prereqText(plasmaPre.steps)}, già compresi nel costo` : ''),
      pre: plasmaPre.steps, prePlanet: (planets[0] || {}).id, cost: plasmaCost, costEq: pEq, gainPerHour: plasmaGain, gainEq: pGain,
      wait: pWait, payback: pGain > 0 ? pEq / pGain + pWait : Infinity, nextLevel: nextPlasma,
    });
    // Ricerche forme di vita sul costo del Plasma (es. Concentratore astrale): un livello in più conviene se fa
    // risparmiare sui prossimi 5 livelli di Plasma più di quanto costa; in quel caso va subito prima del Plasma.
    if (plasmaAllowed && pGain > 0 && LF && profile._lf && profile._lf.computed) {
      const pPay = pEq / pGain + pWait, NEXT = 5;
      const plasmaBase = [0, 0, 0];
      for (let n = nextPlasma; n < nextPlasma + NEXT; n++) levelCost('plasma', n).forEach((x, i) => { plasmaBase[i] += x; });
      planets.forEach(planet => {
        for (const [slot, entry] of Object.entries(planet.lf_techs || {})) {
          const tech = entry && LF.races[entry.race] && LF.races[entry.race].techs[+slot - 1];
          if (!tech || !tech.cost || !tech.perLevel.plasma_tech_cost) continue;
          const L = +entry.level || 0;
          if (L === 0) continue; // slot da aprire: non si valuta qui
          const d = (techEffect(profile, planet, +slot, { ...entry, level: L + 1 }, 'all').plasma_tech_cost || 0)
            - (techEffect(profile, planet, +slot, entry, 'all').plasma_tech_cost || 0);
          if (plasmaDisc + d < -0.99) continue;
          const save = plasmaBase.map(x => Math.round(x * -d)), saveEq = toMetalEq(save, profile);
          const cost = lfTechCost(tech, L + 1, researchDisc(planet)), eq = toMetalEq(cost, profile);
          if (saveEq <= eq) continue;
          out.push({
            type: 'lftech', key: tech.key, race: entry.race, slot: +slot, planetId: planet.id, planet: planet.name,
            title: `${tech.it} ${L} → ${L + 1}`,
            detail: `ricerca forme di vita: rende più economico il Plasma; costa ${fmt(eq)} e fa risparmiare ${fmt(saveEq)} (in metallo equivalente) sui prossimi ${NEXT} livelli di Plasma, quindi conviene subito prima del Plasma`,
            cost, costEq: eq, gainPerHour: [0, 0, 0], gainEq: 0, saving: save,
            wait: T.lfTech(planet, tech, L + 1), payback: pPay - 1e-6, nextLevel: L + 1,
          });
        }
      });
    }

    // 4) Nuova colonia: Astrofisica (se serve) + nave colonizzatrice + miniere fino alla media dell'impero + energia
    const colony = colonyRecommendation(profile, planets, gainEq);
    if (colony) out.push(colony);

    return out.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.payback - b.payback);
  }

  // Modifiche da salvare dopo che il giocatore completa un consiglio.
  // Restituisce { planet: {...modifiche}, profile: {...modifiche} }
  function lfLevelPatch(f, planet, all) {
    const p = f.planetId === planet.id ? planet : (all || []).find(x => x.id === f.planetId) || planet;
    const techs = JSON.parse(JSON.stringify(p.lf_techs || {}));
    techs[f.slot] = { ...(techs[f.slot] || { race: f.race }), level: f.to };
    return { id: p.id, patch: { lf_techs: techs } };
  }
  function applyRecommendation(profile, planet, rec, allPl) {
    if (rec.type === 'plasma' || rec.type === 'colony') {
      const prof = rec.type === 'plasma' ? { plasma_tech: rec.nextLevel } : { astro_tech: rec.nextLevel };
      const pp = {};
      prereqPatch(profile, planet || {}, rec.pre, pp, prof);
      if (rec.type === 'plasma' && profile.research) prof.research = { ...(prof.research || profile.research), 122: rec.nextLevel };
      if (rec.type === 'colony' && profile.research) prof.research = { ...(prof.research || profile.research), 124: rec.nextLevel };
      const out = { profile: prof };
      if (Object.keys(pp).length) out.planet = pp;
      if (rec.type === 'colony') out.newPlanet = rec.colony;
      return out;
    }
    if (rec.type === 'lftech') {
      const techs = JSON.parse(JSON.stringify(planet.lf_techs || {}));
      techs[rec.slot] = { ...(techs[rec.slot] || { race: rec.race }), level: rec.nextLevel };
      if (rec.unlock && rec.unlock.length)
        return { planet: { lf_techs: techs, lf_buildings: { ...(planet.lf_buildings || {}), ...Object.fromEntries(rec.unlock.map(x => [x.key, x.to])) } } };
      return { planet: { lf_techs: techs } };
    }
    const st = planetState(profile, planet);
    const patch = {};
    let balance = st.balance, profPatch = null, extraPlanet = null;
    if (rec.type === 'lfbuilding') {
      patch.lf_buildings = { ...(planet.lf_buildings || {}), ...Object.fromEntries((rec.lfPre || []).map(x => [x.key, x.to])), [rec.key]: rec.nextLevel };
      balance -= rec.extraNeed;
    }
    if (rec.store && rec.store.length) prereqPatch(profile, planet, rec.store, patch, {});
    if (rec.terra) { const pp = {}; prereqPatch(profile, planet, rec.terra.steps, patch, pp); if (Object.keys(pp).length) profPatch = { ...(profPatch || {}), ...pp }; }
    if (rec.newFields && planet.fields && planet.fields.max > 0)
      patch.fields = { used: planet.fields.used + rec.newFields, max: planet.fields.max + (rec.terra ? rec.terra.gain : 0) };
    if (rec.type === 'mine') {
      patch[rec.key] = rec.nextLevel;
      if (rec.withMrc) { patch.mrc_level = 1; balance -= Math.ceil(MRC_ENERGY_L1 * (1 - monolithDisc(planet))); }
      balance -= Math.round((consumption[rec.key](rec.nextLevel) - consumption[rec.key](rec.nextLevel - 1)) * consFactor(profile, planet));
    }
    if (rec.fix) {
      if (rec.fix.kind === 'satellites') patch.solar_satellites = (planet.solar_satellites || 0) + rec.fix.count;
      else if (rec.fix.kind === 'fusion') patch.fusion_reactor = rec.fix.to;
      else if (rec.fix.kind === 'energytech') profPatch = { ...(profPatch || {}), energy_tech: rec.fix.to, ...(profile.research ? { research: { ...profile.research, 113: rec.fix.to } } : {}) };
      else if (rec.fix.kind === 'lfenergy') extraPlanet = lfLevelPatch(rec.fix, planet, allPl);
      else patch.solar_plant = rec.fix.to;
      if (rec.fix.pre && rec.fix.pre.length) {
        const prof = {};
        prereqPatch(profile, planet, rec.fix.pre, patch, prof);
        const s3 = rec.fix.pre.find(x => x.key === 'b3');
        if (s3) balance -= Math.round((consumption.deut_synth(s3.to) - consumption.deut_synth(planet.deut_synth || 0)) * consFactor(profile, planet));
        if (Object.keys(prof).length) profPatch = prof;
      }
      balance += rec.fix.added;
    }
    if (rec.fixBuild) {
      const f = rec.fixBuild;
      if (f.kind === 'satellites') patch.solar_satellites = (patch.solar_satellites ?? planet.solar_satellites ?? 0) + f.count;
      else if (f.kind === 'fusion') patch.fusion_reactor = Math.max(patch.fusion_reactor || 0, f.to);
      else if (f.kind === 'energytech') profPatch = { ...(profPatch || {}), energy_tech: f.to, ...(profile.research ? { research: { ...profile.research, 113: f.to } } : {}) };
      else if (f.kind === 'lfenergy') extraPlanet = lfLevelPatch(f, planet, allPl);
      else patch.solar_plant = Math.max(patch.solar_plant || 0, f.to);
      balance += f.added;
    }
    patch.energy_balance = Math.round(balance);
    const res = profPatch ? { planet: patch, profile: profPatch } : { planet: patch };
    // ricerca forme di vita su un altro pianeta: le sue modifiche vanno a quel pianeta (o a questo, se è lo stesso)
    if (extraPlanet) { if (extraPlanet.id === planet.id) res.planet.lf_techs = extraPlanet.patch.lf_techs; else res.extraPlanet = extraPlanet; }
    return res;
  }

  // Piano dei prossimi upgrade: prende il consiglio migliore, lo applica, ricalcola la classifica, e così via.
  // Un edificio o una ricerca che resta la scelta migliore per più livelli compare più volte.
  const recKey = r => r.type === 'lftech' ? `lftech:${r.planetId}:${r.slot}`
    : r.type === 'plasma' || r.type === 'colony' ? r.type : `${r.type}:${r.planetId}:${r.key || ''}`;
  // skip: id dei pianeti per cui il giocatore non vuole consigli (già in costruzione); contano comunque per i guadagni di tutto l'account
  // allow: controllo facoltativo su un consiglio (il filtro per tipo): il piano prende solo gli upgrade che accetta
  // Piano passo per passo: ogni next() fa il consiglio migliore e restituisce il passo (null quando non c'è altro).
  // Serve anche per continuare il piano oltre quelli mostrati senza rifarlo da capo (es. per trovare la prossima colonia).
  function planIter(profile, planets, skip = [], allow = null) {
    let prof = { ...profile }; delete prof._lf;
    let pls = planets.map(p => ({ ...p, lf_buildings: { ...(p.lf_buildings || {}) }, lf_techs: JSON.parse(JSON.stringify(p.lf_techs || {})) }));
    let colonyDone = false; // una nuova colonia si pianifica una volta sola: i suoi dati li inserisce il giocatore dopo la colonizzazione
    let colonyFix = null;   // la colonia del primo passo: nel piano resta quella
    let i = 0;
    return {
      next() {
        const recs = recommendations({ ...withLifeforms(prof, pls), _colonyFix: colonyFix }, pls);
        if (!colonyFix) { const c = recs.find(x => x.type === 'colony'); if (c) colonyFix = c.colony; }
        const r = recs.find(x => x.payback < Infinity && !(x.type === 'colony' && colonyDone) && !(x.planetId && skip.includes(x.planetId)) && (!allow || allow(x)));
        if (!r) return null;
        const step = { ...r, group: recKey(r), step: i++ };
        const planet = pls.find(p => p.id === (r.planetId || r.prePlanet));
        const patch = applyRecommendation(withLifeforms(prof, pls), planet, r, pls);
        if (patch.profile) prof = { ...prof, ...patch.profile };
        if (patch.planet) pls = pls.map(p => (p.id === planet.id ? { ...p, ...patch.planet } : p));
        if (patch.extraPlanet) pls = pls.map(p => (p.id === patch.extraPlanet.id ? { ...p, ...patch.extraPlanet.patch } : p));
        if (r.type === 'colony') {
          colonyDone = true;
          // da qui le miniere della nuova colonia sono consigli come gli altri (si faranno dopo averla colonizzata)
          if (patch.newPlanet) pls = pls.concat({ ...patch.newPlanet, id: 'nuova-colonia', name: 'Nuova colonia', included: true, lf_buildings: {}, lf_techs: {} });
        }
        return step;
      },
    };
  }
  function plan(profile, planets, steps = 100, skip = [], allow = null, iter = null) {
    const it = iter || planIter(profile, planets, skip, allow);
    const out = [];
    for (let i = 0; i < steps; i++) { const st = it.next(); if (!st) break; out.push(st); }
    return out;
  }
  // Raggruppa il piano: una riga per edificio o ricerca, con tutti i livelli che il piano fa
  function planGroups(steps) {
    const by = new Map();
    for (const s of steps) {
      if (!by.has(s.group)) by.set(s.group, { first: s, steps: [] });
      by.get(s.group).steps.push(s);
    }
    return [...by.values()].map(g => ({
      ...g, from: g.first.nextLevel, to: g.steps[g.steps.length - 1].nextLevel, count: g.steps.length,
      cost: g.steps.reduce((t, s) => t.map((x, i) => x + (s.cost[i] || 0)), [0, 0, 0]),
    }));
  }

  function fixText(fix) {
    if (!fix) return '';
    const one = f => f.kind === 'satellites'
      ? `${fmt(f.count)} satelliti solari` + (f.pre && f.pre.length ? ` (prima servono ${prereqText(f.pre)}, già compresi nel costo)` : '')
      : f.kind === 'fusion'
        ? `Centrale a fusione ${f.from} → ${f.to} (brucia ${fmt(f.fuel)} di deuterio all'ora in più)` + (f.pre && f.pre.length
          ? `; prima servono ${prereqText(f.pre)}, già compresi nel costo` : '')
        : f.kind === 'energytech' ? `Tecnologia energetica ${f.from} → ${f.to} (più energia da tutte le centrali a fusione)`
        : f.kind === 'lfenergy' ? `${f.it} ${f.from} → ${f.to} (ricerca forme di vita su ${f.planetName}: più energia su tutti i pianeti)`
        : `Centrale solare ${f.from} → ${f.to}`;
    return one(fix);
  }

  function fmt(n) {
    return Math.round(n).toLocaleString('it-IT');
  }

  function totals(profile, planets) {
    if (!profile._lf) profile = withLifeforms(profile, planets);
    const t = [0, 0, 0];
    active(planets).forEach(p => planetState(profile, p).actual.forEach((x, i) => (t[i] += x)));
    return t;
  }

  return {
    RES, levelCost, lfBuildEnergy, expeditionAvg, expeditionSlots, fusionPrereq, prereq, lfPrereq, storageCap, baseProd, POP, SLOT_POP, slotNeed, popLevels, population, popPlan, monoDiscAt, consumption, solarEnergy, fusionEnergy, satelliteEnergy,
    positionBonus, multipliers, maxCrawlers, mineCost, buildTime, researchTime, labLevel, MRC_LEVEL1, maxPlanets, astroLevelsForNextPlanet, buildUpCost, active, energyModel, monolithDisc, lfBuildingCost, lfBuildingEnergy, lfTechCost, lfTechTime, lfBuildingTime, researchDisc, researchTimeDisc, buildingEffects, techEffect, techTotals, allTechTotals, crawlerBonus, withLifeforms, LF, planetState, energyFix, recommendations, applyRecommendation, plan, planIter, planGroups, totals, toMetalEq, fmt,
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
