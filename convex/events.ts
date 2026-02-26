/**
 * Event Mutations and Queries for ODV Management System
 *
 * Implements CRUD operations and queries for events with:
 * - RBAC controls (admin/direttivo for mutations, socio can view their events)
 * - Automatic duration calculation from start/end dates
 * - Event status management (pianificato, confermato, chiuso)
 * - Protection for closed events (no modifications)
 * - Equipment list management
 * - Audit logging for all operations
 *
 * Requirements:
 * - Req 6.1: Save all event fields
 * - Req 6.2: Validate dataFine >= dataInizio
 * - Req 6.3: Auto-calculate durataMinuti
 * - Req 6.4: Protect closed events from modifications
 * - Req 7.3: Aggregate participant counts and total hours
 * - Req 9.2: Only admin/direttivo can create/update/delete events
 * - Req 11.2: Log event operations
 */

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  requireAdminOrDirettivo,
  requireAuth,
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
 * Creates an audit log entry for system-level operations (e.g., cron jobs)
 * that don't have a user authentication context.
 *
 * Finds the first admin user to use as the actor. If no admin user is found,
 * the audit log is silently skipped.
 */
async function createSystemAuditLog(
  ctx: MutationCtx,
  params: AuditLogParams
): Promise<Id<"auditLogs"> | null> {
  // Find an admin profile to use as the system actor
  const adminProfile = await ctx.db
    .query("profiles")
    .withIndex("by_role", (q) => q.eq("role", "admin"))
    .first();

  if (!adminProfile) {
    // No admin user found — skip audit log
    return null;
  }

  return await ctx.db.insert("auditLogs", {
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    actorUserId: adminProfile.userId,
    timestamp: Date.now(),
    summary: params.summary,
    changes: params.changes,
  });
}


/**
 * Calculates duration in minutes between two ISO datetime strings.
 *
 * Requirements:
 * - Req 6.3: Auto-calculate durataMinuti
 *
 * @param dataInizio - Start datetime ISO string
 * @param dataFine - End datetime ISO string
 * @returns Duration in minutes
 */
function calculateDurationMinutes(dataInizio: string, dataFine: string): number {
  const start = new Date(dataInizio);
  const end = new Date(dataFine);
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60));
}

/**
 * Validates that dataFine >= dataInizio.
 *
 * Requirements:
 * - Req 6.2: Validate dataFine >= dataInizio
 *
 * @param dataInizio - Start datetime ISO string
 * @param dataFine - End datetime ISO string
 * @throws Error if dataFine < dataInizio
 */
function validateDates(dataInizio: string, dataFine: string): void {
  const start = new Date(dataInizio);
  const end = new Date(dataFine);
  
  if (end < start) {
    throw new Error("La data di fine deve essere successiva o uguale alla data di inizio");
  }
}

/**
 * Validates that an event is not closed before allowing modifications.
 *
 * Requirements:
 * - Req 6.4: Protect closed events from modifications
 *
 * @param event - The event document
 * @throws Error if event is closed
 */
function validateNotClosed(event: Doc<"events">): void {
  if (event.stato === "chiuso") {
    throw new Error("Non è possibile modificare un evento chiuso");
  }
}

/**
 * Calculates changes between old and new event data for audit logging.
 */
function calculateEventChanges(
  oldData: Doc<"events">,
  newData: Partial<Doc<"events">>
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  const fieldsToCheck = [
    "nome",
    "localita",
    "dataInizio",
    "dataFine",
    "stato",
    "attrezzaturePreventivo",
    "note",
  ] as const;

  for (const field of fieldsToCheck) {
    if (field in newData && JSON.stringify(newData[field]) !== JSON.stringify(oldData[field])) {
      changes[field] = {
        old: oldData[field],
        new: newData[field],
      };
    }
  }

  return changes;
}

