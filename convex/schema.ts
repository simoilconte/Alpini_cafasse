import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  // Ruoli dinamici
  roles: defineTable({
    name: v.string(), // Nome tecnico: "admin", "direttivo", "socio"
    displayName: v.string(), // Nome visualizzato: "Amministratore", "Direttivo", "Socio"
    description: v.optional(v.string()),
    permissions: v.array(v.string()), // Lista permessi: ["users:read", "users:write", "members:read", etc.]
    isSystem: v.boolean(), // true = non eliminabile (admin, socio)
    sortOrder: v.number(), // Ordine visualizzazione
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_sort_order", ["sortOrder"]),

  // Status associativi (ruoli interni all'associazione)
  memberStatuses: defineTable({
    name: v.string(), // Nome: "Presidente", "Vicepresidente", etc.
    description: v.optional(v.string()),
    color: v.optional(v.string()), // Colore badge (hex)
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_sort_order", ["sortOrder"])
    .index("by_active", ["isActive"]),
  
  // Profili utente collegati all'autenticazione
  profiles: defineTable({
    userId: v.id("users"), // Collegamento a Convex Auth
    roleId: v.optional(v.id("roles")), // Riferimento alla tabella roles
    role: v.string(), // Nome ruolo (per retrocompatibilità)
    memberId: v.optional(v.id("members")), // Solo per ruolo "socio"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_member", ["memberId"])
    .index("by_role", ["role"])
    .index("by_role_id", ["roleId"]),

  // Anagrafica soci
  members: defineTable({
    nome: v.string(),
    cognome: v.string(),
    codiceFiscale: v.string(),
    dataNascita: v.string(), // ISO date string
    sesso: v.optional(v.union(v.literal("M"), v.literal("F"))),
    luogoNascita: v.optional(v.string()), // Nome comune
    codiceCatastale: v.optional(v.string()), // Codice catastale comune
    email: v.optional(v.string()),
    telefono: v.optional(v.string()),
    indirizzo: v.optional(v.string()),
    comune: v.optional(v.string()),
    cap: v.optional(v.string()),
    note: v.optional(v.string()),
    socioAttivo: v.boolean(),
    stato: v.union(
      v.literal("attivo"),
      v.literal("sospeso"),
      v.literal("dimesso")
    ),
    statusId: v.optional(v.id("memberStatuses")), // Status associativo (Presidente, etc.)
    dataIscrizione: v.optional(v.string()), // Data iscrizione all'associazione (ISO date)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_codice_fiscale", ["codiceFiscale"])
    .index("by_socio_attivo", ["socioAttivo"])
    .index("by_stato", ["stato"])
    .index("by_nome_cognome", ["nome", "cognome"])
    .index("by_status", ["statusId"]),

  // Tessere annuali
  memberships: defineTable({
    memberId: v.id("members"),
    associationYearLabel: v.string(), // "2025/2026"
    startYear: v.number(), // 2025
    endYear: v.number(), // 2026
    quotaImporto: v.number(),
    pagato: v.boolean(),
    dataPagamento: v.optional(v.string()), // ISO date string
    metodoPagamento: v.optional(v.union(
      v.literal("contanti"),
      v.literal("bonifico"),
      v.literal("pos"),
      v.literal("altro")
    )),
    scadenza: v.string(), // ISO date string, default 31/08 endYear
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_member", ["memberId"])
    .index("by_year", ["startYear", "endYear"])
    .index("by_pagato", ["pagato"])
    .index("by_scadenza", ["scadenza"])
    .index("by_member_year", ["memberId", "startYear"]),

  // Eventi
  events: defineTable({
    nome: v.string(),
    localita: v.optional(v.string()),
    dataInizio: v.string(), // ISO datetime string
    dataFine: v.string(), // ISO datetime string
    durataMinuti: v.number(), // Calcolato automaticamente
    stato: v.union(
      v.literal("pianificato"),
      v.literal("confermato"),
      v.literal("chiuso")
    ),
    attrezzaturePreventivo: v.array(v.string()),
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_stato", ["stato"])
    .index("by_data_inizio", ["dataInizio"])
    .index("by_data_fine", ["dataFine"]),

  // Partecipazioni eventi
  eventParticipants: defineTable({
    eventId: v.id("events"),
    memberId: v.id("members"),
    oreEffettiveMinuti: v.number(), // Default = durataMinuti evento
    ruolo: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_member", ["memberId"])
    .index("by_event_member", ["eventId", "memberId"]),

  // Famiglie beneficiarie (Borse spesa)
  beneficiaryFamilies: defineTable({
    referenteNome: v.string(),
    referenteCognome: v.string(),
    componentiNucleo: v.number(), // Totale persone nel nucleo
    deliveryLocation: v.optional(v.string()), // Comune di consegna
    attiva: v.boolean(),
    note: v.optional(v.string()), // es. "2 bambini", "anziani"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_attiva", ["attiva"])
    .index("by_cognome", ["referenteCognome"])
    .index("by_attiva_cognome", ["attiva", "referenteCognome"])
    .index("by_delivery_location", ["deliveryLocation"]),

  // Consegne borse spesa
  bagDeliveries: defineTable({
    familyId: v.id("beneficiaryFamilies"),
    deliveredAt: v.number(), // Timestamp consegna
    deliveryDate: v.string(), // "YYYY-MM-DD" in Europe/Rome
    operatorUserId: v.id("users"),
    notes: v.optional(v.string()), // es. "messi ovetti kinder"
    emptyBagReturned: v.boolean(), // Default false
    emptyBagReturnedAt: v.optional(v.number()), // Timestamp reso
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_family", ["familyId"])
    .index("by_family_delivered", ["familyId", "deliveredAt"])
    .index("by_delivery_date", ["deliveryDate"])
    .index("by_family_date", ["familyId", "deliveryDate"])
    .index("by_empty_bag_returned", ["emptyBagReturned"]),

  // Impostazioni app
  appSettings: defineTable({
    key: v.string(), // Chiave univoca setting
    value: v.any(), // Valore (può essere array, object, etc.)
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_key", ["key"]),

  // Ubicazioni magazzino
  warehouseLocations: defineTable({
    nome: v.string(),
    descrizione: v.optional(v.string()),
    attiva: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_nome", ["nome"])
    .index("by_attiva", ["attiva"]),

  // Stati attrezzatura
  equipmentStatuses: defineTable({
    nome: v.string(),
    descrizione: v.optional(v.string()),
    attivo: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_nome", ["nome"])
    .index("by_attivo", ["attivo"]),

  // Attrezzature
  equipment: defineTable({
    nome: v.string(),
    codice: v.optional(v.string()), // Seriale/inventario
    ubicazioneId: v.id("warehouseLocations"),
    statoId: v.id("equipmentStatuses"),
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_nome", ["nome"])
    .index("by_codice", ["codice"])
    .index("by_ubicazione", ["ubicazioneId"])
    .index("by_stato", ["statoId"]),

  // Audit log per tracciabilità
  auditLogs: defineTable({
    entityType: v.union(
      v.literal("members"),
      v.literal("memberships"),
      v.literal("events"),
      v.literal("eventParticipants")
    ),
    entityId: v.string(),
    action: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete")
    ),
    actorUserId: v.id("users"),
    timestamp: v.number(),
    summary: v.string(), // Descrizione dell'operazione
    changes: v.optional(v.any()), // Diff delle modifiche
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_actor", ["actorUserId"])
    .index("by_timestamp", ["timestamp"]),
});

export default schema;
