/**
 * Event Participants Mutations and Queries for ODV Management System
 *
 * Implements CRUD operations for event participations with:
 * - RBAC controls (admin/direttivo for mutations)
 * - Automatic initialization of effective hours from event duration
 * - Validation that event is not closed before modifications
 * - Aggregate calculations (participant count, total hours)
 * - Audit logging for all operations
 *
 * Requirements:
 * - Req 7.1: Save participation fields (eventId, memberId, oreEffettiveMinuti, ruolo, note)
 * - Req 7.2: Default oreEffettiveMinuti to event durataMinuti
 * - Req 7.3: Calculate aggregates (participant count, total hours)
 * - Req 7.4: Validate event not closed before modifications
 * - Req 9.2: Only admin/direttivo can manage participations
 * - Req 9.3: Socio can view their own participations
 * - Req 11.2: Log participation operations
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  requireAdminOrDirettivo,
  requireAuth,
  getOptionalProfile,
} from "./lib/auth";

// ============================================================================
// Types
// ============================================================================

type EntityType = "members" | "memberships" | "events" | "eventParticipants";
type ActionType = "create" | "update" | "delete";

interface AuditLogParams {
  entityType: EntityType;
  entityId: string;
  action: ActionType;
  summary: string;
  changes?: Record<string, unknown>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates an audit log entry for tracking changes.
 */
async function createAuditLog(
  ctx: MutationCtx,
  params: AuditLogParams
): Promise<Id<"auditLogs">> {
  const { userId } = await requireAuth(ctx);

  return await ctx.db.insert("auditLogs", {
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    actorUserId: userId,
    timestamp: Date.now(),
    summary: params.summary,
    changes: params.changes,
  });
}

/**
 * Validates that an event exists and is not closed.
 *
 * Requirements:
 * - Req 7.4: Validate event not closed before modifications
 *
 * @param ctx - Mutation context
 * @param eventId - The event ID to validate
 * @returns The event document
 * @throws Error if event not found or is closed
 */
async function validateEventForModification(
  ctx: MutationCtx,
  eventId: Id<"events">
): Promise<Doc<"events">> {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Evento non trovato");
  }
  if (event.stato === "chiuso") {
    throw new Error("Non è possibile modificare le partecipazioni di un evento chiuso");
  }
  return event;
}

/**
 * Validates that a member exists.
 *
 * @param ctx - Mutation context
 * @param memberId - The member ID to validate
 * @returns The member document
 * @throws Error if member not found
 */
async function validateMemberExists(
  ctx: MutationCtx,
  memberId: Id<"members">
): Promise<Doc<"members">> {
  const member = await ctx.db.get(memberId);
  if (!member) {
    throw new Error("Socio non trovato");
  }
  return member;
}

/**
 * Checks if a participation already exists for the same event and member.
 *
 * @param ctx - Mutation context
 * @param eventId - The event ID
 * @param memberId - The member ID
 * @throws Error if duplicate participation exists
 */