/**
 * Allowed state transitions map.
 * Defines which target states are reachable from each current state.
 *
 * Requirements:
 * - Req 1.1: pianificato → confermato, confermato → chiuso, pianificato → chiuso
 * - Req 1.2: All other transitions are rejected
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pianificato: ["confermato", "chiuso"],
  confermato: ["chiuso"],
  chiuso: [],
};


// ============================================================================
// Mutations
// ============================================================================

/**
 * Creates a new event.
 *
 * Requirements:
 * - Req 6.1: Save all event fields
 * - Req 6.2: Validate dataFine >= dataInizio
 * - Req 6.3: Auto-calculate durataMinuti
 * - Req 9.2: Only admin/direttivo can create events
 * - Req 11.2: Log event creation
 */
export const createEvent = mutation({
  args: {
    nome: v.string(),
    localita: v.optional(v.string()),
    dataInizio: v.string(),
    dataFine: v.string(),
    stato: v.optional(v.union(
      v.literal("pianificato"),
      v.literal("confermato"),
      v.literal("chiuso")
    )),
    attrezzaturePreventivo: v.optional(v.array(v.string())),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check permissions
    await requireAdminOrDirettivo(ctx);

    // Validate dates (Req 6.2)
    validateDates(args.dataInizio, args.dataFine);

    // Calculate duration (Req 6.3)
    const durataMinuti = calculateDurationMinutes(args.dataInizio, args.dataFine);

    const now = Date.now();

    // Create the event (Req 6.1)
    const eventId = await ctx.db.insert("events", {
      nome: args.nome,
      localita: args.localita,
      dataInizio: args.dataInizio,
      dataFine: args.dataFine,
      durataMinuti,
      stato: args.stato ?? "pianificato",
      attrezzaturePreventivo: args.attrezzaturePreventivo ?? [],
      note: args.note,
      createdAt: now,
      updatedAt: now,
    });

    // Create audit log entry (Req 11.2)
    await createAuditLog(ctx, {
      entityType: "events",
      entityId: eventId,
      action: "create",
      summary: `Creato evento "${args.nome}" (${args.dataInizio})`,
    });

    return eventId;
  },
});

/**
 * Updates an existing event.
 *
 * Requirements:
 * - Req 6.2: Validate dataFine >= dataInizio if dates are updated
 * - Req 6.3: Recalculate durataMinuti if dates change
 * - Req 6.4: Protect closed events from modifications
 * - Req 9.2: Only admin/direttivo can update events
 * - Req 11.2: Log event updates with changes
 */
export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    nome: v.optional(v.string()),
    localita: v.optional(v.string()),
    dataInizio: v.optional(v.string()),
    dataFine: v.optional(v.string()),
    stato: v.optional(v.union(
      v.literal("pianificato"),
      v.literal("confermato"),
      v.literal("chiuso")
    )),
    attrezzaturePreventivo: v.optional(v.array(v.string())),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check permissions
    await requireAdminOrDirettivo(ctx);

    // Get existing event
    const existingEvent = await ctx.db.get(args.eventId);
    if (!existingEvent) {
      throw new Error("Evento non trovato");
    }

    // Validate not closed (Req 6.4, Req 1.4)
    // All modifications are rejected for closed events.
    // State transitions must go through updateEventStatus.
    validateNotClosed(existingEvent);

    // Build update object
    const updateData: Partial<Doc<"events">> = {
      updatedAt: Date.now(),
    };

    if (args.nome !== undefined) updateData.nome = args.nome;
    if (args.localita !== undefined) updateData.localita = args.localita;
    if (args.stato !== undefined) updateData.stato = args.stato;
    if (args.attrezzaturePreventivo !== undefined) updateData.attrezzaturePreventivo = args.attrezzaturePreventivo;
    if (args.note !== undefined) updateData.note = args.note;

    // Handle date updates
    const newDataInizio = args.dataInizio ?? existingEvent.dataInizio;
    const newDataFine = args.dataFine ?? existingEvent.dataFine;

    if (args.dataInizio !== undefined || args.dataFine !== undefined) {
      // Validate dates (Req 6.2)
      validateDates(newDataInizio, newDataFine);
      
      // Recalculate duration (Req 6.3)
      updateData.durataMinuti = calculateDurationMinutes(newDataInizio, newDataFine);
      
      if (args.dataInizio !== undefined) updateData.dataInizio = args.dataInizio;
      if (args.dataFine !== undefined) updateData.dataFine = args.dataFine;
    }

    // Calculate changes for audit log
    const changes = calculateEventChanges(existingEvent, updateData);

    // Update the event
    await ctx.db.patch(args.eventId, updateData);

    // Create audit log entry (Req 11.2)
    const changedFields = Object.keys(changes).join(", ");
    await createAuditLog(ctx, {
      entityType: "events",
      entityId: args.eventId,
      action: "update",
      summary: `Aggiornato evento "${existingEvent.nome}"${changedFields ? ` (campi: ${changedFields})` : ""}`,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
    });

    return await ctx.db.get(args.eventId);
  },
});

