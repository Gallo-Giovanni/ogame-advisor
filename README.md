# OGame Advisor

Web app che dice a un giocatore di OGame **cosa conviene potenziare adesso**. Ogni possibile upgrade viene messo in classifica in base al **tempo di ammortamento**: quante ore servono perché la produzione in più ripaghi il costo.

## Funzioni
- Accesso con email (Supabase Auth): ogni utente vede solo i propri dati (Row Level Security)
- **Più account**, uno per universo: ogni account ha i suoi pianeti e le sue impostazioni; l'importazione sceglie da sola l'account dello stesso server (`profiles.id`, `planets.account_id`, migrazione in `sql/piu-account.sql`)
- Primo accesso a scelta: **importazione dalla Vista impero** del gioco oppure inserimento a mano (account, bonus, poi un pianeta alla volta)
- **Importazione dalla Vista impero** con un pulsante da mettere nei preferiti del browser (bookmarklet): legge la pagina aperta e il file pubblico del server (`/api/serverData.xml`: velocità delle ricerche e punti del primo in classifica), senza leggere la sessione, apre l'app con i numeri e mostra ogni modifica prima di salvare. Edifici e ricerche in corso contano come già fatti. Si può importare anche dopo l'inserimento a mano, collegando ogni pianeta del gioco a uno già salvato (`src/importer.js`)
- **Piano dei consigli**: l'app sceglie l'upgrade migliore, lo considera fatto, ricalcola e sceglie il successivo. Un livello per riga; i livelli successivi della stessa costruzione compaiono più in basso, già calcolati, e il dettaglio dice a che numero della lista si trova il prossimo livello
- Energia inclusa: se un upgrade richiede più energia, al costo si aggiunge la soluzione che si ripaga prima tra satelliti solari, centrale solare e centrale a fusione (con il deuterio che brucia), oppure solo satelliti se il giocatore lo sceglie. I deficit di energia vengono segnalati per primi
- Filtri: tipi di consiglio a scelta multipla (miniere, edifici forme di vita, ricerche forme di vita, Plasma e colonia) e pianeti da includere; il piano viene calcolato solo con quello che hai scelto
- Simboli per tipo di consiglio e sigle degli slot delle ricerche (T1-1 … T3-6)
- Forme di vita: razza per pianeta, tutti i 12 edifici di ogni razza nell'ordine del gioco (con * quelli usati nei calcoli) e i 18 slot di ricerca (T1/T2/T3, una razza per slot). Gli edifici agiscono sul loro pianeta, le ricerche su tutto l'account, potenziate dagli edifici del pianeta e dal livello della razza. Dati di tutte e quattro le razze in `src/lifeforms.js`, ognuno con la sua fonte
- Edifici di produzione Rock'tal e ricerche forme di vita T1/T2 nella stessa classifica delle miniere, con costi verificati sul gioco, sconto del Monolite e dell'edificio di ricerca
- Booster (item) per pianeta, letti anche dalla Vista impero con la scadenza (gli item scaduti non contano più); il giocatore sceglie se contarli nella classifica, perché gli item scadono e gli upgrade no
- Energia del gioco sempre aggiornata: cambiando satelliti, centrali, miniere o crawler il valore inserito si sposta della differenza calcolata
- Scheda **Costi**: per ogni pianeta costi, punti e tempi di edifici, ricerche, edifici forme di vita e delle ricerche forme di vita scelte negli slot del pianeta
- Scheda **Bonus**: classe, spedizioni (con il massimale di un ritrovamento e i Cargo pesanti necessari), produzione delle miniere, energia, tempi di costruzione e ricerca
- Scheda **Scambi**: quanto ricevere in uno scambio tra giocatori con il tasso del regolamento (2,5 : 1,5 : 1) e la regola delle 72 ore
- Nuova colonia: livelli di Astrofisica davvero necessari, nave colonizzatrice, miniere fino alla mediana dell'impero e l'energia per farle funzionare, confrontati con la produzione di un pianeta medio
- "Ferma al livello" per ogni miniera, Plasma e Astrofisica: oltre quel livello non arrivano consigli
- Copia da un pianeta agli altri (scegli cosa e dove) e "includi nei calcoli" per pianeta
- "Fatto" aggiorna il pianeta e ricalcola subito
- "Azzera tutto" in Impostazioni per ripartire da zero, per esempio cambiando server
- Finestra "Novità": ogni utente vede gli aggiornamenti usciti dopo la sua ultima visita, con le istruzioni per aggiornare il pulsante dei preferiti quando serve
- Un solo file HTML, funziona da PC e da telefono

