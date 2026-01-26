/**
 * Membership Mutations and Queries for ODV Management System
 *
 * Implements CRUD operations and queries for memberships (tessere annuali) with:
 * - RBAC controls (admin/direttivo only for mutations)
 * - Automatic association year calculation
 * - Automatic expiration date calculation (August 31st of endYear)
 * - Validation (quotaImporto >= 0, member exists, no duplicates)
 * - "Mark as paid" functionality with auto-date
 * - Audit logging for all operations
 * - Dashboard statistics for membership status
 *
 * Requirements:
 * - Req 4.1: Save all membership fields
 * - Req 4.2: Validate quotaImporto >= 0
 * - Req 4.3: Auto-set dataPagamento when marking as paid
 * - Req 4.4: Show current membership and history for a member
 * - Req 4.5: Auto-calculate scadenza as August 31st of endYear
 * - Req 5.1: Count unpaid memberships for current year
 * - Req 5.2: Count memberships expiring within 30 days
 * - Req 5.3: Count expired memberships
 * - Req 9.2: Only admin/direttivo can create/update/delete memberships
 * - Req 9.3: Socio can only view their own memberships
 * - Req 11.2: Log membership operations
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  requireAdminOrDirettivo,
  requireAuth,
  canReadMember,
} from "./lib/auth";
import { calculateAssociationYear, getAssociationYearEndISO, getAssociationYearLabel } from "./lib/associationYear";

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
 *
 * Requirements:
 * - Req 11.2: Log membership operations
 * - Req 11.3: Include entityType, entityId, action, actorUserId, timestamp, summary
 *
 * @param ctx - Mutation context
 * @param params - Audit log parameters
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
 * Validates that quotaImporto is >= 0.
 *
 * Requirements:
 * - Req 4.2: Validate quotaImporto >= 0
 *
 * @param quotaImporto - The amount to validate
 * @throws Error if quotaImporto is negative
 */