/**
 * Closes an event.
 *
 * Sets stato to "chiuso". Only admin/direttivo can close events.
 *
 * Requirements:
 * - Req 6.4: Close event functionality
 * - Req 9.2: Only admin/direttivo can close events
 * - Req 11.2: Log event closure
 */
export const closeEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Check permissions
    await requireAdminOrDirettivo(ctx);

    // Get existing event
    const existingEvent = await ctx.db.get(args.eventId);
    if (!existingEvent) {
      throw new Error("Evento non trovato");
    }

    if (existingEvent.stato === "chiuso") {
      throw new Error("L'evento è già chiuso");
    }

    // Close the event
    await ctx.db.patch(args.eventId, {
      stato: "chiuso",
      updatedAt: Date.now(),
    });

    // Create audit log entry
    await createAuditLog(ctx, {
      entityType: "events",
      entityId: args.eventId,
      action: "update",
      summary: `Chiuso evento "${existingEvent.nome}"`,
      changes: {
        stato: {
          old: existingEvent.stato,
          new: "chiuso",
        },
      },
    });

    return await ctx.db.get(args.eventId);
  },
});

/**
 * Updates the status of an event following allowed transitions.
 *
 * Requirements:
 * - Req 1.1: Allow pianificato→confermato, confermato→chiuso, pianificato→chiuso
 * - Req 1.2: Reject invalid transitions with descriptive error
 * - Req 1.3: Log transition in audit log
 */
export const updateEventStatus = mutation({
  args: {
    eventId: v.id("events"),
    newStatus: v.union(
      v.literal("confermato"),
      v.literal("chiuso")
    ),
  },
  handler: async (ctx, args) => {
    // Check permissions
    await requireAdminOrDirettivo(ctx);

    // Fetch event
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Evento non trovato");
    }

    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[event.stato] ?? [];
    if (!allowed.includes(args.newStatus)) {
      throw new Error(
        `Transizione non consentita: da ${event.stato} a ${args.newStatus}`
      );
    }

    const now = Date.now();

    // Patch event
    await ctx.db.patch(args.eventId, {
      stato: args.newStatus,
      updatedAt: now,
    });

    // Create audit log
    await createAuditLog(ctx, {
      entityType: "events",
      entityId: args.eventId,
      action: "update",
      summary: `Stato cambiato da ${event.stato} a ${args.newStatus}`,
      changes: {
        stato: {
          old: event.stato,
          new: args.newStatus,
        },
      },
    });

    return await ctx.db.get(args.eventId);
  },
});

/**
 * Auto-closes expired confirmed events.
 *
 * Called by the cron job to find all events with stato "confermato"
 * whose dataFine has passed, and transitions them to "chiuso".
 *
 * Requirements:
 * - Req 4.1: Periodic check on confirmed events
 * - Req 4.2: Close events whose dataFine < now
 * - Req 4.3: Log automatic closure in audit log
 * - Req 4.4: Continue on individual errors
 */
