// Import from the game's "Vista impero" (empire view) page.
// The bookmarklet runs grabEmpire() on the empire page the player has open: it only READS that page
// (no requests to the game), keeps the numbers the app needs and opens the app with them in the URL hash.
// The session id and everything else on the page are left out.
// The app then shows what would change (mapImport) and saves only after the player confirms.

// Runs inside the game page (also in Node tests): must be self-contained, no outside references,
// and without // comments inside (the bookmarklet is one line). It finds the end of the JSON object
// by counting braces outside strings.
function grabEmpire(html, meta) {
  const key = 'createImperiumHtml(';
  const at = html.indexOf(key);
  if (at < 0) return { error: 'noempire' };
  const start = html.indexOf('{', at);
  let depth = 0, inStr = false, end = -1;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) { end = i; break; }
  }
  if (end < 0) return { error: 'noempire' };
  const data = JSON.parse(html.slice(start, end + 1));
  const typeM = html.match(/var planetType = (\d)/);
  if (typeM && typeM[1] !== '0') return { error: 'moons' };
  const strip = s => String(s || '').replace(/<[^>]*>/g, '');
  const num = s => { const m = strip(s).replace(/\./g, '').match(/[-+]?\d+/); return m ? +m[0] : null; };
  const first = data.planets[0] || {};
  return {
    v: 1,
    uni: meta('universe-name') || '', nick: meta('player-name') || '',
    spd: +meta('universe-speed') || 0, cls: +meta('player-characterclass-id') || 0, ally: +meta('allianceclass-id') || 0,
    res: { plasma: first['122'], energy: first['113'], astro: first['124'] },
    pl: data.planets.map(p => {
      const lf = {};
      for (const k of Object.keys(p)) {
        if (!/^1[1-4][12]\d\d$/.test(k)) continue;
        const on = !/darkgrey/.test(p[k + '_html'] || '');
        if (+p[k] > 0 || on) lf[k] = [+p[k] || 0, on ? 1 : 0];
      }
      const temps = String(p.temperature || '').match(/-?\d+/g) || [];
      return {
        n: p.name, g: +p.galaxy, s: +p.system, p: +p.position, t: temps.length ? +temps[temps.length - 1] : null,
        e: num(p.energy),
        b: { 1: p['1'], 2: p['2'], 3: p['3'], 4: p['4'], 12: p['12'], 14: p['14'], 15: p['15'], 212: p['212'], 217: p['217'] },
        lf,
      };
    }),
  };
}

// The bookmarklet link for this app (appUrl = where the app is published)
function bookmarkletHref(appUrl) {
  const code = `(function(){
    var meta=function(n){var m=document.querySelector('meta[name="ogame-'+n+'"]');return m?m.content:'';};
    var r=(${grabEmpire.toString()})(document.documentElement.innerHTML,meta);
    if(r.error==='moons'){alert('OGame Advisor: apri la scheda Pianeti della Vista impero, non le Lune.');return;}
    if(r.error){alert('OGame Advisor: apri la Vista impero del gioco e premi di nuovo il pulsante.');return;}
    window.open(${JSON.stringify(appUrl)}+'#import='+encodeURIComponent(JSON.stringify(r)),'_blank');
  })();`;
  return 'javascript:' + encodeURIComponent(code.replace(/\n\s*/g, ' '));
}

// Turns an imported snapshot into changes for the app (planets matched by coordinates, then by name)
const RACE_IDS = { humans: 11, rocktal: 12, mechas: 13, kaelesh: 14 };
const CLASS_IDS = { 1: 'collector', 2: 'general', 3: 'explorer' };
const ALLY_TRADER_ID = 2; // alliance class in the page meta: 1 Warrior, 2 Trader, 3 Researcher (game, confirmed by the player)

function mapImport(snap, existing, LF) {
  const profile = {};
  if (CLASS_IDS[snap.cls]) profile.player_class = CLASS_IDS[snap.cls];
  if (snap.spd > 0) profile.economy_speed = snap.spd;
  if (snap.res) {
    if (snap.res.plasma != null) profile.plasma_tech = +snap.res.plasma;
    if (snap.res.energy != null) profile.energy_tech = +snap.res.energy;
    if (snap.res.astro != null) profile.astro_tech = +snap.res.astro;
  }
  if (snap.ally) profile.alliance_trader = snap.ally === ALLY_TRADER_ID;
  if (snap.uni) profile.universe = snap.uni;
  if (snap.nick) profile.nickname = snap.nick;

  const used = new Set();
  const planets = snap.pl.map(ip => {
    const byCoords = existing.find(x => !used.has(x.id) && x.galaxy === ip.g && x.system === ip.s && +x.position === ip.p);
    const byName = existing.find(x => !used.has(x.id) && String(x.name).trim().toLowerCase() === String(ip.n).trim().toLowerCase());
    const match = byCoords || byName || null;
    if (match) used.add(match.id);
    const lfv = id => (ip.lf[id] || [0, 0]);
    // race of the planet = the one whose buildings are not greyed out
    let race = null;
    for (const [r, base] of Object.entries(RACE_IDS))
      if (LF.races[r].buildingOrder.some((_, i) => lfv(base * 1000 + 101 + i)[1])) { race = r; break; }
    const data = {
      name: ip.n, galaxy: ip.g, system: ip.s, position: ip.p,
      metal_mine: +ip.b[1] || 0, crystal_mine: +ip.b[2] || 0, deut_synth: +ip.b[3] || 0,
      solar_plant: +ip.b[4] || 0, fusion_reactor: +ip.b[12] || 0, robotics_factory: +ip.b[14] || 0, nanite_factory: +ip.b[15] || 0, solar_satellites: +ip.b[212] || 0, crawlers: +ip.b[217] || 0,
      lf_race: race,
    };
    if (ip.t != null) data.temp_max = ip.t;
    if (ip.e != null) data.energy_balance = ip.e;
    const lfb = {};
    data.mrc_level = null;
    if (race) LF.races[race].buildingOrder.forEach((key, i) => {
      const lvl = lfv(RACE_IDS[race] * 1000 + 101 + i)[0];
      if (key === 'mineral_centre') data.mrc_level = lvl; else if (lvl) lfb[key] = lvl;
    });
    data.lf_buildings = lfb;
    // each slot: the race whose research is active (not greyed out) on this planet
    const techs = {};
    for (let slot = 1; slot <= 18; slot++)
      for (const [r, base] of Object.entries(RACE_IDS)) {
        const [lvl, on] = lfv(base * 1000 + 200 + slot);
        if (on) { techs[slot] = { race: r, level: lvl }; break; }
      }
    data.lf_techs = techs;
    return { match, data };
  });
  const unmatched = existing.filter(x => !used.has(x.id));
  return { profile, planets, unmatched };
}

const Importer = { grabEmpire, bookmarkletHref, mapImport };
if (typeof module !== 'undefined') module.exports = Importer;
