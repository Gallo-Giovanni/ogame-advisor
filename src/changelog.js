// App updates shown to users ("Novità").
// To publish an update: add an entry at the TOP with the next id. Never change the id of an existing entry:
// each user stores the last id they have seen, and sees every entry with a higher id.
const CHANGELOG = [
  {
    id: 14, date: '2026-10-25', title: 'Una scheda per ogni pianeta',
    text: 'La tabella dei pianeti è sostituita da un elenco a schede: apri un pianeta per modificarlo in sezioni (Generale, Miniere, Energia, Item, Forme di vita), con la sua produzione calcolata mentre scrivi e i pulsanti Precedente/Successivo. I bonus delle forme di vita ora sono per pianeta (i tuoi valori sono stati riportati su ogni pianeta). Puoi escludere un pianeta dai calcoli, e in "Copia" scegli cosa copiare.',
  },
  {
    id: 13, date: '2026-10-24', title: 'Copia da un pianeta a scelta',
    text: 'Ogni pianeta ha il suo pulsante "Copia": scegli su quali altri pianeti copiare miniere, centrali, satelliti e item (anche tutti con "Seleziona tutti"). Sostituisce il vecchio "Copia dal primo su tutti".',
  },
  {
    id: 12, date: '2026-10-24', title: 'Calcoli verificati con il gioco',
    text: 'Le formule sono state confrontate con la pagina "Impostazioni risorse" del gioco e ora coincidono. Il bonus di posizione moltiplica la miniera e gli altri bonus si calcolano su quel valore; aggiunti l\'alleanza Mercante (+5%), la riduzione del consumo di energia, il reddito base e il deuterio consumato dalla centrale a fusione. In Impostazioni c\'è un calcolatore per i bonus delle forme di vita: controlla i tuoi valori.',
  },
  {
    id: 11, date: '2026-10-24', title: 'Vista per singolo pianeta',
    text: 'In Consigli, dal menu "Mostra" scegli un pianeta: vedi solo la sua produzione (all\'ora e al giorno), la sua energia e i suoi upgrade. Con "Tutto l\'impero" torni alla vista completa. L\'app ricorda la tua scelta.',
  },
  {
    id: 10, date: '2026-10-24', title: 'Novità dell\'app',
    text: 'Da ora, quando entri, ti mostriamo gli aggiornamenti che non hai ancora visto. Puoi rileggerli quando vuoi dal pulsante "Novità" in alto.',
  },
  {
    id: 9, date: '2026-10-24', title: 'Ferma al livello',
    text: 'In Impostazioni puoi fissare un livello massimo per ogni miniera, per il Plasma e per l\'Astrofisica: gli upgrade oltre quel livello non vengono più suggeriti.',
  },
  {
    id: 8, date: '2026-10-24', title: 'Nuova colonia (Astrofisica)',
    text: 'Tra i consigli compare anche "Nuova colonia": costo dei livelli di Astrofisica necessari, nave colonizzatrice, miniere fino alla media dei tuoi pianeti ed energia, confrontato con la produzione di un pianeta medio. Inserisci il tuo livello di Astrofisica in Impostazioni.',
  },
  {
    id: 7, date: '2026-10-24', title: 'Item booster',
    text: 'Per ogni pianeta puoi indicare i booster attivi (metallo, cristallo, deuterio, energia). In Impostazioni scegli se contarli anche nella classifica degli upgrade.',
  },
  {
    id: 6, date: '2026-10-24', title: 'Niente valori negativi',
    text: 'Galassia, sistema, posizione e livelli degli edifici non accettano più numeri negativi. Temperatura ed energia sì, come nel gioco.',
  },
  {
    id: 5, date: '2026-10-24', title: 'Un solo pulsante per salvare',
    text: 'Nella scheda Pianeti c\'è un unico pulsante "Salva tutte le modifiche": non si perdono più le righe non salvate. Le modifiche in sospeso vengono segnalate.',
  },
  {
    id: 4, date: '2026-10-24', title: 'Riordina i pianeti',
    text: 'Con le frecce ▲▼ puoi cambiare l\'ordine dei pianeti, sia nella configurazione sia nella scheda Pianeti.',
  },
  {
    id: 3, date: '2026-10-24', title: 'Copia dal primo pianeta',
    text: 'Un pulsante copia miniere, centrali e satelliti di un pianeta sugli altri: inserisci un pianeta e correggi solo quelli diversi.',
  },
  {
    id: 2, date: '2026-10-24', title: 'Coordinate facoltative',
    text: 'Galassia e sistema non sono più obbligatori: ai calcoli serve solo la posizione, che decide il bonus di produzione.',
  },
  {
    id: 1, date: '2026-10-24', title: 'Prima versione',
    text: 'Accesso con email, configurazione guidata del tuo impero e classifica degli upgrade per tempo di ammortamento, con il costo dell\'energia incluso.',
  },
];

if (typeof module !== 'undefined') module.exports = CHANGELOG;