export const autoCloseExpiredEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    const nowTimestamp = Date.now();

    // Query confirmed events using by_stato index
    const confirmedEvents = await ctx.db
      .query("events")
      .withIndex("by_stato", (q) => q.eq("stato", "confermato"))
      .collect();

    // Filter: dataFine < now (ISO string comparison)
    const expiredEvents = confirmedEvents.filter(
      (e) => e.dataFine < now
    );

    let closedCount = 0;
    const errors: Array<{ eventId: string; error: string }> = [];

    for (const event of expiredEvents) {
      try {
        // Patch stato to "chiuso" and update timestamp
        await ctx.db.patch(event._id, {
          stato: "chiuso" as const,
          updatedAt: nowTimestamp,
        });

        // Create audit log entry for automatic closure
        await createSystemAuditLog(ctx, {
          entityType: "events",
          entityId: event._id,
          action: "update",
          summary: `Auto-chiusura: evento scaduto "${event.nome}"`,
          changes: {
            stato: {
              old: "confermato",
              new: "chiuso",
            },
          },
        });

        closedCount++;
      } catch (error) {
        // Log error and continue with next event (Req 4.4)
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ eventId: event._id, error: errorMessage });
        console.error(
          `Auto-chiusura fallita per evento ${event._id}: ${errorMessage}`
        );
      }
    }

    return { closedCount, errors };
  },
});



/**
 * Deletes an event and all associated participations.
 *
 * Requirements:
 * - Req 6.4: Cannot delete closed events
 * - Req 9.2: Only admin/direttivo can delete events
 * - Req 11.2: Log event deletion
 */
export const deleteEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Check permissions
    await requireAdminOrDirettivo(ctx);

    // Get existing event
    const existingEvent = await ctx.db.get(args.eventId);
    if (!existingEvent) {
      throw new Error("Evento non trovato");
    }

    // Validate not closed (Req 6.4)
    validateNotClosed(existingEvent);

    // Delete all participations for this event
    const participations = await ctx.db
      .query("eventParticipants")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const participation of participations) {
      await ctx.db.delete(participation._id);
    }

    // Delete the event
    await ctx.db.delete(args.eventId);

    // Create audit log entry
    await createAuditLog(ctx, {
      entityType: "events",
      entityId: args.eventId,
      action: "delete",
      summary: `Eliminato evento "${existingEvent.nome}" (${existingEvent.dataInizio}) con ${participations.length} partecipazioni`,
    });

    return { success: true, deletedParticipations: participations.length };
  },
});

// ============================================================================
// Queries
// ============================================================================

/**
 * Gets a single event by ID with participant aggregates.
 *
 * Requirements:
 * - Req 7.3: Include participant count and total hours
 */
export const getEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      return null;
    }

    // Get participant aggregates
    const participants = await ctx.db
      .query("eventParticipants")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const totalOreMinuti = participants.reduce(
      (sum, p) => sum + p.oreEffettiveMinuti,
      0
    );

    return {
      ...event,
      participantCount: participants.length,
      totalOreMinuti,
      totalOre: Math.round((totalOreMinuti / 60) * 100) / 100,
    };
  },
});

/**
 * Lists events with optional filters.
 *
 * Filters:
 * - stato: Filter by event status
 * - fromDate: Filter events starting from this date
 * - toDate: Filter events ending before this date
 *
 * Returns events sorted by dataInizio descending (most recent first).
 */