async function validateNoDuplicateParticipation(
  ctx: MutationCtx,
  eventId: Id<"events">,
  memberId: Id<"members">
): Promise<void> {
  const existing = await ctx.db
    .query("eventParticipants")
    .withIndex("by_event_member", (q) =>
      q.eq("eventId", eventId).eq("memberId", memberId)
    )
    .unique();

  if (existing) {
    throw new Error("Il socio è già partecipante a questo evento");
  }
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Adds a participant to an event.
 *
 * Requirements:
 * - Req 7.1: Save participation fields
 * - Req 7.2: Default oreEffettiveMinuti to event durataMinuti
 * - Req 7.4: Validate event not closed
 * - Req 9.2: Only admin/direttivo can add participants
 * - Req 11.2: Log participation creation
 */
export const addParticipant = mutation({
  args: {
    eventId: v.id("events"),
    memberId: v.id("members"),
    oreEffettiveMinuti: v.optional(v.number()),
    ruolo: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check permissions
    await requireAdminOrDirettivo(ctx);

    // Validate event exists and is not closed (Req 7.4)
    const event = await validateEventForModification(ctx, args.eventId);

    // Validate member exists
    const member = await validateMemberExists(ctx, args.memberId);

    // Check for duplicate participation
    await validateNoDuplicateParticipation(ctx, args.eventId, args.memberId);

    // Default oreEffettiveMinuti to event duration (Req 7.2)
    const oreEffettiveMinuti = args.oreEffettiveMinuti ?? event.durataMinuti;

    const now = Date.now();

    // Create the participation (Req 7.1)
    const participantId = await ctx.db.insert("eventParticipants", {
      eventId: args.eventId,
      memberId: args.memberId,
      oreEffettiveMinuti,
      ruolo: args.ruolo,
      note: args.note,
      createdAt: now,
      updatedAt: now,
    });

    // Create audit log entry (Req 11.2)
    await createAuditLog(ctx, {
      entityType: "eventParticipants",
      entityId: participantId,
      action: "create",
      summary: `Aggiunto ${member.nome} ${member.cognome} all'evento "${event.nome}"`,
    });

    return participantId;
  },
});

/**
 * Updates a participant's information.
 *
 * Requirements:
 * - Req 7.4: Validate event not closed
 * - Req 9.2: Only admin/direttivo can update participants
 * - Req 11.2: Log participation updates
 */
export const updateParticipant = mutation({
  args: {
    participantId: v.id("eventParticipants"),
    oreEffettiveMinuti: v.optional(v.number()),
    ruolo: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check permissions
    await requireAdminOrDirettivo(ctx);

    // Get existing participation
    const existingParticipation = await ctx.db.get(args.participantId);
    if (!existingParticipation) {
      throw new Error("Partecipazione non trovata");
    }

    // Validate event is not closed (Req 7.4)
    const event = await validateEventForModification(ctx, existingParticipation.eventId);

    // Get member for audit log
    const member = await ctx.db.get(existingParticipation.memberId);

    // Build update object
    const updateData: Partial<Doc<"eventParticipants">> = {
      updatedAt: Date.now(),
    };

    if (args.oreEffettiveMinuti !== undefined) updateData.oreEffettiveMinuti = args.oreEffettiveMinuti;
    if (args.ruolo !== undefined) updateData.ruolo = args.ruolo;
    if (args.note !== undefined) updateData.note = args.note;

    // Update the participation
    await ctx.db.patch(args.participantId, updateData);

    // Create audit log entry (Req 11.2)
    const memberName = member ? `${member.nome} ${member.cognome}` : "socio sconosciuto";
    await createAuditLog(ctx, {
      entityType: "eventParticipants",
      entityId: args.participantId,
      action: "update",
      summary: `Aggiornata partecipazione di ${memberName} all'evento "${event.nome}"`,
    });

    return await ctx.db.get(args.participantId);
  },
});

/**
 * Removes a participant from an event.
 *
 * Requirements:
 * - Req 7.4: Validate event not closed
 * - Req 9.2: Only admin/direttivo can remove participants
 * - Req 11.2: Log participation removal
 */
export const removeParticipant = mutation({
  args: {
    participantId: v.id("eventParticipants"),
  },
  handler: async (ctx, args) => {
    // Check permissions
    await requireAdminOrDirettivo(ctx);

    // Get existing participation
    const existingParticipation = await ctx.db.get(args.participantId);
    if (!existingParticipation) {
      throw new Error("Partecipazione non trovata");
    }

    // Validate event is not closed (Req 7.4)
    const event = await validateEventForModification(ctx, existingParticipation.eventId);

    // Get member for audit log
    const member = await ctx.db.get(existingParticipation.memberId);

    // Delete the participation
    await ctx.db.delete(args.participantId);

    // Create audit log entry (Req 11.2)
    const memberName = member ? `${member.nome} ${member.cognome}` : "socio sconosciuto";
    await createAuditLog(ctx, {
      entityType: "eventParticipants",
      entityId: args.participantId,
      action: "delete",
      summary: `Rimosso ${memberName} dall'evento "${event.nome}"`,
    });

    return { success: true };
  },
});

// ============================================================================
// Queries
// ============================================================================

/**
 * Gets all participants for an event with member details.
 *
 * Requirements:
 * - Req 7.3: Include participant count and total hours
 */
export const getEventParticipants = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("eventParticipants")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Enrich with member data
    const participantsWithMembers = await Promise.all(
      participants.map(async (p) => {
        const member = await ctx.db.get(p.memberId);
        return {
          ...p,
          memberName: member ? `${member.nome} ${member.cognome}` : "Socio sconosciuto",
          memberEmail: member?.email,
          memberTelefono: member?.telefono,
        };
      })
    );

    // Sort by member name
    return participantsWithMembers.sort((a, b) =>
      a.memberName.localeCompare(b.memberName)
    );
  },
});

/**
 * Gets all participations for a member.
 *
 * Permission checks:
 * - Admin/direttivo can view any member's participations
 * - Socio can only view their own participations
 *
 * Requirements:
 * - Req 9.3: Socio can view their own participations
 */
export const getParticipationsByMember = query({
  args: {
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    // Check permissions
    const profile = await getOptionalProfile(ctx);
    
    if (profile?.role === "socio") {
      // Socio can only view their own participations
      if (profile.memberId !== args.memberId) {
        throw new Error("Accesso negato");
      }
    }

    const participations = await ctx.db
      .query("eventParticipants")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    // Enrich with event data
    const participationsWithEvents = await Promise.all(
      participations.map(async (p) => {
        const event = await ctx.db.get(p.eventId);
        return {
          ...p,
          eventName: event?.nome ?? "Evento sconosciuto",
          eventDate: event?.dataInizio,
          eventStato: event?.stato,
        };
      })
    );

    // Sort by event date descending
    return participationsWithEvents.sort((a, b) =>
      (b.eventDate ?? "").localeCompare(a.eventDate ?? "")
    );
  },
});

/**
 * Gets aggregate statistics for an event's participants.
 *
 * Requirements:
 * - Req 7.3: Calculate aggregates (participant count, total hours)
 */
export const getEventParticipantStats = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("eventParticipants")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const totalOreMinuti = participants.reduce(
      (sum, p) => sum + p.oreEffettiveMinuti,
      0
    );

    return {
      participantCount: participants.length,
      totalOreMinuti,
      totalOre: Math.round((totalOreMinuti / 60) * 100) / 100,
    };
  },
});

/**
 * Gets members who are not yet participants of an event.
 * Useful for the "add participant" dropdown.
 */
export const getAvailableMembers = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Get all active members
    const allMembers = await ctx.db
      .query("members")
      .withIndex("by_socio_attivo", (q) => q.eq("socioAttivo", true))
      .collect();

    // Get existing participants
    const existingParticipants = await ctx.db
      .query("eventParticipants")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const participantMemberIds = new Set(
      existingParticipants.map((p) => p.memberId)
    );

    // Filter out members who are already participants
    const availableMembers = allMembers.filter(
      (m) => !participantMemberIds.has(m._id)
    );

    // Return minimal data for dropdown
    return availableMembers.map((m) => ({
      _id: m._id,
      nome: m.nome,
      cognome: m.cognome,
      fullName: `${m.nome} ${m.cognome}`,
    }));
  },
});
