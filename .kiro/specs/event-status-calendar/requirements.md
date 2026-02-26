# Documento dei Requisiti — Event Status Calendar

## Introduzione

Questa feature estende il modulo eventi dell'applicazione Maestrale con tre funzionalità principali:
1. Cambio manuale dello stato degli eventi (pianificato → confermato → chiuso) dalla pagina di dettaglio e dalla lista eventi
2. Auto-chiusura automatica degli eventi confermati la cui data è passata
3. Un nuovo tab "Chiusi" nella pagina eventi con visualizzazione a calendario mensile degli eventi completati

## Glossario

- **Sistema_Eventi**: Il modulo backend Convex che gestisce le operazioni CRUD e le query sugli eventi (`convex/events.ts`)
- **Pagina_Eventi**: La pagina frontend che mostra la lista degli eventi con filtri per stato (`src/pages/EventiPage.tsx`)
- **Pagina_Dettaglio_Evento**: La pagina frontend che mostra i dettagli di un singolo evento (`src/pages/EventoDetailPage.tsx`)
- **Calendario_Mensile**: Il componente UI che visualizza gli eventi chiusi in formato calendario mensile
- **Cron_Auto_Chiusura**: Il job schedulato Convex che esegue la chiusura automatica degli eventi confermati scaduti
- **Stato_Evento**: Lo stato corrente di un evento, uno tra: "pianificato", "confermato", "chiuso"
- **Transizione_Stato**: Il passaggio da uno Stato_Evento a un altro secondo le regole di transizione consentite

## Requisiti

### Requisito 1: Transizioni di stato degli eventi

**User Story:** Come utente admin o direttivo, voglio poter cambiare lo stato di un evento seguendo transizioni valide, così da gestire il ciclo di vita degli eventi in modo controllato.

#### Criteri di Accettazione

1. THE Sistema_Eventi SHALL consentire le seguenti transizioni di Stato_Evento: da "pianificato" a "confermato", da "confermato" a "chiuso", da "pianificato" a "chiuso"
2. IF un utente tenta una Transizione_Stato non consentita (ad esempio da "chiuso" a "pianificato" o da "chiuso" a "confermato"), THEN THE Sistema_Eventi SHALL rifiutare la richiesta e restituire un messaggio di errore descrittivo
3. WHEN un utente admin o direttivo richiede una Transizione_Stato valida, THE Sistema_Eventi SHALL aggiornare lo Stato_Evento e registrare la modifica nel log di audit
4. THE Sistema_Eventi SHALL impedire qualsiasi modifica ai campi di un evento con Stato_Evento "chiuso", ad eccezione della Transizione_Stato stessa

### Requisito 2: Cambio stato dalla pagina di dettaglio evento

**User Story:** Come utente admin o direttivo, voglio poter cambiare lo stato di un evento dalla pagina di dettaglio, così da gestire rapidamente il ciclo di vita dell'evento.

#### Criteri di Accettazione

1. WHILE un evento ha Stato_Evento "pianificato", THE Pagina_Dettaglio_Evento SHALL mostrare un pulsante "Conferma" per passare allo stato "confermato"
2. WHILE un evento ha Stato_Evento "pianificato" o "confermato", THE Pagina_Dettaglio_Evento SHALL mostrare un pulsante "Chiudi" per passare allo stato "chiuso"
3. WHILE un evento ha Stato_Evento "chiuso", THE Pagina_Dettaglio_Evento SHALL nascondere i pulsanti di Transizione_Stato e mostrare i dati dell'evento in sola lettura
4. WHEN un utente preme il pulsante "Chiudi", THE Pagina_Dettaglio_Evento SHALL mostrare un dialogo di conferma prima di eseguire la Transizione_Stato
5. WHEN un utente con ruolo "socio" visualizza la Pagina_Dettaglio_Evento, THE Pagina_Dettaglio_Evento SHALL nascondere i pulsanti di Transizione_Stato

### Requisito 3: Cambio stato dalla lista eventi

**User Story:** Come utente admin o direttivo, voglio poter cambiare rapidamente lo stato degli eventi dalla lista, così da gestire più eventi senza entrare nel dettaglio di ciascuno.

#### Criteri di Accettazione

