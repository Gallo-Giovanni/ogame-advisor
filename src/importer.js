// Importazione dalla pagina "Vista impero" del gioco.
// Il bookmarklet esegue grabEmpire() sulla Vista impero aperta dal giocatore: LEGGE solo quella pagina
// (nessuna richiesta al gioco), tiene i numeri che servono all'app e apre l'app con questi nell'hash dell'URL.
// Il codice di sessione e tutto il resto della pagina vengono esclusi.
// L'app poi mostra cosa cambierebbe (mapImport) e salva solo dopo la conferma del giocatore.

// Gira dentro la pagina del gioco (e nei test in Node): deve essere autonoma, senza riferimenti esterni,
// e senza commenti // all'interno (il bookmarklet è una riga sola). Trova la fine dell'oggetto JSON
// contando le parentesi graffe fuori dalle stringhe.
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
  const research = {};
  for (const id of ((data.groups || {}).research || [])) if (first[id] != null) research[id] = +first[id] || 0;
  const going = (p, k) => {
    const m = String(p[k + '_html'] || '').match(/<img[^>]*title='([^']*)'/);
    if (!m) return 0;
    const n = (m[1].match(/\d+/g) || []).map(Number).pop() || 0;
    return Math.max(n, (+p[k] || 0) + 1);
  };
  const dec = t => String(t).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&');
  const items = h => {
    const out = [];
    for (const blk of String(h || '').split(/class="item_img[\s"]/).slice(1)) {
      const tm = blk.match(/title="([^"]*)"/);
      if (!tm) continue;
      const sm = blk.match(/data-total-duration="(-?\d+)">(\d*)</);
      const secs = sm && sm[2] !== '' ? +sm[2] : null;
      const t = dec(dec(tm[1])), name = t.split('|')[0], rest = t.slice(name.length + 1);
      const desc = rest.split(/<br\s*\/?>/i).map(x => x.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(x => x && !/^(durata|fase|prezzo|nell|duration|current|price|in inventory)/i.test(x)).join(' ');
      const body = desc.toLowerCase(), pct = +((body.match(/(\d+)\s*%/) || [])[1] || 0);
      let k = '';
      if (/spedizion|expedition/.test(body)) k = pct && /risorse|resources/.test(body) ? 'x' : '';
      else if (!pct) k = '';
      else if (/risorse \(metallo|resource production|metal, crystal/.test(body)) k = 'a';
      else if (/miniere di metallo|metal mine/.test(body)) k = 'm';
      else if (/miniere di cristallo|crystal mine/.test(body)) k = 'c';
      else if (/deuterio|deuterium/.test(body)) k = 'd';
      else if (/energia|energy/.test(body)) k = 'e';
      out.push([k, pct, secs, name, desc]);
    }
    return out;
  };
  const resGoing = {};
  for (const id of Object.keys(research)) { const t = going(first, id); if (t) resGoing[id] = t; }
  return {
    v: 6, at: Date.now(),
    rg: resGoing,
    uni: meta('universe-name') || '', nick: meta('player-name') || '',
    srv: String(meta('universe') || '').split('.')[0],
    spd: +meta('universe-speed') || 0, cls: +meta('player-characterclass-id') || 0, ally: +meta('allianceclass-id') || 0,
    res: research,
    pl: data.planets.map(p => {
      const lf = {}, b = {}, q = {};
      for (const k of Object.keys(p)) {
        if (/^\d+$/.test(k) && !research.hasOwnProperty(k)) { const t = going(p, k); if (t) q[k] = t; }
        if (/^\d+$/.test(k) && !/^1[1-4]\d\d\d$/.test(k) && !research.hasOwnProperty(k) && +p[k] > 0) b[k] = +p[k];
        if (!/^1[1-4][12]\d\d$/.test(k)) continue;
        const on = !/darkgrey/.test(p[k + '_html'] || '');
        if (+p[k] > 0 || on) lf[k] = [+p[k] || 0, on ? 1 : 0];
      }
      const temps = String(p.temperature || '').match(/-?\d+/g) || [];
      return {
        n: p.name, g: +p.galaxy, s: +p.system, p: +p.position, t: temps.length ? +temps[temps.length - 1] : null,
        e: num(p.energy),
        b,
        lf,
        q,
        r: [+p.metal || 0, +p.crystal || 0, +p.deuterium || 0],
        it: items(p.equipment_html),
        po: [+p.population || 0, +p.populationStorage || 0, +p.food || 0, +p.foodStorage || 0],
      };
    }),
  };
}

// Il link del bookmarklet per questa app (appUrl = dove è pubblicata l'app)
function bookmarkletHref(appUrl) {
  const code = `(function(){
    var meta=function(n){var m=document.querySelector('meta[name="ogame-'+n+'"]');return m?m.content:'';};
    var r=(${grabEmpire.toString()})(document.documentElement.innerHTML,meta);
    try{var x=new XMLHttpRequest();x.open('GET','/api/serverData.xml',false);x.send();
      var tag=function(n){var m=x.responseText.match(new RegExp('<'+n+'>([^<]*)</'+n+'>'));return m?+m[1]:0;};
      r.sd={rd:tag('researchDurationDivisor'),top:tag('topScore')};}catch(e){}
    if(r.error==='moons'){alert('OGame Advisor: apri la scheda Pianeti della Vista impero, non le Lune.');return;}
    if(r.error){alert('OGame Advisor: apri la Vista impero del gioco e premi di nuovo il pulsante.');return;}
    window.open(${JSON.stringify(appUrl)}+'#import='+encodeURIComponent(JSON.stringify(r)),'_blank');
  })();`;
  return 'javascript:' + encodeURIComponent(code.replace(/\n\s*/g, ' '));
}

