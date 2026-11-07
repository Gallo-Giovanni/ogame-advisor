// Dati pubblici di un universo OGame (serverData.xml dell'API ufficiale) per OGame Advisor.
// Il browser non può leggerli direttamente (il server di OGame non manda l'intestazione CORS): li legge questa
// funzione. Regole ToolDev (AGENTS.md §6): solo API pubblica, senza chiave né sessione, una lettura al giorno per
// universo (cache 24 ore nella tabella server_data_cache).
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const TTL = 24 * 3600 * 1000;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  let srv = new URL(req.url).searchParams.get('srv') || '';
  if (!srv && req.method === 'POST') { try { srv = (await req.json()).srv || ''; } catch (_) { /* niente corpo */ } }
  if (!/^s\d+-[a-z]{2}$/.test(srv)) return json({ error: 'server non valido' }, 400);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: cached } = await db.from('server_data_cache').select('data, fetched_at').eq('srv', srv).maybeSingle();
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < TTL) return json({ ...cached.data, cached: true });

  try {
    const res = await fetch(`https://${srv}.ogame.gameforge.com/api/serverData.xml`, { headers: { 'User-Agent': 'OGame-Advisor (strumento esterno, cache 24h)' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const xml = await res.text();
    const tag = (n: string) => { const m = xml.match(new RegExp('<' + n + '>([^<]*)</' + n + '>')); return m ? +m[1] : 0; };
    const sd = {
      rd: tag('researchDurationDivisor'), top: tag('topScore'),
      tr: [tag('marketplaceBasicTradeRatioMetal'), tag('marketplaceBasicTradeRatioCrystal'), tag('marketplaceBasicTradeRatioDeuterium')],
      speed: tag('speed'), name: (xml.match(/<name>([^<]*)<\/name>/) || [])[1] || '',
    };
    if (!(sd.top > 0)) throw new Error('dati incompleti');
    await db.from('server_data_cache').upsert({ srv, data: sd, fetched_at: new Date().toISOString() });
    return json(sd);
  } catch (e) {
    // se OGame non risponde, meglio i dati vecchi che niente
    if (cached) return json({ ...cached.data, cached: true, stale: true });
    return json({ error: 'dati del server non raggiungibili: ' + (e as Error).message }, 502);
  }
});