1. WHEN un utente admin o direttivo visualizza la Pagina_Eventi, THE Pagina_Eventi SHALL mostrare un'azione rapida di cambio stato su ogni EventCard per gli eventi non chiusi
2. WHEN un utente seleziona una Transizione_Stato dall'azione rapida, THE Pagina_Eventi SHALL eseguire la transizione e aggiornare la visualizzazione della card
3. WHILE un evento ha Stato_Evento "chiuso", THE Pagina_Eventi SHALL nascondere le azioni rapide di cambio stato sulla EventCard corrispondente

### Requisito 4: Auto-chiusura degli eventi confermati scaduti

**User Story:** Come amministratore del sistema, voglio che gli eventi confermati la cui data è passata vengano chiusi automaticamente, così da mantenere aggiornato lo stato degli eventi senza intervento manuale.

#### Criteri di Accettazione

1. THE Cron_Auto_Chiusura SHALL eseguire un controllo periodico (ogni ora) su tutti gli eventi con Stato_Evento "confermato"
2. WHEN il Cron_Auto_Chiusura trova un evento con Stato_Evento "confermato" e la cui dataFine è precedente al momento corrente, THE Cron_Auto_Chiusura SHALL aggiornare lo Stato_Evento a "chiuso"
3. WHEN il Cron_Auto_Chiusura chiude un evento, THE Sistema_Eventi SHALL registrare la chiusura automatica nel log di audit con indicazione che la chiusura è avvenuta in modo automatico
4. IF il Cron_Auto_Chiusura incontra un errore durante la chiusura di un evento, THEN THE Cron_Auto_Chiusura SHALL registrare l'errore nel log e proseguire con gli eventi successivi

### Requisito 5: Tab "Chiusi" con filtro nella pagina eventi

**User Story:** Come utente, voglio avere un tab dedicato agli eventi chiusi nella pagina eventi, così da poter consultare facilmente lo storico degli eventi completati.

#### Criteri di Accettazione

1. THE Pagina_Eventi SHALL mostrare tre tab di filtro: "Tutti", "Confermati", "Chiusi"
2. WHEN un utente seleziona il tab "Chiusi", THE Pagina_Eventi SHALL mostrare la vista Calendario_Mensile al posto della griglia di card
3. WHEN un utente seleziona il tab "Tutti" o "Confermati", THE Pagina_Eventi SHALL mostrare la griglia di EventCard standard

### Requisito 6: Visualizzazione calendario mensile degli eventi chiusi

**User Story:** Come utente, voglio visualizzare gli eventi chiusi in un calendario mensile, così da avere una panoramica visiva degli eventi svolti nel mese.

#### Criteri di Accettazione

1. THE Calendario_Mensile SHALL mostrare una griglia di 7 colonne (lunedì-domenica) con le righe necessarie per coprire il mese selezionato
2. THE Calendario_Mensile SHALL mostrare il nome del mese e l'anno corrente con pulsanti di navigazione per passare al mese precedente e successivo
3. WHEN un mese contiene eventi chiusi, THE Calendario_Mensile SHALL mostrare il nome dell'evento nel giorno corrispondente alla dataInizio dell'evento
4. WHEN un giorno contiene più di due eventi chiusi, THE Calendario_Mensile SHALL mostrare i primi due eventi e un indicatore "+N altri" con il conteggio degli eventi rimanenti
5. WHEN un utente clicca su un evento nel Calendario_Mensile, THE Calendario_Mensile SHALL navigare alla Pagina_Dettaglio_Evento corrispondente
6. THE Calendario_Mensile SHALL evidenziare il giorno corrente con uno stile visivo distinto
7. THE Calendario_Mensile SHALL essere responsive: su schermi piccoli (mobile), ogni giorno mostra solo un indicatore numerico del conteggio eventi, mentre su schermi grandi mostra i nomi degli eventi

### Requisito 7: Query backend per eventi chiusi per mese

**User Story:** Come sviluppatore, voglio una query ottimizzata per recuperare gli eventi chiusi di un mese specifico, così da alimentare il calendario mensile in modo efficiente.

#### Criteri di Accettazione

1. THE Sistema_Eventi SHALL esporre una query che accetta anno e mese come parametri e restituisce tutti gli eventi con Stato_Evento "chiuso" la cui dataInizio ricade nel mese specificato
2. THE Sistema_Eventi SHALL ordinare i risultati della query per dataInizio in ordine crescente
3. THE Sistema_Eventi SHALL includere nel risultato della query i campi: nome, dataInizio, dataFine, localita, durataMinuti, participantCount
