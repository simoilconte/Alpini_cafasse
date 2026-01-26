# Piano di Implementazione: Sistema Gestionale ODV

## Overview

Implementazione di una web application mobile-first per la gestione di soci, tessere annuali ed eventi di un'Organizzazione di Volontariato. Il sistema utilizza React + TypeScript + Tailwind per il frontend e Convex per il backend con autenticazione e controllo accessi basato sui ruoli.

## Tasks

- [x] 1. Setup progetto e configurazione base
  - Creare progetto Vite + React + TypeScript + Tailwind CSS
  - Configurare Convex e Convex Auth
  - Configurare ESLint, Prettier e struttura cartelle
  - _Requirements: Stack tecnologico specificato_

- [x] 2. Implementare schema database e utilità core
  - [x] 2.1 Creare schema Convex completo
    - Definire tutte le tabelle (profiles, members, memberships, events, eventParticipants, auditLogs)
    - Configurare indici per performance
    - Integrare authTables di Convex Auth
    - _Requirements: 1.1, 4.1, 6.1, 7.1, 11.1_
  
  - [x] 2.2 Implementare utilità anno associativo
    - Creare funzioni calculateAssociationYear, getAssociationYearEnd, isCurrentAssociationYear
    - Implementare logica 1° settembre - 31 agosto
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 2.3 Scrivere property test per anno associativo
    - **Property 7: Calcolo anno associativo**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  
  - [ ]* 2.4 Scrivere unit test per utilità anno associativo
    - Test casi specifici settembre/agosto
    - Test calcolo scadenza tessera
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Implementare sistema autenticazione e RBAC
  - [x] 3.1 Configurare Convex Auth
    - Setup provider email/password
    - Configurare ConvexAuthProvider in React
    - Creare pagina login con form validation
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 3.2 Implementare middleware RBAC
    - Creare funzioni requireRole, canReadMember
    - Implementare controlli permessi centralizzati
    - Gestire collegamento utente-socio per ruolo "socio"
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 3.3 Scrivere property test per controlli RBAC
    - **Property 19: Controlli permessi admin/direttivo**
    - **Property 20: Controlli permessi socio**
    - **Validates: Requirements 9.2, 9.3**
  
  - [ ]* 3.4 Scrivere unit test per autenticazione
    - Test login con credenziali valide/non valide
    - Test middleware permessi per diversi ruoli
    - _Requirements: 8.2, 8.3, 9.2, 9.3_

- [x] 4. Checkpoint - Verificare setup base
  - Assicurarsi che tutti i test passino, chiedere all'utente se sorgono domande.

