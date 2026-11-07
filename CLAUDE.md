# Istruzioni per l'assistente AI

Prima di scrivere codice leggi `AGENTS.md` e seguilo alla lettera: sono le regole del team ToolDev di OGame Origin
per gli strumenti di terze parti. Ogni funzione richiesta va classificata come consentita, da far approvare
(zona grigia) o vietata, e quelle vietate non si costruiscono.

Stato attuale dell'app rispetto alle regole:
- L'app web è un calcolatore esterno: dati inseriti a mano o importati da una Vista impero salvata dal giocatore (Ctrl+S).
- Il pulsante nei preferiti (bookmarklet) è uno script che legge la pagina del gioco: va tollerato prima di poterlo
  usare. È spento con `BOOKMARKLET_ON = false` in `src/app.html`; non riattivarlo senza la tolleranza.
- L'API pubblica dell'universo (es. `https://s278-it.ogame.gameforge.com/api/serverData.xml`) si legge senza chiave,
  solo quando serve (all'importazione) e tenendo il risultato in memoria. Il browser non può leggerla (niente CORS):
  la legge la funzione Supabase `server-data` (`supabase/functions/server-data/index.ts`), con cache di 24 ore per
  universo nella tabella `server_data_cache`; l'app la chiama da `serverData()` in `src/app.html`.
- Il proxy della community `https://ogapi.faw-kes.de/` serve per report e statistiche (`/v1/report/...`,
  `/v1/statistics/...`, massimo 10 richieste al minuto): usarlo per quelle API, mai una chiave privata.
