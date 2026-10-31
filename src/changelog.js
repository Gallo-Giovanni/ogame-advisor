// Aggiornamenti dell'app mostrati agli utenti ("Novità").
// Per pubblicare un aggiornamento: aggiungi una voce IN CIMA con l'id successivo. Non cambiare mai l'id di una voce esistente:
// ogni utente salva l'ultimo id che ha visto, e vede tutte le voci con id più alto.
// bookmarklet: true = l'aggiornamento cambia il pulsante "OGame Advisor" dei preferiti: chi lo usa deve trascinarlo di nuovo.
const CHANGELOG = [
  {
    id: 65, date: '2026-10-31', title: 'Scheda Sblocco slot',
    text: 'Nuova scheda Sblocco slot, accanto a Costi: scegli un pianeta (o tutti) e uno slot di ricerca forme di vita da sbloccare, e l\'app calcola la combinazione più economica di abitazioni, cibo e degli edifici che formano T2 e T3 per avere la popolazione necessaria, con costo e tempo di ogni edificio, il tempo di crescita degli abitanti e le risorse che mancano.',
  },
  {
    id: 64, date: '2026-10-31', title: 'Bonus delle ricerche forme di vita più preciso',
    text: 'Il livello della razza ora potenzia le ricerche in base alla razza del pianeta dove sono fatte (non alla razza della ricerca), sommato agli edifici che potenziano le ricerche, come nel gioco. Verificato sulla pagina Impostazioni risorse: il bonus calcolato coincide con quello del gioco.',
  },
  {
    id: 63, date: '2026-10-31', title: 'Manufatti per le ricerche forme di vita',
    text: 'Nella scheda del pianeta, sopra ogni gruppo di slot di ricerca, c\'è quanti manufatti servono per scegliere la ricerca invece di tirarla a sorte: 200 per T1, 400 per T2, 600 per T3 (al massimo 3.600 in inventario).',
  },
  {
    id: 62, date: '2026-10-31', title: 'Scheda Impero',
    text: 'Nuova scheda Impero: tutti i pianeti a confronto in una tabella, nello stesso ordine della Vista impero del gioco (risorse, capacità di deposito, edifici delle risorse, strutture, edifici e ricerche forme di vita, satelliti e crawler), più energia e produzione all\'ora; quello che era in costruzione o in ricerca all\'importazione è segnato come nel gioco, per esempio 37 ▲ (38); in verde il livello più alto e in arancione il più basso. Sotto, tutte le ricerche dell\'account. Nella scheda del pianeta, accanto a ogni slot di ricerca forme di vita, c\'è la popolazione necessaria per sbloccarlo e quanta ne manca; nell\'Impero, per ogni pianeta, slot aperti e abitanti mancanti al prossimo. Nella Popolazione ora conta anche l\'edificio che aumenta lo spazio abitativo di Umani, Mecha e Kaelesh.',
  },
  {
    id: 61, date: '2026-10-31', title: 'Valore delle risorse: server, mercante o personalizzato',
    text: 'In Impostazioni puoi scegliere come l\'app dà valore alle risorse: con i valori del server (tasso ufficiale 2,5 : 1,5 : 1), con i valori massimi del mercante (3 : 2 : 1, cioè 1 cristallo = 1,5 metallo e 1 deuterio = 3 metallo) oppure, senza spunte, con i tuoi numeri.',
  },
  {
    id: 60, date: '2026-10-31', title: 'Valore delle risorse dal tasso del server',
    text: 'L\'ammortamento ora usa il tasso di scambio ufficiale del server, 2,5 : 1,5 : 1, cioè 1 cristallo = 1,67 metallo e 1 deuterio = 2,5 metallo (prima il cristallo valeva 1,5). Si aggiorna alla prossima importazione dalla Vista impero. Se preferisci un altro valore, togli la spunta in Impostazioni e scrivi il tuo.',
  },
  {
    id: 59, date: '2026-10-31', title: 'Popolazione del pianeta',
    text: 'Nella scheda di ogni pianeta, sotto Forme di vita, c\'è la sezione Popolazione: abitanti T1, T2 e T3, spazio, sazietà, crescita e slot di ricerca aperti. Per il prossimo slot l\'app calcola la combinazione più economica di abitazioni, cibo e degli edifici che formano T2 e T3, con il costo e il tempo di crescita. Le formule vengono dai dati del server e sono verificate sulle tabelle del gioco.',
  },
  {
    id: 58, date: '2026-10-31', title: 'Energia: satelliti, centrale solare o a fusione',
    text: 'Quando un upgrade richiede energia, l\'app confronta satelliti solari, centrale solare e centrale a fusione (contando anche il deuterio che la fusione brucia ogni ora) e consiglia solo la soluzione che costa meno. In Impostazioni puoi spuntare "Per l\'energia consiglia solo satelliti".',
  },
  {
    id: 57, date: '2026-10-31', title: 'Item attivi e popolazione dalla Vista impero', bookmarklet: true,
    text: 'L\'importazione legge anche gli item attivi su ogni pianeta (amplificatori di metallo, cristallo, deuterio, energia e di tutte le risorse) con la loro scadenza, e l\'amplificatore delle spedizioni. Nella nuova scheda Item attivi, accanto a Bonus, c\'è l\'elenco degli item attivi con la scadenza, in rosso quelli che scadono entro 24 ore. Quando un item scade, l\'app smette di contarlo. Arrivano anche popolazione e cibo di ogni pianeta, per la futura sezione Popolazione.',
  },
  {
    id: 56, date: '2026-10-30', title: 'Dati del server in automatico', bookmarklet: true,
    text: 'Importando dalla Vista impero, il pulsante dei preferiti legge anche i dati pubblici del server: velocità delle ricerche e punti del primo in classifica (per il massimale delle spedizioni) si impostano da soli. Restano da inserire a mano solo ufficiali e livelli delle razze.',
  },
  {
    id: 55, date: '2026-10-30', title: 'Più account, uno per universo',
    text: 'Se giochi in più universi puoi aggiungere un account per ognuno in Impostazioni → Account di gioco, e passare dall\'uno all\'altro dal menu in alto. Importando dalla Vista impero, i dati vanno da soli nell\'account dello stesso server; se il server è nuovo, l\'app ti chiede dove caricarli.',
  },
  {
    id: 54, date: '2026-10-30', title: 'Produzione al giorno e pulsante dei preferiti sempre pronto',
    text: 'Nei Consigli, sotto la produzione oraria, c\'è anche quella al giorno. In alto, accanto a Novità, c\'è il pulsante "OGame Advisor" da trascinare nei preferiti: è sempre l\'ultima versione.',
  },
  {
    id: 53, date: '2026-10-29', title: 'Costi: solo le ricerche del pianeta',
    text: 'Nella scheda Costi, alla voce Ricerche forme di vita, ora compaiono solo le ricerche scelte negli slot del pianeta, ognuna con la sua razza. Non serve più scegliere la razza.',
  },
  {
    id: 52, date: '2026-10-29', title: 'Tempi di tutti gli edifici forme di vita',
    text: 'Nella scheda Costi ora c\'è il tempo di costruzione di tutti i 48 edifici forme di vita delle quattro razze, con Fabbrica di robot, Naniti e Monolite del pianeta.',
  },
  {
    id: 51, date: '2026-10-29', title: 'Server e nuovo sfondo',
    text: 'L\'importazione riconosce il server (per esempio West, s278-it) e lo mostra in alto. Se importi da un server diverso da quello del tuo account, l\'app te lo dice e ti propone di azzerare e ripartire. Nuovo sfondo spaziale con stelle e nebulose.',
    bookmarklet: true,
  },
  {
    id: 50, date: '2026-10-29', title: 'Tempi di costruzione',
    text: 'Nella scheda Costi, per gli edifici c\'è anche il tempo di costruzione di ogni voce e il totale, calcolato con la Fabbrica di robot e i Naniti del pianeta scelto. La formula è verificata sul gioco al secondo. Anche le ricerche classiche hanno il tempo, con i laboratori collegati dalla Rete interplanetaria di ricerca e i bonus di Esploratore e Tecnico: inserisci in Impostazioni la velocità di ricerca del tuo universo e spunta il Tecnico se lo hai. Anche le ricerche forme di vita hanno il tempo, ridotto dall\'edificio di ricerca del pianeta.',
  },
  {
    id: 49, date: '2026-10-29', title: 'Livelli di tutti gli edifici e le ricerche',
    text: 'L\'importazione dalla Vista impero salva ora i livelli di tutti gli edifici dei pianeti (anche depositi, cantiere, laboratorio, terraformer) e di tutte le ricerche: nella scheda Costi la colonna "Da" si compila da sola. Salva anche le risorse di ogni pianeta: nella scheda Costi vedi quelle del pianeta scelto e il totale dell\'impero, con quanto manca, e puoi usarle come risorse disponibili.',
    bookmarklet: true,
  },
  {
    id: 48, date: '2026-10-29', title: 'Calcolatore dei costi',
    text: 'Nuova scheda Costi: scegli un pianeta e una categoria (edifici, ricerche, edifici o ricerche forme di vita), scrivi fino a che livello vuoi arrivare e vedi quanto costa in metallo, cristallo, deuterio, metallo equivalente e punti, con il totale, le risorse che ti mancano e quanti cargo servono per trasportarle. Livelli attuali e sconti vengono dal pianeta scelto.',
  },
  {
    id: 47, date: '2026-10-29', title: 'Costi di tutte le forme di vita',
    text: 'Ora l\'app conosce i costi di tutti gli edifici e di tutte le ricerche delle quattro razze, presi da due fogli di calcolo della community e controllati con i valori già verificati sul gioco (coincidono tutti). Nei consigli entrano anche gli edifici di produzione di Umani e Mecha e le ricerche che mancavano, come Sondaggio acustico e Tecniche estrattive magmatiche.',
  },
  {
    id: 46, date: '2026-10-28', title: 'Via il menu "Mostra"',
    text: 'In Consigli il menu "Mostra" non c\'è più: si sceglie tutto dalla riga dei pianeti. Con un solo pianeta spuntato la barra in alto mostra la sua produzione, la sua energia e il pulsante per aprirne la scheda; con più pianeti mostra il totale di quelli scelti.',
  },
  {
    id: 45, date: '2026-10-28', title: 'Dove si trova il livello successivo',
    text: 'Aprendo un consiglio vedi a che numero della lista si trova il livello successivo della stessa costruzione o ricerca, se è tra i primi 100.',
  },
  {
    id: 44, date: '2026-10-27', title: 'Togli tutti i pianeti in un clic',
    text: 'Nella riga dei pianeti dei consigli, "Tutti" ora funziona nei due sensi: se sono tutti spuntati li toglie tutti, così puoi sceglierne uno o due; altrimenti li spunta tutti.',
  },
  {
    id: 43, date: '2026-10-27', title: 'Un livello per riga',
    text: 'Ogni riga dei consigli è un solo livello. I livelli successivi della stessa costruzione o ricerca compaiono più in basso, nel punto del piano in cui conviene farli, già calcolati come se avessi fatto tutto quello che c\'è prima (per esempio prima Metallo 38 su tutti i pianeti, poi i 39). Fatto si preme sul primo livello di ogni costruzione; i successivi indicano "dopo il …".',
  },
  {
    id: 42, date: '2026-10-27', title: 'Filtri completi',
    text: 'Con un filtro attivo (per esempio solo Miniere, o solo alcuni pianeti) il piano viene calcolato solo con quei consigli, quindi la lista arriva sempre a 25, 50 o 100 righe invece di mostrare solo quelli che rientravano nella classifica completa.',
  },
  {
    id: 41, date: '2026-10-27', title: 'Piano più realistico',
    text: 'In ogni riga restano solo i livelli che conviene fare prima dell\'ultimo consiglio mostrato: i livelli più lontani, che rendono meno di tutto quello che vedi, non compaiono più, e una riga si ferma al livello che impiega più del doppio del primo a ripagarsi. Gli upgrade molto più costosi degli altri in lista (per esempio le miniere) compaiono un livello alla volta. Se scegli un solo pianeta in "Mostra", il piano considera solo i suoi upgrade.',
  },
  {
    id: 40, date: '2026-10-26', title: 'Lavori in corso contati come fatti',
    text: 'Importando dalla Vista impero, gli edifici e le ricerche in costruzione o in ricerca contano come già fatti, perché sono già pagati: i consigli partono dal livello successivo (per esempio Astrofisica 19 in corso verso il 20 conta come 20). Le code non ancora iniziate non contano.',
    bookmarklet: true,
  },
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
    bookmarklet: true, // il pulsante dei preferiti va trascinato di nuovo
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
