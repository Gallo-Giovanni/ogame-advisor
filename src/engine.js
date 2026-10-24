// OGame Advisor - calculation engine
// Pure functions: no DOM, no network. Works in the browser and in Node (for tests).

const Engine = (() => {
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

  function levelCost(key, level) {
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
  const solarEnergy = L => Math.floor(20 * g(L));
  const fusionEnergy = (L, energyTech) => Math.floor(30 * L * Math.pow(1.05 + 0.01 * energyTech, L));
  const satelliteEnergy = tMax => Math.max(1, Math.floor((tMax + 140) / 6));

  // ---- Bonuses ----
  function positionBonus(pos) {
    const metal = { 8: 0.35, 7: 0.23, 9: 0.23, 6: 0.17, 10: 0.17 }[pos] || 0;
    const crystal = { 1: 0.40, 2: 0.30, 3: 0.20 }[pos] || 0;
    return { metal, crystal, deut: 0 };
  }

  function multipliers(profile, planet) {
    const pos = positionBonus(planet.position);
    const common = (profile.geologist ? 0.10 : 0)
      + (profile.commanding_staff ? 0.02 : 0)
      + (profile.player_class === 'collector' ? 0.25 : 0);
    const p = profile.plasma_tech || 0;
    return {
      metal:   1 + pos.metal + common + p * 0.01 + (+profile.lf_bonus_metal || 0) / 100,
      crystal: 1 + pos.crystal + common + p * 0.0066 + (+profile.lf_bonus_crystal || 0) / 100,
      deut:    1 + common + p * 0.0033 + (+profile.lf_bonus_deut || 0) / 100,
      energy:  1 + (profile.engineer ? 0.10 : 0) + (profile.commanding_staff ? 0.02 : 0)
               + (profile.player_class === 'collector' ? 0.10 : 0) + (+profile.lf_bonus_energy || 0) / 100,
    };
  }

  // Value of a resource bundle [m, c, d] in metal-equivalent
  const value = (bundle, profile) =>
    bundle[0] * profile.ratio_metal + bundle[1] * profile.ratio_crystal + bundle[2] * profile.ratio_deut;
  const toMetalEq = (bundle, profile) => value(bundle, profile) / profile.ratio_metal;

  // ---- Planet state ----
  function planetState(profile, planet) {
    const speed = profile.economy_speed;
    const mult = multipliers(profile, planet);
    const need = consumption.metal_mine(planet.metal_mine)
      + consumption.crystal_mine(planet.crystal_mine)
      + consumption.deut_synth(planet.deut_synth);

    let balance;
    if (planet.energy_balance !== null && planet.energy_balance !== undefined && planet.energy_balance !== '') {
      balance = +planet.energy_balance; // real value from the game: always preferred
    } else {
      const produced = Math.floor((solarEnergy(planet.solar_plant)
        + fusionEnergy(planet.fusion_reactor, profile.energy_tech)
        + planet.solar_satellites * satelliteEnergy(planet.temp_max)) * mult.energy);
      balance = produced - need;
    }
    const produced = need + balance;
    const factor = need > 0 ? Math.max(0, Math.min(1, produced / need)) : 1;

    // Hourly mine output at 100% (without base income)
    const full = [
      baseProd.metal_mine(planet.metal_mine) * mult.metal * speed,
      baseProd.crystal_mine(planet.crystal_mine) * mult.crystal * speed,
      Math.max(0, baseProd.deut_synth(planet.deut_synth, planet.temp_max)) * mult.deut * speed,
    ];
    return { mult, need, balance, factor, full, actual: full.map(x => x * factor) };
  }

  // Cheapest way to add `energy` units on a planet: satellites or solar plant levels
  function energyFix(profile, planet, energy) {
    if (energy <= 0) return null;
    const mult = multipliers(profile, planet);
    const perSat = Math.floor(satelliteEnergy(planet.temp_max) * mult.energy);
    const sats = Math.ceil(energy / perSat);
    const satCost = SATELLITE_COST.map(x => x * sats);
    const satOpt = { kind: 'satellites', count: sats, added: sats * perSat, cost: satCost, eq: toMetalEq(satCost, profile) };

    let lvl = planet.solar_plant, added = 0, solarCost = [0, 0, 0];
    while (added < energy && lvl < planet.solar_plant + 15) {
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
    { key: 'metal_mine',   label: 'Miniera di metallo',   res: 0 },
    { key: 'crystal_mine', label: 'Miniera di cristallo', res: 1 },
    { key: 'deut_synth',   label: 'Sintetizzatore di deuterio', res: 2 },
  ];

  // ---- All candidate actions, ranked by payback time ----
  function recommendations(profile, planets) {
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
        const cost = levelCost(m.key, next);
        const extraNeed = consumption[m.key](next) - consumption[m.key](L);
        const marginAfter = Math.max(0, st.balance) - extraNeed;
        const fix = marginAfter < 0 ? energyFix(profile, planet, -marginAfter) : null;
        const totalCost = fix ? cost.map((x, i) => x + fix.cost[i]) : cost;

        const prodDelta = [0, 0, 0];
        const mult = [st.mult.metal, st.mult.crystal, st.mult.deut][m.res];
        const base = m.key === 'deut_synth'
          ? Math.max(0, baseProd.deut_synth(next, planet.temp_max)) - Math.max(0, baseProd.deut_synth(L, planet.temp_max))
          : baseProd[m.key](next) - baseProd[m.key](L);
        prodDelta[m.res] = base * mult * profile.economy_speed;
        const gain = gainEq(prodDelta);
        const eq = toMetalEq(totalCost, profile);

        out.push({
          type: 'mine', key: m.key, planetId: planet.id, planet: planet.name,
          title: `${m.label} ${L} → ${next}`,
          detail: fix ? `serve anche energia: ${fixText(fix)}` : `energia sufficiente (margine dopo: ${fmt(marginAfter)})`,
          cost: totalCost, buildCost: cost, costEq: eq, gainPerHour: prodDelta, gainEq: gain,
          payback: gain > 0 ? eq / gain : Infinity, fix, nextLevel: next,
        });
      });
    });

    // 3) Plasma technology (global)
    const nextPlasma = (profile.plasma_tech || 0) + 1;
    const plasmaCost = levelCost('plasma', nextPlasma);
    const plasmaGain = [0, 0, 0];
    planets.forEach(planet => {
      const s = profile.economy_speed;
      plasmaGain[0] += baseProd.metal_mine(planet.metal_mine) * 0.01 * s;
      plasmaGain[1] += baseProd.crystal_mine(planet.crystal_mine) * 0.0066 * s;
      plasmaGain[2] += Math.max(0, baseProd.deut_synth(planet.deut_synth, planet.temp_max)) * 0.0033 * s;
    });
    const pEq = toMetalEq(plasmaCost, profile), pGain = gainEq(plasmaGain);
    out.push({
      type: 'plasma', planet: 'Tutti i pianeti', title: `Tecnologia Plasma ${nextPlasma - 1} → ${nextPlasma}`,
      detail: 'ricerca: aumenta la produzione di tutte le miniere',
      cost: plasmaCost, costEq: pEq, gainPerHour: plasmaGain, gainEq: pGain,
      payback: pGain > 0 ? pEq / pGain : Infinity, nextLevel: nextPlasma,
    });

    return out.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.payback - b.payback);
  }

  // Changes to save after the player completes a recommendation.
  // Returns { planet: {...patch}, profile: {...patch} }
  function applyRecommendation(profile, planet, rec) {
    if (rec.type === 'plasma') return { profile: { plasma_tech: rec.nextLevel } };
    const st = planetState(profile, planet);
    const patch = {};
    let balance = st.balance;
    if (rec.type === 'mine') {
      patch[rec.key] = rec.nextLevel;
      balance -= consumption[rec.key](rec.nextLevel) - consumption[rec.key](rec.nextLevel - 1);
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
    const t = [0, 0, 0];
    planets.forEach(p => planetState(profile, p).actual.forEach((x, i) => (t[i] += x)));
    return t;
  }

  return {
    RES, levelCost, baseProd, consumption, solarEnergy, fusionEnergy, satelliteEnergy,
    positionBonus, multipliers, planetState, energyFix, recommendations, applyRecommendation, totals, toMetalEq, fmt,
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
