// OGame Advisor - calculation engine
// Pure functions: no DOM, no network. Works in the browser and in Node (for tests).

const Engine = (() => {
  // Lifeform data (src/lifeforms.js): global in the browser, require() in Node
  const LF = typeof LIFEFORMS !== 'undefined' ? LIFEFORMS
    : (typeof require !== 'undefined' ? require('./lifeforms.js') : null);
  const LF_RACES = ['humans', 'rocktal', 'mechas', 'kaelesh'];
  const LF_KEYS = ['metal', 'crystal', 'deut', 'energy', 'plasma_tech_cost'];
  const RES = ['metal', 'crystal', 'deut'];

  // ---- Cost of building the given level (from level-1 to level) ----
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
    // Astrophysics is rounded to hundreds: 100 x round(40 / 80 / 40 x 1.75^(level-1)) (official guide)
    if (key === 'astro') return [40, 80, 40].map(x => 100 * Math.floor(0.5 + x * Math.pow(1.75, level - 1)));
    const b = key === 'plasma' ? PLASMA : BUILD[key];
    const m = Math.pow(b.factor, level - 1);
    return b.base.map(x => Math.floor(x * m));
  }

  // ---- Base production per hour (before bonuses, before speed) ----
  const g = L => L * Math.pow(1.1, L);
  const baseProd = {
    metal_mine:   L => 30 * g(L),
    crystal_mine: L => 20 * g(L),
    deut_synth:   (L, tMax) => 10 * g(L) * (1.44 - 0.004 * tMax),
  };

  // ---- Energy ----
  const consumption = {
    metal_mine:   L => Math.ceil(10 * g(L)),
    crystal_mine: L => Math.ceil(10 * g(L)),
    deut_synth:   L => Math.ceil(20 * g(L)),
  };
  // Lifeform technologies can lower the energy used by the mines (e.g. -5%)
  // Lower energy use of the mines: from the planet's lifeform buildings when lifeforms are entered
  // (Rock'tal Disruption Chamber), otherwise from the manual account value
  const consFactor = (profile, planet) => {
    if (profile && profile._lf && profile._lf.computed && planet) return Math.max(0, 1 + buildingEffects(planet).mineConsumption);
    return 1 - Math.min(100, +profile.energy_consumption_reduction || 0) / 100;
  };
  // The fusion reactor burns deuterium: 10 x L x 1.1^L per hour, times the economy speed
  const fusionDeut = L => 10 * g(L);

  // Crawlers (checked against the game page): each working crawler adds 0.02% of every mine row
  // (x1.5 for the Collector class) and uses 50 energy, both scaled by the crawler production %.
  // At most 8 crawlers per mine level (metal + crystal + deuterium) work; a Collector with the
  // Geologist gets 10% more. Only a Collector can overload them up to 150%, and every 10% above 100%
  // costs 20% more energy (official guide).
  const isCollector = profile => profile && profile.player_class === 'collector';
  const maxCrawlers = (planet, profile) => Math.floor(8 * ((+planet.metal_mine || 0) + (+planet.crystal_mine || 0) + (+planet.deut_synth || 0))
    * (isCollector(profile) && profile.geologist ? 1.1 : 1));
  const crawlerPct = (planet, profile) => {
    const p = (planet.crawler_pct === undefined || planet.crawler_pct === null || planet.crawler_pct === '' ? 100 : +planet.crawler_pct) / 100;
    return Math.max(0, Math.min(p, isCollector(profile) ? 1.5 : 1));
  };
  const workingCrawlers = (planet, profile) => Math.min(+planet.crawlers || 0, maxCrawlers(planet, profile));
  // the crawlers can add at most +50% production (official guide: a Collector at 150% reaches it with 1,111 crawlers)
  const crawlerBonus = (profile, planet) =>
    Math.min(0.5, workingCrawlers(planet, profile) * 0.0002 * (isCollector(profile) ? 1.5 : 1) * crawlerPct(planet, profile));
  const crawlerEnergy = (profile, planet) => {
    const p = crawlerPct(planet, profile);
    const energyShare = p <= 1 ? p : 1 + 2 * (p - 1); // overload: +20% energy per +10%
    return Math.round(workingCrawlers(planet, profile) * 50 * energyShare * consFactor(profile, planet));
  };

  // Mineral Research Centre (Rock'tal): each level makes the three mines 0.5% cheaper. The game's Tech Info table
  // shows it rounded up (1, 1, 2, 2, 3 ... and 8 at level 14, where 14 x 0.5 = 7.000000001 in floating point).
  // Level 1 costs 250,000 metal, 150,000 crystal and 100,000 deuterium (before Megalith discounts).
  const MRC_LEVEL1 = [250000, 150000, 100000];

  // Lifeform building cost and energy (formulas in src/lifeforms.js). The Monolith (Rock'tal) lowers both
  // for Rock'tal buildings; its table is used as shown in the game.
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

  // ---- Lifeforms ----
  // Effects of the lifeform buildings of a planet (race of the planet, levels in planet.lf_buildings)
  function buildingEffects(planet) {
    const e = { metal: 0, crystal: 0, deut: 0, energy: 0, mineConsumption: 0, techBoost: 0, techBoostOwnRace: 0 };
    const race = planet && planet.lf_race;
    if (!LF || !race || !LF.races[race]) return e;
    const levels = planet.lf_buildings || {};
    for (const [key, b] of Object.entries(LF.races[race].buildings)) {
      if (!b || !b.effect || key === 'mineral_centre') continue; // the Centre works on costs (mrc_level)
      const lvl = +levels[key] || 0;
      for (const k of Object.keys(e)) if (b.effect[k]) e[k] += b.effect[k] * lvl;
    }
    return e;
  }
  // Research cost discount of a planet: its research building (Research Centre, Tecnologicus Runarum, ...)
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
  const lfTechCost = (t, L, disc = 0) => t.cost.base.map(x => Math.round(x * Math.pow(t.cost.factor, L - 1) * L * (1 - disc)));
  // Base effect of one researched tech, boosted by the buildings of its planet and by the level of its race
  // (game: effective = base x (1 + building boost) x (1 + 0.1% x race level))
  // keys: which effects to return (default: those used by production); 'all' = every numeric effect of the tech
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
  // Lifeform techs act on every planet: sum them over the whole account (all planets, also excluded ones)
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
  // Every numeric effect of all lifeform techs of the account (expeditions, research time, ...), summed over planets
  function allTechTotals(profile, planets) {
    const t = {};
    for (const p of planets) for (const [slot, e] of Object.entries(p.lf_techs || {})) {
      const eff = techEffect(profile, p, +slot, e, 'all');
      for (const k in eff) t[k] = (t[k] || 0) + eff[k];
    }
    return t;
  }
  const hasLifeforms = p => !!p.lf_race || Object.values(p.lf_techs || {}).some(e => e && e.race && +e.level > 0);
  // Profile with the lifeform totals attached. When no planet has a race or techs, the manual
  // percentages of each planet (lf_metal...) are used instead, as before.
  function withLifeforms(profile, planets) {
    const computed = planets.some(hasLifeforms);
    return { ...profile, _lf: { computed, tech: techTotals(profile, planets) } };
  }

  // ---- Bonuses ----
  function positionBonus(pos) {
    const metal = { 8: 0.35, 7: 0.23, 9: 0.23, 6: 0.17, 10: 0.17 }[pos] || 0;
    const crystal = { 1: 0.40, 2: 0.30, 3: 0.20 }[pos] || 0;
    return { metal, crystal, deut: 0 };
  }

  // How OGame stacks bonuses (checked against the in-game "Impostazioni risorse" page):
  // mine row = base x (1 + position bonus); plasma, geologist, staff, class, alliance, lifeforms and
  // items are each a percentage of that mine row, added together.
  // withItems: include temporary item boosters set on the planet (percent values)
  function multipliers(profile, planet, withItems = true) {
    const pos = positionBonus(planet.position);
    // per-resource booster plus the booster on all three resources (energy has its own)
    const it = k => (withItems ? ((+planet[k] || 0) + (k === 'item_energy' ? 0 : +planet.item_all || 0)) / 100 : 0);
    // Lifeform bonus: from race, buildings and techs when entered; otherwise the manual % of the planet
    // (older data falls back to the account value)
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

  // Value of a resource bundle [m, c, d] in metal-equivalent
  const value = (bundle, profile) =>
    bundle[0] * profile.ratio_metal + bundle[1] * profile.ratio_crystal + bundle[2] * profile.ratio_deut;
  const toMetalEq = (bundle, profile) => value(bundle, profile) / profile.ratio_metal;

  // Energy the planet produces (solar plant, fusion reactor, solar satellites, with bonuses) and the
  // energy its mines and crawlers use, from the building levels
  function energyModel(profile, planet, mult = multipliers(profile, planet), needOwn) {
    if (needOwn === undefined) needOwn = Math.round((consumption.metal_mine(planet.metal_mine)
      + consumption.crystal_mine(planet.crystal_mine) + consumption.deut_synth(planet.deut_synth)) * consFactor(profile, planet))
      + crawlerEnergy(profile, planet);
    const produced = Math.floor((solarEnergy(planet.solar_plant)
      + fusionEnergy(planet.fusion_reactor, profile.energy_tech)
      + (+planet.solar_satellites || 0) * satelliteEnergy(planet.temp_max)) * mult.energy);
    return { produced, need: needOwn, balance: produced - needOwn };
  }

  // ---- Planet state ----
  function planetState(profile, planet) {
    const speed = profile.economy_speed;
    const mult = multipliers(profile, planet);
    // Upgrades last forever, items expire: the player decides whether rankings count them
    const multRank = multipliers(profile, planet, profile.items_in_ranking !== false);
    // Energy used by mines and crawlers (lifeform buildings use energy too, but only the game knows how much)
    const needOwn = Math.round((consumption.metal_mine(planet.metal_mine)
      + consumption.crystal_mine(planet.crystal_mine)
      + consumption.deut_synth(planet.deut_synth)) * consFactor(profile, planet)) + crawlerEnergy(profile, planet);
    const { produced: producedModel } = energyModel(profile, planet, mult, needOwn);

    let balance, produced, need;
    if (planet.energy_balance !== null && planet.energy_balance !== undefined && planet.energy_balance !== '') {
      // Balance from the game: always preferred. The game's factor is produced / total need, and the
      // total need also counts lifeform buildings, so it is recovered from the produced energy.
      balance = +planet.energy_balance;
      produced = producedModel > 0 ? producedModel : needOwn + balance;
      need = Math.max(produced - balance, 0);
    } else {
      produced = producedModel;
      need = needOwn;
      balance = produced - need;
    }
    const factor = need > 0 ? Math.max(0, Math.min(1, produced / need)) : 1;

    // Hourly mine output at 100% (without base income)
    const full = [
      baseProd.metal_mine(planet.metal_mine) * mult.metal * speed,
      baseProd.crystal_mine(planet.crystal_mine) * mult.crystal * speed,
      Math.max(0, baseProd.deut_synth(planet.deut_synth, planet.temp_max)) * mult.deut * speed,
    ];
    // What the planet really yields per hour: mines at the energy factor, plus base income, minus fusion fuel
    const income = [30 * speed * mult.posMetal, 15 * speed * mult.posCrystal, 0];
    const fuel = fusionDeut(planet.fusion_reactor || 0) * speed;
    const actual = full.map((x, i) => x * factor + income[i] - (i === 2 ? fuel : 0));
    return { mult, multRank, need, produced, balance, factor, full, income, fuel, actual };
  }

  // Cheapest way to add `energy` units on a planet: satellites or solar plant levels
  function energyFix(profile, planet, energy) {
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
    return solarOpt && solarOpt.eq < satOpt.eq ? solarOpt : satOpt;
  }

  const MINES = [
    { key: 'metal_mine',   label: 'Miniera di metallo',   res: 0, cap: 'cap_metal' },
    { key: 'crystal_mine', label: 'Miniera di cristallo', res: 1, cap: 'cap_crystal' },
    { key: 'deut_synth',   label: 'Sintetizzatore di deuterio', res: 2, cap: 'cap_deut' },
  ];

  // A cap is "stop at level N": levels above N are never suggested. Empty = no limit.
  const overCap = (cap, level) => cap !== null && cap !== undefined && cap !== '' && level > +cap;

  // ---- Astrophysics: planets allowed = 1 + ceil(level / 2) ----
  const maxPlanets = astro => 1 + Math.ceil(astro / 2);
  // Astrophysics levels to research before one more planet can be colonized
  function astroLevelsForNextPlanet(astro, planetCount) {
    let lvl = astro;
    while (maxPlanets(lvl) <= planetCount) lvl++;
    return lvl - astro;
  }

  // Cost of building a mine from level 0 up to `level`
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

    // Typical new colony: average levels of the empire (capped), average temperature, position 8
    // Median level of the empire: robust to one planet far behind or ahead
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
      lf_metal: 0, lf_crystal: 0, lf_deut: 0, lf_energy: 0, // a new colony has no lifeform buildings yet
    };

    let cost = [0, 0, 0];
    const add = c => (cost = cost.map((x, i) => x + c[i]));
    for (let n = astro + 1; n <= astro + steps; n++) add(levelCost('astro', n));
    const astroCost = cost.slice();
    add(COLONY_SHIP);
    MINES.forEach(m => add(buildUpCost(m.key, target[m.key])));
    const needEnergy = Math.round((consumption.metal_mine(target.metal_mine) + consumption.crystal_mine(target.crystal_mine) + consumption.deut_synth(target.deut_synth)) * consFactor(profile, colony));
    const fix = energyFix(profile, colony, needEnergy);
    if (fix) add(fix.cost);

    // Output of the new planet at 100% (no items: a new planet has none active)
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

  // ---- All candidate actions, ranked by payback time ----
  // Planets the player excluded from calculations are ignored everywhere
  const active = planets => planets.filter(p => p.included !== false);

  function recommendations(profile, allPlanets) {
    if (!profile._lf) profile = withLifeforms(profile, allPlanets);
    const planets = active(allPlanets);
    const out = [];
    const ratio = [profile.ratio_metal, profile.ratio_crystal, profile.ratio_deut].map(r => r / profile.ratio_metal);
    const gainEq = arr => arr.reduce((s, x, i) => s + x * ratio[i], 0);

    planets.forEach(planet => {
      const st = planetState(profile, planet);

      // 1) Energy deficit right now: production is being lost
      if (st.balance < 0) {
        const fix = energyFix(profile, planet, -st.balance);
        const lost = st.full.map(x => x * (1 - st.factor));
        const gain = gainEq(lost);
        out.push({
          type: 'energy', planetId: planet.id, planet: planet.name,
          title: 'Rimetti in pari l\'energia',
          detail: fixText(fix) + ` (deficit ${fmt(-st.balance)}, miniere al ${Math.round(st.factor * 100)}%)`,
          cost: fix.cost, costEq: fix.eq, gainPerHour: lost, gainEq: gain,
          payback: gain > 0 ? fix.eq / gain : Infinity, urgent: true, fix,
        });
      }

      // 2) Each mine +1, including the energy it will need
      MINES.forEach(m => {
        const L = planet[m.key];
        const next = L + 1;
        if (overCap(profile[m.cap], next)) return; // player's "stop at level"
        const cost = mineCost(m.key, next, mrcLevel(planet));
        const extraNeed = Math.round((consumption[m.key](next) - consumption[m.key](L)) * consFactor(profile, planet));
        const marginAfter = Math.max(0, st.balance) - extraNeed;
        const fix = marginAfter < 0 ? energyFix(profile, planet, -marginAfter) : null;
        const totalCost = fix ? cost.map((x, i) => x + fix.cost[i]) : cost;

        const prodDelta = [0, 0, 0];
        const mult = [st.multRank.metal, st.multRank.crystal, st.multRank.deut][m.res];
        const base = m.key === 'deut_synth'
          ? Math.max(0, baseProd.deut_synth(next, planet.temp_max)) - Math.max(0, baseProd.deut_synth(L, planet.temp_max))
          : baseProd[m.key](next) - baseProd[m.key](L);
        prodDelta[m.res] = base * mult * profile.economy_speed;
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
          // the Centre itself uses 120 energy at level 1 (game table): include it
          const margin2 = marginAfter - MRC_ENERGY_L1;
          const fix2 = margin2 < 0 ? energyFix(profile, planet, -margin2) : null;
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

      // Lifeform production buildings of the planet's race (only those with known costs and energy)
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
          const fix = marginAfter < 0 ? energyFix(profile, planet, -marginAfter) : null;
          const totalCost = fix ? cost.map((x, i) => x + fix.cost[i]) : cost;
          const pos = positionBonus(planet.position), s = profile.economy_speed;
          const row = [
            baseProd.metal_mine(planet.metal_mine) * (1 + pos.metal) * s,
            baseProd.crystal_mine(planet.crystal_mine) * (1 + pos.crystal) * s,
            Math.max(0, baseProd.deut_synth(planet.deut_synth, planet.temp_max)) * s,
          ];
          const prodDelta = [0, 1, 2].map(i => row[i] * (b.effect[['metal', 'crystal', 'deut'][i]] || 0));
          const gain = gainEq(prodDelta), eq = toMetalEq(totalCost, profile);
          out.push({
            type: 'lfbuilding', key, planetId: planet.id, planet: planet.name,
            title: `${b.it} ${L} → ${next}`,
            detail: `${fix ? 'serve anche energia: ' + fixText(fix) : 'energia sufficiente'} (consuma ${fmt(extraNeed)} di energia in più)`,
            cost: totalCost, buildCost: cost, costEq: eq, gainPerHour: prodDelta, gainEq: gain,
            payback: gain > 0 ? eq / gain : Infinity, fix, nextLevel: next, extraNeed,
          });
        }
      }
    });

    // Lifeform techs with known costs: researched on one planet, they raise production on every planet
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
          if (!['metal', 'crystal', 'deut'].some(r => tech.perLevel[r])) continue; // energy or Plasma-cost techs: not ranked yet
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

    // 3) Plasma technology (global)
    const nextPlasma = (profile.plasma_tech || 0) + 1;
    const plasmaAllowed = !overCap(profile.cap_plasma, nextPlasma);
    const plasmaDisc = profile._lf ? Math.max(-0.99, profile._lf.tech.plasma_tech_cost) : 0; // e.g. Rock'tal Stellarator
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

    // 4) New colony: Astrophysics (if needed) + colony ship + mines up to the empire average + energy
    const colony = colonyRecommendation(profile, planets, gainEq);
    if (colony) out.push(colony);

    return out.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.payback - b.payback);
  }

  // Changes to save after the player completes a recommendation.
  // Returns { planet: {...patch}, profile: {...patch} }
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
      else patch.solar_plant = rec.fix.to;
      balance += rec.fix.added;
    }
    patch.energy_balance = Math.round(balance);
    return { planet: patch };
  }

  function fixText(fix) {
    if (!fix) return '';
    return fix.kind === 'satellites'
      ? `${fmt(fix.count)} satelliti solari`
      : `Centrale solare ${fix.from} → ${fix.to}`;
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
    positionBonus, multipliers, maxCrawlers, mineCost, MRC_LEVEL1, maxPlanets, astroLevelsForNextPlanet, buildUpCost, active, energyModel, monolithDisc, lfBuildingCost, lfBuildingEnergy, lfTechCost, researchDisc, buildingEffects, techEffect, techTotals, allTechTotals, crawlerBonus, withLifeforms, LF, planetState, energyFix, recommendations, applyRecommendation, totals, toMetalEq, fmt,
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