- [x] 5. Implementare gestione soci (CRUD)
  - [x] 5.1 Creare mutations Convex per soci
    - Implementare createMember, updateMember, deleteMember
    - Aggiungere validazioni (unicità CF, coerenza socioAttivo/stato)
    - Integrare controlli RBAC e audit logging
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 13.1, 13.4_
  
  - [x] 5.2 Creare queries Convex per soci
    - Implementare getMember, listMembers con filtri e ricerca
    - Implementare minimizzazione dati per liste vs dettaglio
    - Aggiungere controlli permessi per privacy
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 10.1, 10.2, 10.4_
  
  - [ ]* 5.3 Scrivere property test per gestione soci
    - **Property 1: Persistenza dati completa**
    - **Property 2: Unicità codice fiscale**
    - **Property 4: Classificazione simpatizzante**
    - **Validates: Requirements 1.1, 1.2, 1.5**
  
  - [ ]* 5.4 Scrivere unit test per CRUD soci
    - Test creazione socio con dati validi
    - Test validazione codice fiscale duplicato
    - Test eliminazione con cascata
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 6. Implementare UI gestione soci
  - [x] 6.1 Creare componenti lista soci
    - Implementare SociList con ricerca e filtri
    - Design responsive (cards mobile, tabella desktop)
    - Integrare paginazione e loading states
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 12.1, 12.2_
  
  - [x] 6.2 Creare form socio (create/edit)
    - Implementare SocioForm con react-hook-form + Zod
    - Aggiungere validazioni client-side
    - Gestire stati loading, success, error
    - _Requirements: 1.1, 1.3, 13.5_
  
  - [x] 6.3 Creare pagina dettaglio socio
    - Mostrare informazioni complete socio
    - Integrare visualizzazione tessere associate
    - Aggiungere azioni edit/delete con conferma
    - _Requirements: 4.4, 10.2, 10.4_
  
  - [ ]* 6.4 Scrivere property test per ricerca e filtri
    - **Property 5: Ricerca multi-campo**
    - **Property 6: Filtri combinati**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 7. Implementare gestione tessere annuali
  - [x] 7.1 Creare mutations Convex per tessere
    - Implementare createMembership, updateMembership
    - Aggiungere calcolo automatico scadenza e anno associativo
    - Implementare logica "segna come pagata"
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  
  - [x] 7.2 Creare queries per tessere e dashboard
    - Implementare getMembershipsByMember, getDashboardStats
    - Calcolare conteggi quote (non pagate, in scadenza, scadute)
    - Aggiungere controlli permessi
    - _Requirements: 4.4, 5.1, 5.2, 5.3_
  
  - [ ]* 7.3 Scrivere property test per tessere
    - **Property 8: Scadenza tessera automatica**
    - **Property 9: Validazione importo tessera**
    - **Property 10: Aggiornamento stato pagamento**
    - **Validates: Requirements 4.2, 4.3, 4.5**
  
  - [ ]* 7.4 Scrivere unit test per calcoli dashboard
    - Test conteggio quote per diversi stati
    - Test calcolo scadenze basato su data corrente
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. Implementare UI tessere e dashboard
  - [x] 8.1 Creare dashboard principale
    - Implementare widget conteggi quote
    - Aggiungere grafici/statistiche base
    - Design responsive con navigazione mobile
    - _Requirements: 5.1, 5.2, 5.3, 12.3_
  
  - [x] 8.2 Creare componenti gestione tessere
    - Implementare TesseraCard per visualizzazione
    - Aggiungere azione rapida "segna come pagata"
    - Creare form creazione/modifica tessera
    - _Requirements: 4.3, 4.4_
  
  - [ ]* 8.3 Scrivere property test per calcoli aggregati
    - **Property 12: Calcoli aggregati dashboard**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 9. Checkpoint - Verificare gestione soci e tessere
  - Assicurarsi che tutti i test passino, chiedere all'utente se sorgono domande.

- [x] 10. Implementare gestione eventi
  - [x] 10.1 Creare mutations Convex per eventi
    - Implementare createEvent, updateEvent, deleteEvent
    - Aggiungere validazioni date e calcolo durata automatico
    - Implementare protezione eventi chiusi
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 10.2 Creare queries per eventi
    - Implementare getEvent, listEvents con filtri
    - Aggiungere calcoli aggregati partecipanti
    - Integrare controlli permessi
    - _Requirements: 7.3_
  
  - [ ]* 10.3 Scrivere property test per eventi
    - **Property 13: Validazione date evento**
    - **Property 14: Calcolo durata evento**
    - **Property 15: Protezione evento chiuso**
    - **Validates: Requirements 6.2, 6.3, 6.4**
  
  - [ ]* 10.4 Scrivere unit test per gestione eventi
    - Test creazione evento con date valide
    - Test validazione date (fine >= inizio)
    - Test calcolo durata in minuti
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 11. Implementare gestione partecipazioni
  - [x] 11.1 Creare mutations per partecipazioni
    - Implementare addParticipant, removeParticipant, updateParticipant
    - Aggiungere inizializzazione automatica ore effettive
    - Validare eventi non chiusi per modifiche
    - _Requirements: 7.1, 7.2, 7.4_
  
  - [x] 11.2 Creare queries per partecipazioni
    - Implementare getEventParticipants con calcoli aggregati
    - Aggiungere getParticipationsByMember per soci
    - Integrare controlli permessi
    - _Requirements: 7.3, 9.3_
  
  - [ ]* 11.3 Scrivere property test per partecipazioni
    - **Property 16: Inizializzazione ore partecipazione**
    - **Property 17: Calcoli aggregati evento**
    - **Property 18: Rimozione partecipazione**
    - **Validates: Requirements 7.2, 7.3, 7.4**

- [x] 12. Implementare UI eventi e partecipazioni
  - [x] 12.1 Creare componenti lista eventi
    - Implementare EventList con filtri per stato
    - Design responsive con cards mobile
    - Aggiungere azioni create/edit/delete
    - _Requirements: 12.1, 12.2_
  
  - [x] 12.2 Creare form evento
    - Implementare EventForm con validazioni date
    - Aggiungere gestione attrezzature (add/remove)
    - Gestire stati e transizioni
    - _Requirements: 6.1, 6.4, 13.2_
  
  - [x] 12.3 Creare pagina dettaglio evento
    - Mostrare informazioni evento e partecipanti
    - Implementare gestione partecipazioni (add/remove)
    - Aggiungere calcoli totali (partecipanti, ore)
    - _Requirements: 7.1, 7.3, 7.4_
  
  - [ ]* 12.4 Scrivere integration test per UI eventi
    - Test flusso completo creazione evento
    - Test gestione partecipazioni
    - _Requirements: 6.1, 7.1, 7.4_

