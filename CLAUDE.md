# Istruzioni per l'assistente AI

Prima di scrivere codice leggi `AGENTS.md` e seguilo alla lettera: sono le regole del team ToolDev di OGame Origin
per gli strumenti di terze parti. Ogni funzione richiesta va classificata come consentita, da far approvare
(zona grigia) o vietata, e quelle vietate non si costruiscono.

Stato attuale dell'app rispetto alle regole:
- L'app web è un calcolatore esterno: dati inseriti a mano o importati da una Vista impero salvata dal giocatore (Ctrl+S).
- Il pulsante nei preferiti (bookmarklet) è uno script che legge la pagina del gioco: va tollerato prima di poterlo
  usare. È spento con `BOOKMARKLET_ON = false` in `src/app.html`; non riattivarlo senza la tolleranza.
- Le chiamate all'API pubblica (es. `serverData.xml`) vanno fatte tramite il proxy della community
  `https://ogapi.faw-kes.de/`, una volta sola e tenendo il risultato in memoria.
