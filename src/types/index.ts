// Core entity types for the ODV Management System

export interface Member {
  _id: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  dataNascita: string;
  email?: string;
  telefono?: string;
  indirizzo?: string;
  comune?: string;
  cap?: string;
  note?: string;
  socioAttivo: boolean;
  stato: "attivo" | "sospeso" | "dimesso";
  createdAt: number;
  updatedAt: number;
}

export interface Membership {
  _id: string;
  memberId: string;
  associationYearLabel: string;
  startYear: number;
  endYear: number;
  quotaImporto: number;
  pagato: boolean;
  dataPagamento?: string;
  metodoPagamento?: "contanti" | "bonifico" | "pos" | "altro";
  scadenza: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Event {
  _id: string;
  nome: string;
  localita?: string;
  dataInizio: string;
  dataFine: string;
  durataMinuti: number;
  stato: "pianificato" | "confermato" | "chiuso";
  attrezzaturePreventivo: string[];
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface EventParticipant {
  _id: string;
  eventId: string;
  memberId: string;
  oreEffettiveMinuti: number;
  ruolo?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  _id: string;
  userId: string;
  role: "admin" | "direttivo" | "socio";
  memberId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuditLog {
  _id: string;
  entityType: "members" | "memberships" | "events" | "eventParticipants";
  entityId: string;
  action: "create" | "update" | "delete";
  actorUserId: string;
  timestamp: number;
  summary: string;
  changes?: unknown;
}

// Form input types (without _id and timestamps)
export type MemberInput = Omit<Member, "_id" | "createdAt" | "updatedAt">;
export type MembershipInput = Omit<Membership, "_id" | "createdAt" | "updatedAt" | "associationYearLabel" | "startYear" | "endYear" | "scadenza">;
export type EventInput = Omit<Event, "_id" | "createdAt" | "updatedAt" | "durataMinuti">;
export type EventParticipantInput = Omit<EventParticipant, "_id" | "createdAt" | "updatedAt">;

// Role type
export type UserRole = "admin" | "direttivo" | "socio";

// Member status type
export type MemberStatus = "attivo" | "sospeso" | "dimesso";

// Event status type
export type EventStatus = "pianificato" | "confermato" | "chiuso";

// Payment method type
export type PaymentMethod = "contanti" | "bonifico" | "pos" | "altro";