// Trasforma i dati importati in modifiche per l'app (pianeti abbinati per coordinate, poi per nome)
const RACE_IDS = { humans: 11, rocktal: 12, mechas: 13, kaelesh: 14 };
const CLASS_IDS = { 1: 'collector', 2: 'general', 3: 'explorer' };
const ALLY_TRADER_ID = 2; // classe dell'alleanza nei meta della pagina: 1 Guerriero, 2 Mercante, 3 Ricercatore (gioco, confermato dal giocatore)

// Impostazioni dei server che la pagina del gioco non contiene (velocità delle ricerche), per lingua e nome dell'universo.
// Fonte: elenco degli universi del forum italiano di OGame (ottobre 2026). La velocità dell'economia arriva già dalla pagina.
const SERVERS = {
  it: {
    Quadrantids: { n: 195, eco: 10, research: 20 }, Yin: { n: 254, eco: 10, research: 20 }, Imai: { n: 264, eco: 8, research: 16 },
    Jishui: { n: 265, eco: 8, research: 16 }, Keid: { n: 266, eco: 8, research: 16 }, Lyra: { n: 267, eco: 8, research: 16 },
    Mars: { n: 268, eco: 8, research: 16 }, Nembus: { n: 269, eco: 8, research: 16 }, Ophiuchus: { n: 270, eco: 8, research: 16 },
    Pluto: { n: 271, eco: 8, research: 16 }, 'Quasi-Stellar': { n: 272, eco: 8, research: 16 }, Regulus: { n: 273, eco: 8, research: 16 },
    Scorpius: { n: 274, eco: 8, research: 16 }, Titania: { n: 275, eco: 8, research: 16 }, Ukdah: { n: 276, eco: 8, research: 16 },
    Veritate: { n: 277, eco: 8, research: 16 }, West: { n: 278, eco: 5, research: 15 }, Xolotlan: { eco: 8, research: 16 },
  },
};
// Impostazioni conosciute del server dell'importazione (lingua dal codice del server, es. s278-it)
function serverInfo(snap) {
  const lang = String(snap.srv || '').split('-')[1];
  const list = SERVERS[lang] || {};
  const name = Object.keys(list).find(k => k.toLowerCase() === String(snap.uni || '').trim().toLowerCase());
  return name ? list[name] : null;
}

