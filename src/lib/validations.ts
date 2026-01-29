import { z } from "zod";

// Italian Codice Fiscale regex pattern
const codiceFiscaleRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;

// CAP (Italian postal code) regex pattern
const capRegex = /^\d{5}$/;

export const memberSchema = z.object({
  nome: z.string().min(1, "Nome richiesto").max(50, "Nome troppo lungo"),
  cognome: z.string().min(1, "Cognome richiesto").max(50, "Cognome troppo lungo"),
  codiceFiscale: z.string()
    .length(16, "Codice fiscale deve essere di 16 caratteri")
    .regex(codiceFiscaleRegex, "Formato codice fiscale non valido")
    .transform((val) => val.toUpperCase()),
  dataNascita: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed < new Date();
  }, "Data di nascita non valida"),
  dataIscrizione: z.string().optional(),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  telefono: z.string().optional(),
  indirizzo: z.string().optional(),
  comune: z.string().optional(),
  cap: z.string().regex(capRegex, "CAP deve essere di 5 cifre").optional().or(z.literal("")),
  note: z.string().optional(),
  socioAttivo: z.boolean(),
  stato: z.enum(["attivo", "sospeso", "dimesso"]),
});

export const membershipSchema = z.object({
  memberId: z.string().min(1, "Socio richiesto"),
  quotaImporto: z.number().min(0, "Importo deve essere >= 0"),
  pagato: z.boolean(),
  dataPagamento: z.string().optional(),
  metodoPagamento: z.enum(["contanti", "bonifico", "pos", "altro"]).optional(),
  note: z.string().optional(),
});

export const eventSchema = z.object({
  nome: z.string().min(1, "Nome evento richiesto").max(100, "Nome troppo lungo"),
  localita: z.string().optional(),
  dataInizio: z.string().refine((date) => {
    return !isNaN(new Date(date).getTime());
  }, "Data inizio non valida"),
  dataFine: z.string().refine((date) => {
    return !isNaN(new Date(date).getTime());
  }, "Data fine non valida"),
  stato: z.enum(["pianificato", "confermato", "chiuso"]),
  attrezzaturePreventivo: z.array(z.string()),
  note: z.string().optional(),
}).refine((data) => {
  return new Date(data.dataFine) >= new Date(data.dataInizio);
}, {
  message: "Data fine deve essere >= data inizio",
  path: ["dataFine"],
});

export const eventParticipantSchema = z.object({
  eventId: z.string().min(1, "Evento richiesto"),
  memberId: z.string().min(1, "Socio richiesto"),
  oreEffettiveMinuti: z.number().min(0, "Ore effettive devono essere >= 0"),
  ruolo: z.string().optional(),
  note: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(6, "Password deve essere di almeno 6 caratteri"),
});

export const registerSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(6, "Password deve essere di almeno 6 caratteri"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

// Type exports for form data
export type MemberFormData = z.infer<typeof memberSchema>;
export type MembershipFormData = z.infer<typeof membershipSchema>;
export type EventFormData = z.infer<typeof eventSchema>;
export type EventParticipantFormData = z.infer<typeof eventParticipantSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