function validateQuotaImporto(quotaImporto: number): void {
  if (quotaImporto < 0) {
    throw new Error("L'importo della quota deve essere >= 0");
  }
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
 * Checks if a membership already exists for the same member and year.
 *
 * @param ctx - Mutation context
 * @param memberId - The member ID
 * @param startYear - The start year of the association year
 * @param excludeMembershipId - Optional membership ID to exclude (for updates)
 * @throws Error if duplicate membership exists
 */
async function validateNoDuplicateMembership(
  ctx: MutationCtx,
  memberId: Id<"members">,
  startYear: number,
  excludeMembershipId?: Id<"memberships">
): Promise<void> {
  const existing = await ctx.db
    .query("memberships")
    .withIndex("by_member_year", (q) =>
      q.eq("memberId", memberId).eq("startYear", startYear)
    )
    .unique();

  if (existing && existing._id !== excludeMembershipId) {
    throw new Error(
      `Esiste già una tessera per questo socio per l'anno ${startYear}/${startYear + 1}`
    );
  }
}

/**
 * Gets the current date as an ISO date string (YYYY-MM-DD).
 *
 * @returns Current date in ISO format
 */
function getCurrentDateISO(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Calculates the changes between old and new membership data for audit logging.
 *
 * @param oldData - Original membership data
 * @param newData - Updated membership data
 * @returns Object containing only the changed fields
 */
function calculateMembershipChanges(
  oldData: Doc<"memberships">,
  newData: Partial<Doc<"memberships">>
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  const fieldsToCheck = [
    "quotaImporto",
    "pagato",
    "dataPagamento",
    "metodoPagamento",
    "note",
  ] as const;

  for (const field of fieldsToCheck) {
    if (field in newData && newData[field] !== oldData[field]) {
      changes[field] = {
        old: oldData[field],
        new: newData[field],
      };
    }
  }

  return changes;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Creates a new membership for the current association year.
 *
 * Automatically calculates:
 * - Current association year (startYear, endYear, label)
 * - Expiration date (August 31st of endYear)
 *
 * Requirements:
 * - Req 4.1: Save all membership fields
 * - Req 4.2: Validate quotaImporto >= 0
 * - Req 4.5: Auto-calculate scadenza as August 31st of endYear
 * - Req 9.2: Only admin/direttivo can create memberships
 * - Req 11.2: Log membership creation
 *
 * @param args.memberId - The member to create the membership for
 * @param args.quotaImporto - The membership fee amount (must be >= 0)
 * @param args.pagato - Whether the fee has been paid
 * @param args.dataPagamento - Optional payment date (ISO string)
 * @param args.metodoPagamento - Optional payment method
 * @param args.note - Optional notes
 * @returns The new membership ID
 */
export const createMembership = mutation({
  args: {
    memberId: v.id("members"),
    quotaImporto: v.number(),
    pagato: v.boolean(),
    dataPagamento: v.optional(v.string()),
    metodoPagamento: v.optional(
      v.union(
        v.literal("contanti"),
        v.literal("bonifico"),
        v.literal("pos"),
        v.literal("altro")
      )
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check permissions - only admin or direttivo can create memberships
    await requireAdminOrDirettivo(ctx);

    // Validate quotaImporto >= 0 (Req 4.2)
    validateQuotaImporto(args.quotaImporto);

    // Validate member exists
    const member = await validateMemberExists(ctx, args.memberId);

    // Calculate current association year
    const associationYear = calculateAssociationYear();

    // Check for duplicate membership for same member + year
    await validateNoDuplicateMembership(
      ctx,
      args.memberId,
      associationYear.startYear
    );

    // Calculate scadenza as August 31st of endYear (Req 4.5)
    const scadenza = getAssociationYearEndISO(associationYear.endYear);

    const now = Date.now();

    // Create the membership (Req 4.1)
    const membershipId = await ctx.db.insert("memberships", {
      memberId: args.memberId,
      associationYearLabel: associationYear.label,
      startYear: associationYear.startYear,
      endYear: associationYear.endYear,
      quotaImporto: args.quotaImporto,
      pagato: args.pagato,
      dataPagamento: args.dataPagamento,
      metodoPagamento: args.metodoPagamento,
      scadenza,
      note: args.note,
      createdAt: now,
      updatedAt: now,
    });

    // Create audit log entry (Req 11.2)
    await createAuditLog(ctx, {
      entityType: "memberships",
      entityId: membershipId,
      action: "create",
      summary: `Creata tessera ${associationYear.label} per ${member.nome} ${member.cognome} (€${args.quotaImporto})`,
    });

    return membershipId;
  },
});

/**
 * Creates a new membership for a specific association year.
 *
 * Same as createMembership but accepts startYear/endYear as arguments
 * for creating memberships for past or future years.
 *
 * Requirements:
 * - Req 4.1: Save all membership fields
 * - Req 4.2: Validate quotaImporto >= 0
 * - Req 4.5: Auto-calculate scadenza as August 31st of endYear
 * - Req 9.2: Only admin/direttivo can create memberships
 * - Req 11.2: Log membership creation
 *
 * @param args.memberId - The member to create the membership for
 * @param args.startYear - The start year of the association year
 * @param args.endYear - The end year of the association year
 * @param args.quotaImporto - The membership fee amount (must be >= 0)
 * @param args.pagato - Whether the fee has been paid
 * @param args.dataPagamento - Optional payment date (ISO string)
 * @param args.metodoPagamento - Optional payment method
 * @param args.note - Optional notes
 * @returns The new membership ID
 */
export const createMembershipForYear = mutation({
  args: {
    memberId: v.id("members"),
    startYear: v.number(),
    endYear: v.number(),
    quotaImporto: v.number(),
    pagato: v.boolean(),
    dataPagamento: v.optional(v.string()),
    metodoPagamento: v.optional(
      v.union(
        v.literal("contanti"),
        v.literal("bonifico"),
        v.literal("pos"),
        v.literal("altro")
      )
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check permissions - only admin or direttivo can create memberships
    await requireAdminOrDirettivo(ctx);

    // Validate quotaImporto >= 0 (Req 4.2)
    validateQuotaImporto(args.quotaImporto);

    // Validate member exists
    const member = await validateMemberExists(ctx, args.memberId);

    // Validate year consistency
    if (args.endYear !== args.startYear + 1) {
      throw new Error(
        "L'anno finale deve essere l'anno iniziale + 1 (es. 2025/2026)"
      );
    }

    // Check for duplicate membership for same member + year
    await validateNoDuplicateMembership(ctx, args.memberId, args.startYear);

    // Generate association year label
    const associationYearLabel = getAssociationYearLabel(
      args.startYear,
      args.endYear
    );

    // Calculate scadenza as August 31st of endYear (Req 4.5)
    const scadenza = getAssociationYearEndISO(args.endYear);

    const now = Date.now();

    // Create the membership (Req 4.1)
    const membershipId = await ctx.db.insert("memberships", {
      memberId: args.memberId,
      associationYearLabel,
      startYear: args.startYear,
      endYear: args.endYear,
      quotaImporto: args.quotaImporto,
      pagato: args.pagato,
      dataPagamento: args.dataPagamento,
      metodoPagamento: args.metodoPagamento,
      scadenza,
      note: args.note,
      createdAt: now,
      updatedAt: now,
    });

    // Create audit log entry (Req 11.2)
    await createAuditLog(ctx, {
      entityType: "memberships",
      entityId: membershipId,
      action: "create",
      summary: `Creata tessera ${associationYearLabel} per ${member.nome} ${member.cognome} (€${args.quotaImporto})`,
    });

    return membershipId;
  },
});

/**
 * Updates an existing membership.
 *
 * Requirements:
 * - Req 4.2: Validate quotaImporto >= 0 if provided
 * - Req 9.2: Only admin/direttivo can update memberships
 * - Req 11.2: Log membership updates with changes
 *
 * @param args.membershipId - The membership ID to update
 * @param args.quotaImporto - Optional new fee amount (must be >= 0)
 * @param args.pagato - Optional new payment status
 * @param args.dataPagamento - Optional new payment date
 * @param args.metodoPagamento - Optional new payment method
 * @param args.note - Optional new notes
 * @returns The updated membership
 */
export const updateMembership = mutation({
  args: {
    membershipId: v.id("memberships"),
    quotaImporto: v.optional(v.number()),
    pagato: v.optional(v.boolean()),
    dataPagamento: v.optional(v.string()),
    metodoPagamento: v.optional(
      v.union(
        v.literal("contanti"),
        v.literal("bonifico"),
        v.literal("pos"),
        v.literal("altro")
      )
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check permissions - only admin or direttivo can update memberships
    await requireAdminOrDirettivo(ctx);

    // Get existing membership
    const existingMembership = await ctx.db.get(args.membershipId);
    if (!existingMembership) {
      throw new Error("Tessera non trovata");
    }

    // Validate quotaImporto >= 0 if provided (Req 4.2)
    if (args.quotaImporto !== undefined) {
      validateQuotaImporto(args.quotaImporto);
    }

    // Get member for audit log
    const member = await ctx.db.get(existingMembership.memberId);

    // Build update object with only provided fields
    const updateData: Partial<Doc<"memberships">> = {
      updatedAt: Date.now(),
    };

    if (args.quotaImporto !== undefined) updateData.quotaImporto = args.quotaImporto;
    if (args.pagato !== undefined) updateData.pagato = args.pagato;
    if (args.dataPagamento !== undefined) updateData.dataPagamento = args.dataPagamento;
    if (args.metodoPagamento !== undefined) updateData.metodoPagamento = args.metodoPagamento;
    if (args.note !== undefined) updateData.note = args.note;

    // Calculate changes for audit log
    const changes = calculateMembershipChanges(existingMembership, updateData);

    // Update the membership
    await ctx.db.patch(args.membershipId, updateData);

    // Create audit log entry with changes (Req 11.2)
    const changedFields = Object.keys(changes).join(", ");
    const memberName = member ? `${member.nome} ${member.cognome}` : "socio sconosciuto";
    await createAuditLog(ctx, {
      entityType: "memberships",
      entityId: args.membershipId,
      action: "update",
      summary: `Aggiornata tessera ${existingMembership.associationYearLabel} di ${memberName}${changedFields ? ` (campi: ${changedFields})` : ""}`,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
    });

    // Return updated membership
    const updatedMembership = await ctx.db.get(args.membershipId);
    return updatedMembership;
  },
});

/**
 * Toggles the payment status of a membership.
 *
 * If setting to paid (pagato = true) and dataPagamento is not set,
 * automatically sets dataPagamento to the current date.
 *
 * Requirements:
 * - Req 4.3: Auto-set dataPagamento when marking as paid
 * - Req 9.2: Only admin/direttivo can toggle payment status
 * - Req 11.2: Log payment status changes
 *
 * @param args.membershipId - The membership ID to toggle
 * @returns The updated membership
 */
export const togglePaid = mutation({
  args: {
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    // Check permissions - only admin or direttivo can toggle payment status
    await requireAdminOrDirettivo(ctx);

    // Get existing membership
    const existingMembership = await ctx.db.get(args.membershipId);
    if (!existingMembership) {
      throw new Error("Tessera non trovata");
    }

    // Get member for audit log
    const member = await ctx.db.get(existingMembership.memberId);

    // Toggle pagato status
    const newPagato = !existingMembership.pagato;

    // Build update object
    const updateData: Partial<Doc<"memberships">> = {
      pagato: newPagato,
      updatedAt: Date.now(),
    };

    // If setting to paid and dataPagamento is not set, auto-set to current date (Req 4.3)
    if (newPagato && !existingMembership.dataPagamento) {
      updateData.dataPagamento = getCurrentDateISO();
    }

    // Update the membership
    await ctx.db.patch(args.membershipId, updateData);

    // Create audit log entry (Req 11.2)
    const memberName = member ? `${member.nome} ${member.cognome}` : "socio sconosciuto";
    const statusText = newPagato ? "pagata" : "non pagata";
    await createAuditLog(ctx, {
      entityType: "memberships",
      entityId: args.membershipId,
      action: "update",
      summary: `Tessera ${existingMembership.associationYearLabel} di ${memberName} segnata come ${statusText}`,
      changes: {
        pagato: {
          old: existingMembership.pagato,
          new: newPagato,
        },
        ...(updateData.dataPagamento && !existingMembership.dataPagamento
          ? {
              dataPagamento: {
                old: existingMembership.dataPagamento,
                new: updateData.dataPagamento,
              },
            }
          : {}),
      },
    });

    // Return updated membership
    const updatedMembership = await ctx.db.get(args.membershipId);
    return updatedMembership;
  },
});

/**
 * Deletes a membership.
 *
 * Requirements:
 * - Req 9.2: Only admin/direttivo can delete memberships
 * - Req 11.2: Log membership deletion
 *
 * @param args.membershipId - The membership ID to delete
 * @returns Success indicator
 */
export const deleteMembership = mutation({
  args: {
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    // Check permissions - only admin or direttivo can delete memberships
    await requireAdminOrDirettivo(ctx);

    // Get existing membership
    const existingMembership = await ctx.db.get(args.membershipId);
    if (!existingMembership) {
      throw new Error("Tessera non trovata");
    }

    // Get member for audit log
    const member = await ctx.db.get(existingMembership.memberId);

    // Delete the membership
    await ctx.db.delete(args.membershipId);

    // Create audit log entry (Req 11.2)
    const memberName = member ? `${member.nome} ${member.cognome}` : "socio sconosciuto";
    await createAuditLog(ctx, {
      entityType: "memberships",
      entityId: args.membershipId,
      action: "delete",
      summary: `Eliminata tessera ${existingMembership.associationYearLabel} di ${memberName} (€${existingMembership.quotaImporto})`,
    });

    return { success: true };
  },
});


// ============================================================================
// Queries
// ============================================================================

/**
 * Gets a single membership by ID.
 *
 * Permission checks:
 * - Admin/direttivo can view any membership
 * - Socio can only view their own memberships (via profile.memberId)
 *
 * @param args.membershipId - The membership ID to retrieve
 * @returns The membership document or null if not found/not authorized
 */
export const getMembership = query({
  args: {
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      return null;
    }

    // Check if user can read this member's data
    const canRead = await canReadMember(ctx, membership.memberId);
    if (!canRead) {
      throw new Error("Accesso negato");
    }

    return membership;
  },
});

/**
 * Gets all memberships for a specific member.
 *
 * Returns current membership and history, sorted by startYear descending
 * (most recent first).
 *
 * Permission checks:
 * - Admin/direttivo can view any member's memberships
 * - Socio can only view their own memberships
 *
 * Requirements:
 * - Req 4.4: Show current membership and history for a member
 *
 * @param args.memberId - The member ID to get memberships for
 * @returns Array of memberships sorted by startYear descending
 */
export const getMembershipsByMember = query({
  args: {
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    // Check if user can read this member's data
    const canRead = await canReadMember(ctx, args.memberId);
    if (!canRead) {
      throw new Error("Accesso negato");
    }

    // Get all memberships for this member
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    // Sort by startYear descending (most recent first)
    return memberships.sort((a, b) => b.startYear - a.startYear);
  },
});

/**
 * Gets the current membership for a specific member.
 *
 * Returns the membership for the current association year, or null if none exists.
 * Useful for quick status checks.
 *
 * Permission checks:
 * - Admin/direttivo can view any member's current membership
 * - Socio can only view their own current membership
 *
 * @param args.memberId - The member ID to get current membership for
 * @returns The current membership or null
 */
export const getCurrentMembership = query({
  args: {
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    // Check if user can read this member's data
    const canRead = await canReadMember(ctx, args.memberId);
    if (!canRead) {
      throw new Error("Accesso negato");
    }

    // Get current association year
    const currentYear = calculateAssociationYear();

    // Find membership for current year
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_member_year", (q) =>
        q.eq("memberId", args.memberId).eq("startYear", currentYear.startYear)
      )
      .unique();

    return membership;
  },
});

/**
 * Gets dashboard statistics for memberships.
 *
 * Returns counts for the current association year:
 * - totalMemberships: total memberships for current year
 * - unpaidCount: memberships with pagato = false (Req 5.1)
 * - expiringCount: memberships expiring within 30 days (Req 5.2)
 * - expiredCount: memberships past scadenza date (Req 5.3)
 * - paidCount: memberships with pagato = true
 *
 * Permission checks:
 * - Only admin/direttivo can access
 *
 * Requirements:
 * - Req 5.1: Count unpaid memberships for current year
 * - Req 5.2: Count memberships expiring within 30 days
 * - Req 5.3: Count expired memberships
 *
 * @param args.year - Optional year filter (startYear). Defaults to current association year.
 * @returns Dashboard statistics object
 */
export const getDashboardStats = query({
  args: {
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Only admin/direttivo can access dashboard stats
    await requireAdminOrDirettivo(ctx);

    // Determine which year to query
    const currentYear = calculateAssociationYear();
    const targetYear = args.year ?? currentYear.startYear;

    // Get all memberships for the target year
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_year", (q) =>
        q.eq("startYear", targetYear).eq("endYear", targetYear + 1)
      )
      .collect();

    // Calculate current date for expiration checks
    const today = new Date();
    const todayISO = today.toISOString().split("T")[0];

    // Calculate date 30 days from now for expiring check
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysISO = thirtyDaysFromNow.toISOString().split("T")[0];

    // Calculate counts
    let unpaidCount = 0;
    let paidCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;

    for (const membership of memberships) {
      // Count paid/unpaid (Req 5.1)
      if (membership.pagato) {
        paidCount++;
      } else {
        unpaidCount++;
      }

      // Count expired (Req 5.3) - past scadenza date
      if (membership.scadenza < todayISO) {
        expiredCount++;
      }
      // Count expiring within 30 days (Req 5.2) - not expired yet but will expire soon
      else if (membership.scadenza <= thirtyDaysISO) {
        expiringCount++;
      }
    }

    return {
      totalMemberships: memberships.length,
      unpaidCount,
      paidCount,
      expiringCount,
      expiredCount,
      associationYearLabel: getAssociationYearLabel(targetYear, targetYear + 1),
    };
  },
});

/**
 * Gets list of unpaid memberships for the current year.
 *
 * Includes member name for display purposes.
 *
 * Permission checks:
 * - Only admin/direttivo can access
 *
 * Requirements:
 * - Req 5.1: Count unpaid memberships for current year
 *
 * @param args.year - Optional year filter (startYear). Defaults to current association year.
 * @returns Array of unpaid memberships with member info
 */
export const getUnpaidMemberships = query({
  args: {
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Only admin/direttivo can access
    await requireAdminOrDirettivo(ctx);

    // Determine which year to query
    const currentYear = calculateAssociationYear();
    const targetYear = args.year ?? currentYear.startYear;

    // Get all unpaid memberships for the target year
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_year", (q) =>
        q.eq("startYear", targetYear).eq("endYear", targetYear + 1)
      )
      .collect();

    // Filter unpaid and enrich with member data
    const unpaidMemberships = [];
    for (const membership of memberships) {
      if (!membership.pagato) {
        const member = await ctx.db.get(membership.memberId);
        unpaidMemberships.push({
          ...membership,
          memberName: member ? `${member.nome} ${member.cognome}` : "Socio sconosciuto",
          memberEmail: member?.email,
          memberTelefono: member?.telefono,
        });
      }
    }

    // Sort by member name
    return unpaidMemberships.sort((a, b) =>
      a.memberName.localeCompare(b.memberName)
    );
  },
});

/**
 * Gets list of memberships expiring within 30 days.
 *
 * Includes member name for display purposes.
 *
 * Permission checks:
 * - Only admin/direttivo can access
 *
 * Requirements:
 * - Req 5.2: Count memberships expiring within 30 days
 *
 * @param args.year - Optional year filter (startYear). Defaults to current association year.
 * @returns Array of expiring memberships with member info
 */
export const getExpiringMemberships = query({
  args: {
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Only admin/direttivo can access
    await requireAdminOrDirettivo(ctx);

    // Determine which year to query
    const currentYear = calculateAssociationYear();
    const targetYear = args.year ?? currentYear.startYear;

    // Get all memberships for the target year
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_year", (q) =>
        q.eq("startYear", targetYear).eq("endYear", targetYear + 1)
      )
      .collect();

    // Calculate date ranges
    const today = new Date();
    const todayISO = today.toISOString().split("T")[0];
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysISO = thirtyDaysFromNow.toISOString().split("T")[0];

    // Filter expiring (not expired yet but will expire within 30 days) and enrich with member data
    const expiringMemberships = [];
    for (const membership of memberships) {
      // Expiring: scadenza is in the future but within 30 days
      if (membership.scadenza >= todayISO && membership.scadenza <= thirtyDaysISO) {
        const member = await ctx.db.get(membership.memberId);
        expiringMemberships.push({
          ...membership,
          memberName: member ? `${member.nome} ${member.cognome}` : "Socio sconosciuto",
          memberEmail: member?.email,
          memberTelefono: member?.telefono,
        });
      }
    }

    // Sort by scadenza (soonest first)
    return expiringMemberships.sort((a, b) =>
      a.scadenza.localeCompare(b.scadenza)
    );
  },
});

/**
 * Gets list of expired memberships (past scadenza date).
 *
 * Includes member name for display purposes.
 *
 * Permission checks:
 * - Only admin/direttivo can access
 *
 * Requirements:
 * - Req 5.3: Count expired memberships
 *
 * @param args.year - Optional year filter (startYear). Defaults to current association year.
 * @returns Array of expired memberships with member info
 */
export const getExpiredMemberships = query({
  args: {
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Only admin/direttivo can access
    await requireAdminOrDirettivo(ctx);

    // Determine which year to query
    const currentYear = calculateAssociationYear();
    const targetYear = args.year ?? currentYear.startYear;

    // Get all memberships for the target year
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_year", (q) =>
        q.eq("startYear", targetYear).eq("endYear", targetYear + 1)
      )
      .collect();

    // Calculate current date
    const today = new Date();
    const todayISO = today.toISOString().split("T")[0];

    // Filter expired and enrich with member data
    const expiredMemberships = [];
    for (const membership of memberships) {
      // Expired: scadenza is in the past
      if (membership.scadenza < todayISO) {
        const member = await ctx.db.get(membership.memberId);
        expiredMemberships.push({
          ...membership,
          memberName: member ? `${member.nome} ${member.cognome}` : "Socio sconosciuto",
          memberEmail: member?.email,
          memberTelefono: member?.telefono,
        });
      }
    }

    // Sort by scadenza (most recently expired first)
    return expiredMemberships.sort((a, b) =>
      b.scadenza.localeCompare(a.scadenza)
    );
  },
});