function mapImport(snap, existing, LF) {
  const profile = {};
  // dati pubblici del server (serverData.xml, letti dal pulsante dalla versione 5): velocità delle ricerche = velocità × divisore
  const sd = snap.sd || {};
  const info = serverInfo(snap);
  if (sd.rd > 0 && snap.spd > 0) profile.research_speed = snap.spd * sd.rd;
  else if (info && info.research) profile.research_speed = info.research;
  if (sd.top > 0) profile.top1_points = Math.round(sd.top);
  if (CLASS_IDS[snap.cls]) profile.player_class = CLASS_IDS[snap.cls];
  if (snap.spd > 0) profile.economy_speed = snap.spd;
  // livelli delle ricerche per id del gioco (la versione 1 del bookmarklet li mandava per nome)
  const r0 = snap.v >= 2 ? (snap.res || {}) : { 122: (snap.res || {}).plasma, 113: (snap.res || {}).energy, 124: (snap.res || {}).astro, 114: (snap.res || {}).hyper };
  // quello che è in costruzione o in ricerca adesso conta come fatto: è già pagato
  const r = { ...r0 };
  for (const [id, t] of Object.entries(snap.rg || {})) r[id] = Math.max(+r[id] || 0, t);
  const inProgress = Object.keys(snap.rg || {}).map(Number);
  if (r[122] != null) profile.plasma_tech = +r[122];
  if (r[113] != null) profile.energy_tech = +r[113];
  if (r[124] != null) profile.astro_tech = +r[124];
  if (r[114] != null) profile.hyperspace_tech = +r[114];
  // tutti i livelli delle ricerche classiche, per id del gioco (calcolatore dei costi)
  if (snap.v >= 2) profile.research = Object.fromEntries(Object.entries(r).filter(([, v]) => v != null).map(([k, v]) => [k, +v || 0]));
  if (snap.ally) profile.alliance_trader = snap.ally === ALLY_TRADER_ID;
  if (snap.uni) profile.universe = snap.uni;
  if (snap.srv) profile.server = snap.srv; // es. s278-it
  if (snap.nick) profile.nickname = snap.nick;

  const used = new Set();
  let expItem = null; // amplificatore delle spedizioni: vale per l'account
  const planets = snap.pl.map(ip => {
    const byCoords = existing.find(x => !used.has(x.id) && x.galaxy === ip.g && x.system === ip.s && +x.position === ip.p);
    const byName = existing.find(x => !used.has(x.id) && String(x.name).trim().toLowerCase() === String(ip.n).trim().toLowerCase());
    const match = byCoords || byName || null;
    if (match) used.add(match.id);
    const q = ip.q || {};
    for (const [id, t] of Object.entries(q)) if (!/^1[1-4]\d\d\d$/.test(id)) ip.b[id] = Math.max(+ip.b[id] || 0, t);
    const lfv = id => { const v = ip.lf[id] || [0, 0]; return q[id] ? [Math.max(v[0], q[id]), v[1]] : v; };
    // razza del pianeta = quella con gli edifici non in grigio
    let race = null;
    for (const [r, base] of Object.entries(RACE_IDS))
      if (LF.races[r].buildingOrder.some((_, i) => lfv(base * 1000 + 101 + i)[1])) { race = r; break; }
    const data = {
      name: ip.n, galaxy: ip.g, system: ip.s, position: ip.p,
      metal_mine: +ip.b[1] || 0, crystal_mine: +ip.b[2] || 0, deut_synth: +ip.b[3] || 0,
      solar_plant: +ip.b[4] || 0, fusion_reactor: +ip.b[12] || 0, solar_satellites: +ip.b[212] || 0, crawlers: +ip.b[217] || 0,
      lf_race: race,
    };
    if (snap.v >= 2 || ip.b[14] != null) { data.robotics_factory = +ip.b[14] || 0; data.nanite_factory = +ip.b[15] || 0; }
    // tutti i livelli degli edifici classici del pianeta (id del gioco sotto 100), per il calcolatore dei costi
    if (ip.r) data.resources = { m: ip.r[0], c: ip.r[1], d: ip.r[2], at: snap.at || null };
    // popolazione e cibo della Vista impero (dalla versione 6 del pulsante)
    if (ip.po && data.resources) Object.assign(data.resources, { pop: ip.po[0], popMax: ip.po[1], food: ip.po[2], foodMax: ip.po[3] });
    // item attivi sul pianeta (dalla versione 6): percentuale e scadenza; quelli non attivi tornano a 0
    if (Array.isArray(ip.it)) {
      const F = { m: 'item_metal', c: 'item_crystal', d: 'item_deut', a: 'item_all', e: 'item_energy' };
      const exp = {};
      Object.values(F).forEach(f => (data[f] = 0));
      // tutti gli item del pianeta, per la scheda Item attivi (anche quelli che non servono ai calcoli)
      data.items = ip.it.map(([k, pct, secs, name, desc]) => ({ kind: k || null, pct, name, desc: desc || '', until: secs === null ? null : (snap.at || 0) + secs * 1000 })); // until null = permanente
      for (const [k, pct, secs, name] of ip.it) {
        if (!k || secs === null) continue;
        if (k === 'x') { if (!expItem || pct > expItem.pct) expItem = { pct, until: (snap.at || 0) + secs * 1000, name }; continue; }
        if (F[k] && pct >= data[F[k]]) { data[F[k]] = pct; exp[F[k]] = { until: (snap.at || 0) + secs * 1000, name }; }
      }
      data.item_expiry = exp;
    }
    if (snap.v >= 2) data.buildings = Object.fromEntries(Object.entries(ip.b).filter(([k]) => +k < 100).map(([k, v]) => [k, +v || 0]));
    if (ip.t != null) data.temp_max = ip.t;
    if (ip.e != null) data.energy_balance = ip.e;
    const lfb = {};
    data.mrc_level = null;
    if (race) LF.races[race].buildingOrder.forEach((key, i) => {
      const lvl = lfv(RACE_IDS[race] * 1000 + 101 + i)[0];
      if (key === 'mineral_centre') data.mrc_level = lvl; else if (lvl) lfb[key] = lvl;
    });
    data.lf_buildings = lfb;
    // ogni slot: la razza la cui ricerca è attiva (non in grigio) su questo pianeta
    const techs = {};
    for (let slot = 1; slot <= 18; slot++)
      for (const [r, base] of Object.entries(RACE_IDS)) {
        const [lvl, on] = lfv(base * 1000 + 200 + slot);
        if (on) { techs[slot] = { race: r, level: lvl }; break; }
      }
    data.lf_techs = techs;
    return { match, data, inProgress: Object.keys(q).map(Number) };
  });
  if (snap.v >= 6) profile.items = { expedition: expItem };
  const unmatched = existing.filter(x => !used.has(x.id));
  return { profile, planets, unmatched, inProgress };
}

// I bookmarklet trascinati prima di questa versione non leggono alcuni dati: l'app chiede di trascinare quello nuovo
const BOOKMARKLET_VERSION = 6;
const outdated = snap => !(snap.v >= BOOKMARKLET_VERSION);

const Importer = { grabEmpire, bookmarkletHref, mapImport, outdated, serverInfo, SERVERS, BOOKMARKLET_VERSION };
if (typeof module !== 'undefined') module.exports = Importer;