export const listEvents = query({
  args: {
    stato: v.optional(v.union(
      v.literal("pianificato"),
      v.literal("confermato"),
      v.literal("chiuso")
    )),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let eventsQuery;

    if (args.stato) {
      eventsQuery = ctx.db
        .query("events")
        .withIndex("by_stato", (q) => q.eq("stato", args.stato!));
    } else {
      eventsQuery = ctx.db.query("events");
    }

    let events = await eventsQuery.collect();

    // Apply date filters
    if (args.fromDate) {
      events = events.filter((e) => e.dataInizio >= args.fromDate!);
    }
    if (args.toDate) {
      events = events.filter((e) => e.dataInizio <= args.toDate!);
    }

    // Sort by dataInizio descending
    events.sort((a, b) => b.dataInizio.localeCompare(a.dataInizio));

    // Apply limit
    if (args.limit) {
      events = events.slice(0, args.limit);
    }

    // Add participant counts
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const participants = await ctx.db
          .query("eventParticipants")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        const totalOreMinuti = participants.reduce(
          (sum, p) => sum + p.oreEffettiveMinuti,
          0
        );

        return {
          ...event,
          participantCount: participants.length,
          totalOreMinuti,
          totalOre: Math.round((totalOreMinuti / 60) * 100) / 100,
        };
      })
    );

    return eventsWithCounts;
  },
});

/**
 * Gets upcoming events (not closed, starting from today).
 */
export const getUpcomingEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];

    const events = await ctx.db
      .query("events")
      .collect();

    // Filter upcoming events (not closed, starting from today)
    const upcomingEvents = events
      .filter((e) => e.stato !== "chiuso" && e.dataInizio >= today)
      .sort((a, b) => a.dataInizio.localeCompare(b.dataInizio));

    const limitedEvents = args.limit
      ? upcomingEvents.slice(0, args.limit)
      : upcomingEvents;

    // Add participant counts
    return Promise.all(
      limitedEvents.map(async (event) => {
        const participants = await ctx.db
          .query("eventParticipants")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        return {
          ...event,
          participantCount: participants.length,
        };
      })
    );
  },
});

/**
 * Gets event count by status for dashboard.
 */
export const getEventStats = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();

    const stats = {
      total: events.length,
      pianificato: 0,
      confermato: 0,
      chiuso: 0,
    };

    for (const event of events) {
      stats[event.stato]++;
    }

    return stats;
  },
});

/**
 * Lists closed events for a specific month with participant counts.
 *
 * Uses the `by_stato` index to query only closed events, then filters
 * in-memory by `dataInizio` falling within the specified month range.
 * Results are sorted by `dataInizio` ascending.
 *
 * Requirements:
 * - Req 7.1: Query by year and month, return closed events in that month
 * - Req 7.2: Sort results by dataInizio ascending
 * - Req 7.3: Include nome, dataInizio, dataFine, localita, durataMinuti, participantCount
 */
export const listClosedEventsByMonth = query({
  args: {
    year: v.number(),
    month: v.number(), // 1-12
  },
  handler: async (ctx, args) => {
    // Calculate month range as ISO strings for string comparison
    const monthStr = String(args.month).padStart(2, "0");
    const startOfMonth = `${args.year}-${monthStr}-01T00:00:00`;

    // Calculate start of next month
    let nextYear = args.year;
    let nextMonth = args.month + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const nextMonthStr = String(nextMonth).padStart(2, "0");
    const startOfNextMonth = `${nextYear}-${nextMonthStr}-01T00:00:00`;

    // Query closed events using by_stato index
    const closedEvents = await ctx.db
      .query("events")
      .withIndex("by_stato", (q) => q.eq("stato", "chiuso"))
      .collect();

    // Filter in-memory: dataInizio within the specified month
    const eventsInMonth = closedEvents.filter(
      (e) => e.dataInizio >= startOfMonth && e.dataInizio < startOfNextMonth
    );

    // Sort by dataInizio ascending
    eventsInMonth.sort((a, b) => a.dataInizio.localeCompare(b.dataInizio));

    // Count participants for each event
    const results = await Promise.all(
      eventsInMonth.map(async (event) => {
        const participants = await ctx.db
          .query("eventParticipants")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        return {
          _id: event._id,
          nome: event.nome,
          dataInizio: event.dataInizio,
          dataFine: event.dataFine,
          localita: event.localita,
          durataMinuti: event.durataMinuti,
          participantCount: participants.length,
        };
      })
    );

    return results;
  },
});


