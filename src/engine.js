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
    const boost = 1 + be.techBoost + (entry.race === 'kaelesh' ? be.techBoostOwnRace : 0);
    const raceLevel = 1 + LF.rules.levelBonusPerLevel.value * (+profile['lf_level_' + entry.race] || 0);
    const ks = keys === 'all' ? Object.keys(tech.perLevel).filter(k => typeof tech.perLevel[k] === 'number') : keys;
    for (const k of ks) if (tech.perLevel[k]) out[k] = tech.perLevel[k] * +entry.level * boost * raceLevel;
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
    const multRank = multipliers(profile, planet, profile.items_in_ranking !== false);
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
  function energyFix(profile, planet, energy, ctx) {
    if (energy <= 0) return null;
    const mult = multipliers(profile, planet, profile.items_in_ranking !== false);
    const perSat = Math.floor(satelliteEnergy(planet.temp_max) * mult.energy);
    const sats = Math.ceil(energy / perSat);
    const satCost = SATELLITE_COST.map(x => x * sats);
    const satOpt = { kind: 'satellites', count: sats, added: sats * perSat, cost: satCost, eq: toMetalEq(satCost, profile) };

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

    const f0 = +planet.fusion_reactor || 0, et = +profile.energy_tech || 0;
    let fl = f0, fAdded = 0, fCost = [0, 0, 0];
    while (fAdded < energy && fl < f0 + 30) {
      fl++;
      fCost = fCost.map((x, i) => x + levelCost('fusion_reactor', fl)[i]);
      fAdded = Math.floor((fusionEnergy(fl, et) - fusionEnergy(f0, et)) * mult.energy);
    }
    let fusionOpt = null;
    if (fAdded >= energy) {
      const fuel = (fusionDeut(fl) - fusionDeut(f0)) * profile.economy_speed;
      fusionOpt = { kind: 'fusion', from: f0, to: fl, added: fAdded, cost: fCost, eq: toMetalEq(fCost, profile), fuel, fuelEq: toMetalEq([0, 0, fuel], profile) };
    }
    const opts = [satOpt, solarOpt, fusionOpt].filter(Boolean);
    const score = o => ctx && ctx.gainEq > 0
      ? (ctx.gainEq - o.fuelEq > 0 ? (ctx.costEq + o.eq) / (ctx.gainEq - o.fuelEq) : Infinity)
      : o.eq + o.fuelEq * FUEL_HOURS;
    const best = opts.reduce((b, o) => (score(o) < score(b) ? o : b));
    return { ...best, alts: opts.filter(o => o !== best) }; // le altre opzioni, per il confronto nel dettaglio
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
    const target = {
      metal_mine: cap('cap_metal', avg('metal_mine')),
      crystal_mine: cap('cap_crystal', avg('crystal_mine')),
      deut_synth: cap('cap_deut', avg('deut_synth')),
    };
    const colony = {
      name: 'Nuova colonia', position: 8, temp_max: Math.round(planets.reduce((s, p) => s + (+p.temp_max || 0), 0) / planets.length),
      ...target, solar_plant: 0, fusion_reactor: 0, solar_satellites: 0,
      lf_metal: 0, lf_crystal: 0, lf_deut: 0, lf_energy: 0, // una colonia nuova non ha ancora edifici forme di vita
    };

    let cost = [0, 0, 0];
    const add = c => (cost = cost.map((x, i) => x + c[i]));
    for (let n = astro + 1; n <= astro + steps; n++) add(levelCost('astro', n));
    const astroCost = cost.slice();
    add(COLONY_SHIP);
    MINES.forEach(m => add(buildUpCost(m.key, target[m.key])));
    const needEnergy = Math.round((consumption.metal_mine(target.metal_mine) + consumption.crystal_mine(target.crystal_mine) + consumption.deut_synth(target.deut_synth)) * consFactor(profile, colony));
    const fix = energyFix(profile, colony, needEnergy, { noFusion: true }); // colonia nuova: solare o satelliti
    if (fix) add(fix.cost);

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
      detail: `${steps ? astroText + ' + ' : ''}nave colonizzatrice + miniere ${target.metal_mine}/${target.crystal_mine}/${target.deut_synth}${fix ? ' + ' + fixText(fix) : ''} (pianeta medio in posizione 8)`,
      cost, astroCost, costEq: eq, gainPerHour: prod, gainEq: gain,
      payback: gain > 0 ? eq / gain : Infinity, nextLevel: astro + steps, colony,
    };
  }

  // ---- Tutte le azioni possibili, in ordine di tempo di ammortamento ----
  // I pianeti che il giocatore ha escluso dai calcoli vengono ignorati ovunque
  const active = planets => planets.filter(p => p.included !== false);

  function recommendations(profile, allPlanets) {
    if (!profile._lf) profile = withLifeforms(profile, allPlanets);
    const planets = active(allPlanets);
    const out = [];
    const ratio = [profile.ratio_metal, profile.ratio_crystal, profile.ratio_deut].map(r => r / profile.ratio_metal);
    const gainEq = arr => arr.reduce((s, x, i) => s + x * ratio[i], 0);

    planets.forEach(planet => {
      const st = planetState(profile, planet);

      // 1) Deficit di energia adesso: si sta perdendo produzione
      if (st.balance < 0) {
        const lost = st.full.map(x => x * (1 - st.factor));
        const fix = energyFix(profile, planet, -st.balance, { costEq: 0, gainEq: gainEq(lost) });
        if (fix.fuel) lost[2] -= fix.fuel; // deuterio bruciato dalla centrale a fusione
        const gain = gainEq(lost);
        out.push({
          type: 'energy', planetId: planet.id, planet: planet.name,
          title: 'Rimetti in pari l\'energia',
          detail: fixText(fix) + ` (deficit ${fmt(-st.balance)}, miniere al ${Math.round(st.factor * 100)}%)`,
          cost: fix.cost, costEq: fix.eq, gainPerHour: lost, gainEq: gain,
          payback: gain > 0 ? fix.eq / gain : Infinity, urgent: true, fix,
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
        const fix = marginAfter < 0 ? energyFix(profile, planet, -marginAfter, { costEq: toMetalEq(cost, profile), gainEq: gainEq(prodDelta) }) : null;
        const totalCost = fix ? cost.map((x, i) => x + fix.cost[i]) : cost;
        if (fix && fix.fuel) prodDelta[2] -= fix.fuel; // deuterio bruciato dalla centrale a fusione
        const gain = gainEq(prodDelta);
        const eq = toMetalEq(totalCost, profile);

        const energyText = fix ? `serve anche energia: ${fixText(fix)}` : `energia sufficiente (margine dopo: ${fmt(marginAfter)})`;
        let rec = {
          type: 'mine', key: m.key, planetId: planet.id, planet: planet.name,
          title: `${m.label} ${L} → ${next}`, detail: energyText,
          cost: totalCost, buildCost: cost, costEq: eq, gainPerHour: prodDelta, gainEq: gain,
          payback: gain > 0 ? eq / gain : Infinity, fix, nextLevel: next,
        };
        if (mrcLevel(planet) === 0) {
          const mc = mineCost(m.key, next, 1);
          // il Centro stesso consuma 120 di energia al livello 1 (tabella del gioco): va contato
          const margin2 = marginAfter - MRC_ENERGY_L1;
          const fix2 = margin2 < 0 ? energyFix(profile, planet, -margin2, { noFusion: true }) : null;
          const mrc1 = MRC_LEVEL1.map(x => Math.round(x * (1 - monolithDisc(planet))));
          const bCost = mc.map((x, i) => x + mrc1[i] + (fix2 ? fix2.cost[i] : 0));
          const bEq = toMetalEq(bCost, profile);
          if (gain > 0 && bEq < eq) rec = {
            ...rec, withMrc: true, title: `Centro di Mineralogia 1 + ${m.label} ${L} → ${next}`,
            detail: `il Centro di Mineralogia rende le miniere di questo pianeta più economiche dello 0,5%; ${fix2 ? 'serve anche energia: ' + fixText(fix2) : 'energia sufficiente'}`,
            cost: bCost, buildCost: mc, costEq: bEq, payback: bEq / gain, fix: fix2,
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
          const cost = lfBuildingCost(b, next, disc);
          const extraNeed = Math.ceil((lfBuildingEnergy(b, next) - lfBuildingEnergy(b, L)) * (1 - disc));
          const marginAfter = Math.max(0, st.balance) - extraNeed;
          const pos = positionBonus(planet.position), s = profile.economy_speed;
          const row = [
            baseProd.metal_mine(planet.metal_mine) * (1 + pos.metal) * s,
            baseProd.crystal_mine(planet.crystal_mine) * (1 + pos.crystal) * s,
            Math.max(0, baseProd.deut_synth(planet.deut_synth, planet.temp_max)) * s,
          ];
          const prodDelta = [0, 1, 2].map(i => row[i] * (b.effect[['metal', 'crystal', 'deut'][i]] || 0));
          const fix = marginAfter < 0 ? energyFix(profile, planet, -marginAfter, { costEq: toMetalEq(cost, profile), gainEq: gainEq(prodDelta) }) : null;
          const totalCost = fix ? cost.map((x, i) => x + fix.cost[i]) : cost;
          if (fix && fix.fuel) prodDelta[2] -= fix.fuel; // deuterio bruciato dalla centrale a fusione
          const gain = gainEq(prodDelta), eq = toMetalEq(totalCost, profile);
          out.push({
            type: 'lfbuilding', key, race: planet.lf_race, planetId: planet.id, planet: planet.name,
            title: `${b.it} ${L} → ${next}`,
            detail: `${fix ? 'serve anche energia: ' + fixText(fix) : 'energia sufficiente'} (consuma ${fmt(extraNeed)} di energia in più)`,
            cost: totalCost, buildCost: cost, costEq: eq, gainPerHour: prodDelta, gainEq: gain,
            payback: gain > 0 ? eq / gain : Infinity, fix, nextLevel: next, extraNeed,
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
      planets.forEach(planet => {
        const disc = researchDisc(planet);
        for (const [slot, entry] of Object.entries(planet.lf_techs || {})) {
          if (!entry || !entry.race || !LF.races[entry.race]) continue;
          const tech = LF.races[entry.race].techs[+slot - 1];
          if (!tech || !tech.cost || !tech.used) continue;
          if (!['metal', 'crystal', 'deut'].some(r => tech.perLevel[r])) continue; // ricerche sull'energia o sul costo del Plasma: per ora fuori dalla classifica
          const L = +entry.level || 0, next = L + 1;
          const now = techEffect(profile, planet, +slot, { race: entry.race, level: L });
          const after = techEffect(profile, planet, +slot, { race: entry.race, level: next });
          const prodDelta = [0, 1, 2].map(i => { const k = ['metal', 'crystal', 'deut'][i]; return sumRow[i] * ((after[k] || 0) - (now[k] || 0)); });
          const cost = lfTechCost(tech, next, disc);
          const gain = gainEq(prodDelta), eq = toMetalEq(cost, profile);
          out.push({
            type: 'lftech', key: tech.key, race: entry.race, slot: +slot, planetId: planet.id, planet: planet.name,
            title: `${tech.it} ${L} → ${next}`,
            detail: `ricerca forme di vita: aumenta la produzione di tutti i pianeti${disc ? ` (costo già scontato del ${(disc * 100).toLocaleString('it-IT', { maximumFractionDigits: 2 })}%)` : ''}`,
            cost, costEq: eq, gainPerHour: prodDelta, gainEq: gain,
            payback: gain > 0 ? eq / gain : Infinity, nextLevel: next,
          });
        }
      });
    }

    // 3) Tecnologia Plasma (globale)
    const nextPlasma = (profile.plasma_tech || 0) + 1;
    const plasmaAllowed = !overCap(profile.cap_plasma, nextPlasma);
    const plasmaDisc = profile._lf ? Math.max(-0.99, profile._lf.tech.plasma_tech_cost) : 0; // es. Concentratore astrale Rock'tal
    const plasmaCost = levelCost('plasma', nextPlasma).map(x => Math.round(x * (1 + plasmaDisc)));
    const plasmaGain = [0, 0, 0];
    planets.forEach(planet => {
      const s = profile.economy_speed;
      const pos = positionBonus(planet.position);
      plasmaGain[0] += baseProd.metal_mine(planet.metal_mine) * (1 + pos.metal) * 0.01 * s;
      plasmaGain[1] += baseProd.crystal_mine(planet.crystal_mine) * (1 + pos.crystal) * 0.0066 * s;
      plasmaGain[2] += Math.max(0, baseProd.deut_synth(planet.deut_synth, planet.temp_max)) * 0.0033 * s;
    });
    const pEq = toMetalEq(plasmaCost, profile), pGain = gainEq(plasmaGain);
    if (plasmaAllowed) out.push({
      type: 'plasma', planet: 'Tutti i pianeti', title: `Tecnologia Plasma ${nextPlasma - 1} → ${nextPlasma}`,
      detail: 'ricerca: aumenta la produzione di tutte le miniere',
      cost: plasmaCost, costEq: pEq, gainPerHour: plasmaGain, gainEq: pGain,
      payback: pGain > 0 ? pEq / pGain : Infinity, nextLevel: nextPlasma,
    });

    // 4) Nuova colonia: Astrofisica (se serve) + nave colonizzatrice + miniere fino alla media dell'impero + energia
    const colony = colonyRecommendation(profile, planets, gainEq);
    if (colony) out.push(colony);

    return out.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.payback - b.payback);
  }

  // Modifiche da salvare dopo che il giocatore completa un consiglio.
  // Restituisce { planet: {...modifiche}, profile: {...modifiche} }
  function applyRecommendation(profile, planet, rec) {
    if (rec.type === 'plasma') return { profile: { plasma_tech: rec.nextLevel } };
    if (rec.type === 'lftech') {
      const techs = JSON.parse(JSON.stringify(planet.lf_techs || {}));
      techs[rec.slot] = { ...(techs[rec.slot] || { race: rec.race }), level: rec.nextLevel };
      return { planet: { lf_techs: techs } };
    }
    if (rec.type === 'colony') return { profile: { astro_tech: rec.nextLevel }, newPlanet: rec.colony };
    const st = planetState(profile, planet);
    const patch = {};
    let balance = st.balance;
    if (rec.type === 'lfbuilding') {
      patch.lf_buildings = { ...(planet.lf_buildings || {}), [rec.key]: rec.nextLevel };
      balance -= rec.extraNeed;
    }
    if (rec.type === 'mine') {
      patch[rec.key] = rec.nextLevel;
      if (rec.withMrc) { patch.mrc_level = 1; balance -= Math.ceil(MRC_ENERGY_L1 * (1 - monolithDisc(planet))); }
      balance -= Math.round((consumption[rec.key](rec.nextLevel) - consumption[rec.key](rec.nextLevel - 1)) * consFactor(profile, planet));
    }
    if (rec.fix) {
      if (rec.fix.kind === 'satellites') patch.solar_satellites = (planet.solar_satellites || 0) + rec.fix.count;
      else if (rec.fix.kind === 'fusion') patch.fusion_reactor = rec.fix.to;
      else patch.solar_plant = rec.fix.to;
      balance += rec.fix.added;
    }
    patch.energy_balance = Math.round(balance);
    return { planet: patch };
  }

  // Piano dei prossimi upgrade: prende il consiglio migliore, lo applica, ricalcola la classifica, e così via.
  // Un edificio o una ricerca che resta la scelta migliore per più livelli compare più volte.
  const recKey = r => r.type === 'lftech' ? `lftech:${r.planetId}:${r.slot}`
    : r.type === 'plasma' || r.type === 'colony' ? r.type : `${r.type}:${r.planetId}:${r.key || ''}`;
  // skip: id dei pianeti per cui il giocatore non vuole consigli (già in costruzione); contano comunque per i guadagni di tutto l'account
  // allow: controllo facoltativo su un consiglio (il filtro per tipo): il piano prende solo gli upgrade che accetta
  function plan(profile, planets, steps = 100, skip = [], allow = null) {
    let prof = { ...profile }; delete prof._lf;
    let pls = planets.map(p => ({ ...p, lf_buildings: { ...(p.lf_buildings || {}) }, lf_techs: JSON.parse(JSON.stringify(p.lf_techs || {})) }));
    const out = [];
    let colonyDone = false; // una nuova colonia si pianifica una volta sola: i suoi dati li inserisce il giocatore dopo la colonizzazione
    for (let i = 0; i < steps; i++) {
      const recs = recommendations(withLifeforms(prof, pls), pls);
      const r = recs.find(x => x.payback < Infinity && !(x.type === 'colony' && colonyDone) && !(x.planetId && skip.includes(x.planetId)) && (!allow || allow(x)));
      if (!r) break;
      out.push({ ...r, group: recKey(r), step: i });
      const planet = pls.find(p => p.id === r.planetId);
      const patch = applyRecommendation(withLifeforms(prof, pls), planet, r);
      if (patch.profile) prof = { ...prof, ...patch.profile };
      if (patch.planet) pls = pls.map(p => (p.id === planet.id ? { ...p, ...patch.planet } : p));
      if (r.type === 'colony') colonyDone = true;
    }
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
      ? `${fmt(f.count)} satelliti solari`
      : f.kind === 'fusion'
        ? `Centrale a fusione ${f.from} → ${f.to} (brucia ${fmt(f.fuel)} di deuterio all'ora in più)`
        : `Centrale solare ${f.from} → ${f.to}`;
    const alts = (fix.alts || []).map(a => `${one(a)}: ${fmt(a.eq)}`);
    return one(fix) + (alts.length ? ` (${fmt(fix.eq)} in metallo eq.; costano di più ${alts.join(' · ')})` : '');
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
    RES, levelCost, baseProd, consumption, solarEnergy, fusionEnergy, satelliteEnergy,
    positionBonus, multipliers, maxCrawlers, mineCost, buildTime, researchTime, labLevel, MRC_LEVEL1, maxPlanets, astroLevelsForNextPlanet, buildUpCost, active, energyModel, monolithDisc, lfBuildingCost, lfBuildingEnergy, lfTechCost, lfTechTime, lfBuildingTime, researchDisc, researchTimeDisc, buildingEffects, techEffect, techTotals, allTechTotals, crawlerBonus, withLifeforms, LF, planetState, energyFix, recommendations, applyRecommendation, plan, planGroups, totals, toMetalEq, fmt,
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
