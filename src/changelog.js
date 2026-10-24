// App updates shown to users ("Novità").
// To publish an update: add an entry at the TOP with the next id. Never change the id of an existing entry:
// each user stores the last id they have seen, and sees every entry with a higher id.
const CHANGELOG = [
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
    text: 'Un pulsante copia miniere, centrali, satelliti e item del primo pianeta su tutti gli altri: inserisci un pianeta e correggi solo quelli diversi.',
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
