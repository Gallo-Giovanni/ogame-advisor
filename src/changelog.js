// App updates shown to users ("Novità").
// To publish an update: add an entry at the TOP with the next id. Never change the id of an existing entry:
// each user stores the last id they have seen, and sees every entry with a higher id.
// bookmarklet: true = the update changes the "OGame Advisor" bookmark: users who have it must drag it again.
const CHANGELOG = [
  {
    id: 39, date: '2026-10-26', title: 'Scegli i pianeti nei consigli',
    text: 'Sotto il filtro dei tipi c\'è l\'elenco dei pianeti: togli la spunta a quelli che stanno già costruendo e il piano ti suggerisce gli upgrade degli altri. I pianeti esclusi contano comunque per le ricerche e il Plasma. L\'app ricorda la scelta.',
  },
  {
    id: 38, date: '2026-10-26', title: 'Consigli su più livelli',
    text: 'La classifica ora è un piano: l\'app sceglie l\'upgrade migliore, lo considera fatto e ricalcola, e così via. Se una costruzione o una ricerca conviene per più livelli di fila, la trovi in una sola riga (per esempio "Armonizzatore psicologico 1 → 5"), con i giorni del primo e dell\'ultimo livello; aprendo la riga vedi costo e guadagno di ogni livello e il totale. Fatto segna il primo livello.',
  },
  {
    id: 37, date: '2026-10-25', title: 'Azzera tutto e nuovo pulsante di importazione',
    text: 'In Impostazioni c\'è "Azzera tutto": cancella pianeti e dati dell\'account e riparte dalla configurazione iniziale, utile se cambi server. Il pulsante "OGame Advisor" da mettere nei preferiti ora legge anche Tecnologia iperspaziale, Fabbrica di robot e Naniti.',
    bookmarklet: true, // the bookmark must be dragged again
  },
  {
    id: 36, date: '2026-10-25', title: 'Importa anche dopo l\'inserimento a mano',
    text: 'Se hai inserito l\'impero a mano puoi importare dalla Vista impero quando vuoi senza perdere nulla: nell\'anteprima scegli per ogni pianeta quale dei tuoi aggiornare (utile se l\'hai chiamato in un altro modo). Item, percentuale dei crawler, ufficiali e livelli delle razze restano quelli inseriti; nessun pianeta viene cancellato.',
  },
  {
    id: 35, date: '2026-10-25', title: 'Scambi di risorse',
    text: 'Nuova scheda Scambi: scrivi quanto dai e quale risorsa vuoi in cambio, e l\'app ti dice quanto devi ricevere con il tasso ufficiale del regolamento (2,5 : 1,5 : 1), più la tabella di tutti i cambi e la regola delle 72 ore per concludere lo scambio.',
  },
  {
    id: 34, date: '2026-10-25', title: 'Massimale delle spedizioni',
    text: 'Nella scheda Bonus, sezione Spedizioni, trovi il massimo di metallo, cristallo, deuterio e navi di un ritrovamento (con un Pathfinder nella flotta) e quanti Cargo pesanti servono per portarlo a casa. In Impostazioni scegli la fascia di punti del primo in classifica del tuo universo; la Tecnologia iperspaziale arriva con l\'importazione dalla Vista impero.',
  },
  {
    id: 33, date: '2026-10-25', title: 'Scheda Bonus',
    text: 'Nuova scheda Bonus con tutti i bonus attivi: produzione delle miniere (uguali su tutti i pianeti e pianeta per pianeta), energia, tempi di costruzione e ricerca (con Fabbrica di robot e Naniti, ora importate dalla Vista impero) e spedizioni, con tutti i vantaggi della classe (come nella pagina Bonus classe personaggio del gioco) e le ricerche forme di vita di tutto l\'account.',
  },
  {
    id: 32, date: '2026-10-25', title: 'Simboli nei consigli',
    text: 'Ogni consiglio ha un simbolo che dice al volo di cosa si tratta: piccone per le miniere, edificio verde per gli edifici forme di vita, provetta viola per le ricerche forme di vita, atomo per il Plasma, pianeta per una nuova colonia e fulmine per l\'energia. Gli stessi simboli sono sui pulsanti del filtro.',
  },
  {
    id: 31, date: '2026-10-25', title: 'Filtro a scelta multipla',
    text: 'Nel filtro dei consigli puoi spuntare più tipi insieme, per esempio Miniere e Ricerche forme di vita, oppure tutti tranne uno. Tutti (o tutte le spunte) mostra l\'intera classifica. L\'app ricorda la scelta.',
  },
  {
    id: 30, date: '2026-10-25', title: 'Primo accesso più veloce',
    text: 'Chi si registra sceglie subito come caricare l\'impero: importandolo dalla Vista impero del gioco con il pulsante nei preferiti (consigliato, da PC) oppure inserendolo a mano. Dopo l\'importazione resta solo una schermata con ufficiali e livelli delle razze, poi si va ai consigli.',
  },
  {
    id: 29, date: '2026-10-25', title: 'Importa dalla Vista impero',
    text: 'In Impostazioni trovi il pulsante "OGame Advisor" da trascinare nei preferiti del browser (da PC). Premilo sulla Vista impero del gioco: l\'app legge miniere, centrali, satelliti, crawler, energia, temperatura, razza, edifici e ricerche forme di vita di tutti i pianeti, più classe, Plasma, Energia e Astrofisica, ti mostra cosa cambia e salva solo se confermi. Il pulsante legge solo la pagina aperta: non fa richieste al gioco.',
  },
  {
    id: 28, date: '2026-10-25', title: 'Ricerche forme di vita nei consigli',
    text: 'Le ricerche forme di vita T1 e T2 che aumentano la produzione (metallo, cristallo, deuterio) entrano nella classifica, con la sigla dello slot (per esempio T2-1 · Sondaggio da alte profondità 6). Il guadagno conta tutti i pianeti, perché la ricerca vale per tutto l\'account, e il costo è già scontato dall\'edificio di ricerca del pianeta. Fatto alza il livello della ricerca. Le T3 arriveranno quando avremo i loro costi.',
  },
  {
    id: 27, date: '2026-10-25', title: 'Tutti gli edifici forme di vita',
    text: 'Nella scheda del pianeta trovi tutti i 12 edifici della razza, nello stesso ordine del gioco. Quelli con * entrano nei calcoli, gli altri puoi inserirli per avere il pianeta completo. Le ricerche forme di vita hanno la sigla dello slot, per esempio T1-3 o T2-1, così le riconosci a colpo d\'occhio anche quando i nomi si somigliano.',
  },
  {
    id: 26, date: '2026-10-25', title: 'Filtro dei consigli',
    text: 'In Consigli puoi mostrare solo Miniere, solo Edifici forme di vita, solo Ricerche forme di vita oppure solo Plasma e colonia. Il filtro funziona insieme al menu "Mostra" del pianeta e l\'app ricorda la scelta. Le ricerche forme di vita arriveranno nei consigli quando avremo i loro costi.',
  },
  {
    id: 25, date: '2026-10-25', title: 'Edifici forme di vita nei consigli',
    text: 'Sui pianeti Rock\'tal i consigli ora includono Fusione magmatica, Cristalleria e Sintonizzatore di deuterio, nella stessa classifica delle miniere, con costo ed energia verificati sul gioco e lo sconto del Monolite. Fatto alza il livello dell\'edificio. Le altre razze arriveranno quando avremo i loro costi.',
  },
  {
    id: 24, date: '2026-10-25', title: 'Energia sempre aggiornata',
    text: 'Se hai inserito l\'energia del gioco e poi cambi satelliti solari, centrali, miniere o crawler, l\'app aggiorna da sola il valore. Inoltre il bonus dei crawler si ferma al +50% di produzione, come nel gioco.',
  },
  {
    id: 23, date: '2026-10-25', title: 'Razza, edifici e ricerche delle forme di vita',
    text: 'Nella scheda del pianeta scegli la razza, inserisci i livelli degli edifici e, per ogni slot T1/T2/T3, la ricerca e il suo livello. L\'app calcola i bonus da sola: edifici solo sul loro pianeta, ricerche su tutti i pianeti, potenziate dagli edifici e dal livello della razza (in Impostazioni). Il totale si confronta con la riga "Bonus Tecnologia Forme di vita" del gioco. Le percentuali manuali restano finché non inserisci razza e ricerche.',
  },
  {
    id: 22, date: '2026-10-25', title: 'Centro di Mineralogia: energia',
    text: 'Il consiglio "Centro di Mineralogia 1 + miniera" ora conta anche i 120 di energia che il Centro consuma, con i satelliti necessari inclusi nel costo.',
  },
  {
    id: 21, date: '2026-10-25', title: 'Booster a spunta',
    text: 'Nella scheda del pianeta i booster si scelgono con le spunte: uno per metallo, cristallo e deuterio (10-40%), uno su tutte e 3 le risorse (10-40%) e uno per l\'energia (20-80%), con il totale per risorsa. Se avevi inserito una somma (per esempio +80%), resta visibile tratteggiata finché non scegli i booster giusti.',
  },
  {
    id: 20, date: '2026-10-25', title: 'Icone delle risorse',
    text: 'Metallo, cristallo, deuterio ed energia hanno ora la loro icona nella barra della produzione, nei costi dei consigli e nella scheda del pianeta.',
  },
  {
    id: 19, date: '2026-10-25', title: 'Più consigli a schermo',
    text: 'La classifica parte con i primi 25 consigli; dal menu puoi passare a 50 o 100.',
  },
  {
    id: 18, date: '2026-10-25', title: 'Regole della guida ufficiale',
    text: 'Con la guida del forum: il Collezionista con il Geologo attivo può usare il 10% di crawler in più e può spingerli fino al 150% (ogni +10% costa +20% di energia); il costo dell\'Astrofisica è arrotondato alle centinaia come nel gioco.',
  },
  {
    id: 17, date: '2026-10-25', title: 'Riepilogo con icone',
    text: 'Ogni pianeta ha un riepilogo a riquadri con icone: miniere, centrali, satelliti, crawler, Centro di Mineralogia, item e forme di vita, con il livello in basso a destra. Si aggiorna mentre scrivi nella scheda e compare in piccolo anche nell\'elenco dei pianeti.',
  },
  {
    id: 16, date: '2026-10-25', title: 'Consigli più compatti',
    text: 'Ogni consiglio è una riga sola: upgrade, pianeta, tempo di ammortamento e Fatto. Tocca la riga per vedere costo, guadagno ed energia. La produzione è in una sola barra in alto e la spiegazione della classifica è in "Come leggere la classifica".',
  },
  {
    id: 15, date: '2026-10-25', title: 'Crawler e Centro di Mineralogia',
    text: 'Nella scheda di ogni pianeta puoi inserire i crawler (numero e percentuale di produzione) e il livello del Centro di Mineralogia. Se il Centro è a 0, i consigli ti propongono "Centro di Mineralogia 1 + miniera", che costa meno della sola miniera. I booster arrivano fino a +80% (due item insieme) e, se inserisci l\'energia del gioco, il fattore di produzione ora coincide con quello del gioco. Calcoli verificati sulla pagina Impostazioni risorse.',
  },
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