## Come è fatto
| Parte | File |
|---|---|
| Motore di calcolo (costi, produzione, energia, bonus, classifica, piano) | `src/engine.js` |
| Interfaccia e chiamate a Supabase | `src/app.html` |
| Edifici e ricerche forme di vita di tutte le razze, con le fonti | `src/lifeforms.js` |
| Importazione dalla Vista impero (bookmarklet e conversione) | `src/importer.js` |
| Aggiornamenti mostrati agli utenti | `src/changelog.js` |
| Build: inserisce dati forme di vita, motore, importazione e novità nella pagina | `build.js` → `index.html` |
| Test, compresi i confronti con i numeri mostrati dal gioco | `tests/` |

Le risorse vengono convertite in metallo equivalente con il rapporto del giocatore (di base 1 : 1,5 : 2,5), poi:

```
ammortamento (ore) = costo in metallo eq. / produzione in più all'ora in metallo eq.
```

## Avvio
```
node tests/engine.test.js      # test del motore
node tests/reference.test.js   # motore confrontato con i numeri del gioco
node tests/lifeforms.test.js   # costi ed energia degli edifici forme di vita confrontati con il gioco
node tests/lftechs.test.js     # costi delle ricerche forme di vita confrontati con il gioco, consigli sulle ricerche
node tests/importer.test.js    # importazione dalla Vista impero
node tests/changelog.test.js   # controlli sulle novità
node build.js                  # crea index.html
```
Pubblica `index.html` su un qualsiasi hosting statico (per esempio Netlify).

## Pubblicare un aggiornamento
Aggiungi in cima a `src/changelog.js` una voce con l'`id` successivo, la data, un titolo e una breve descrizione, poi rifai la build. Se l'aggiornamento cambia il pulsante dei preferiti, aggiungi `bookmarklet: true`: nelle Novità comparirà il menu con le istruzioni per sostituirlo. Ogni utente salva l'ultimo id che ha visto (`profiles.last_seen_update`) e al prossimo accesso vede tutte le voci con id più alto. Non rinumerare mai le voci esistenti.

## Database (Supabase)
- `profiles`: una riga per account di gioco (più account per utente, uno per universo) (classe, velocità, tecnologie, ufficiali, bonus, livelli delle razze, fascia del primo in classifica, valore delle risorse, limiti "ferma al livello")
- `planets`: una riga per pianeta, legata al suo account (coordinate, temperatura, livelli degli edifici, Fabbrica di robot e Naniti, satelliti, crawler, item, razza, edifici e ricerche forme di vita in JSON, bilancio energetico del gioco, inclusione nei calcoli)

## Precisione
`tests/reference.test.js` riproduce una pagina "Impostazioni risorse" del gioco (metallo, cristallo, deuterio ed energia all'ora) con uno scarto di pochi punti. I bonus si sommano come nel gioco: il bonus di posizione moltiplica la produzione base della miniera e tutti gli altri bonus (Plasma, ufficiali, classe, alleanza Mercante, forme di vita, item) sono una percentuale di quel valore. Costi di miniere con Centro di Mineralogia, edifici Rock'tal e ricerche forme di vita T1/T2 sono confrontati con le schermate del gioco.

## Limiti
L'energia consumata dagli edifici forme di vita si conosce solo dal bilancio energetico del gioco. Alcuni effetti delle forme di vita sono salvati ma non applicati finché non vengono verificati sul gioco: potenziamento dei crawler e del Collezionista (Rock'tal) e costi delle ricerche T3. Il massimale delle spedizioni è verificato solo per un primo in classifica tra 50 e 75 milioni di punti.