- [x] 13. Implementare audit logging
  - [x] 13.1 Creare sistema audit log
    - Implementare createAuditLog helper
    - Integrare in tutte le mutations CRUD
    - Aggiungere query getAuditLogs per admin
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 13.2 Creare UI visualizzazione audit log
    - Implementare AuditLogList solo per admin
    - Aggiungere filtri per entità e azioni
    - Design timeline/cronologia
    - _Requirements: 11.4_
  
  - [ ]* 13.3 Scrivere property test per audit log
    - **Property 26: Audit log automatico**
    - **Property 27: Accesso audit log riservato**
    - **Property 28: Immutabilità audit log**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**

- [x] 14. Implementare validazioni e error handling
  - [x] 14.1 Creare schema validazione Zod
    - Implementare memberSchema, membershipSchema, eventSchema
    - Aggiungere validazioni custom (CF, date, coerenza)
    - Integrare con react-hook-form
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 14.2 Implementare error handling globale
    - Creare ErrorBoundary React
    - Implementare classi errore custom (ODVError, ValidationError, etc.)
    - Aggiungere toast notifications per feedback
    - _Requirements: 13.5_
  
  - [ ]* 14.3 Scrivere property test per validazioni
    - **Property 29: Coerenza socioAttivo-stato**
    - **Property 30: Messaggi errore validazione**
    - **Validates: Requirements 13.4, 13.5**

- [x] 15. Implementare UI responsive e navigazione
  - [x] 15.1 Creare layout e navigazione
    - Implementare AppLayout con sidebar desktop e bottom nav mobile
    - Aggiungere routing con React Router
    - Creare componenti header e menu
    - _Requirements: 12.3_
  
  - [x] 15.2 Implementare componenti UI comuni
    - Creare LoadingSkeleton, Toast, ConfirmDialog
    - Implementare FilterDrawer per mobile
    - Aggiungere componenti form riusabili
    - _Requirements: 12.4, 12.5_
  
  - [x] 15.3 Ottimizzare responsive design
    - Verificare design mobile-first su tutti i componenti
    - Implementare breakpoints Tailwind appropriati
    - Testare su diversi dispositivi
    - _Requirements: 12.1, 12.2_

- [x] 16. Setup testing e seed data
  - [x] 16.1 Configurare ambiente testing
    - Setup Vitest e fast-check per property testing
    - Configurare Convex test environment
    - Creare utilities per mock data generation
    - _Requirements: Testing strategy_
  
  - [x] 16.2 Creare seed data di esempio
    - Implementare script per dati demo
    - Creare soci, tessere, eventi di esempio
    - Aggiungere utenti con diversi ruoli
    - _Requirements: Demo data per testing_
  
  - [ ]* 16.3 Eseguire tutti i property test
    - Verificare tutte le 30 proprietà definite
    - Configurare 100+ iterazioni per test
    - Validare copertura requisiti
    - _Requirements: Tutte le proprietà di correttezza_

- [x] 17. Checkpoint finale - Verificare sistema completo
  - Assicurarsi che tutti i test passino, chiedere all'utente se sorgono domande.

- [x] 18. Deployment e documentazione
  - [x] 18.1 Preparare deployment
    - Configurare build production
    - Setup variabili ambiente
    - Preparare deployment Convex
    - _Requirements: Deployment ready_
  
  - [x] 18.2 Creare documentazione tecnica
    - Documentare schema database e API
    - Creare guida setup sviluppo
    - Aggiungere note su calcolo anno associativo
    - _Requirements: Note tecniche richieste_

## Note

- I task marcati con `*` sono opzionali e possono essere saltati per un MVP più veloce
- Ogni task referenzia i requisiti specifici per tracciabilità
- I checkpoint assicurano validazione incrementale
- I property test validano le proprietà di correttezza universali
- Gli unit test validano esempi specifici e casi limite
- Il sistema implementa controlli di sicurezza e privacy per dati sensibili