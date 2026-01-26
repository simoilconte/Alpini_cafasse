/**
 * Member Mutations and Queries for ODV Management System
 * 
 * Implements CRUD operations for members (soci) with:
 * - RBAC controls (admin/direttivo only for mutations)
 * - Validation (unique codiceFiscale, socioAttivo/stato coherence)
 * - Audit logging for all operations
 * - Cascade delete for related data
 * - Data minimization for list views
 * - Privacy controls for member access
 * 
 * Requirements:
 * - Req 1.1: Save all member fields
 * - Req 1.2: Ensure codiceFiscale is unique
 * - Req 1.3: Validate and update member info
 * - Req 1.4: Remove member and all associated data
 * - Req 2.1: Search by nome, cognome, or codiceFiscale
 * - Req 2.2: Filter by socioAttivo
 * - Req 2.3: Filter by stato
 * - Req 2.4: Combine filters with AND
 * - Req 10.1: Minimize data in list views (exclude note)
 * - Req 10.2: Full data only for authorized users
 * - Req 10.4: Socio can view all their own data
 * - Req 13.1: Validate CF uniqueness before save
 * - Req 13.4: Validate socioAttivo/stato coherence
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { 
  requireAdminOrDirettivo, 
  requireAuth, 
  canReadMember, 
  isAdminOrDirettivo,
  getOptionalProfile 
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
 * 
 * Requirements:
 * - Req 11.1: Log member operations
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
 * Validates the coherence between socioAttivo and stato fields.
 * 
 * Business rule: If stato is "dimesso", socioAttivo must be false.
 * 
 * Requirements:
 * - Req 13.4: Validate socioAttivo/stato coherence
 * 
 * @param socioAttivo - Whether the member is active
 * @param stato - Member status (attivo, sospeso, dimesso)
 * @throws Error if validation fails
 */
function validateSocioAttivoStatoCoherence(
  socioAttivo: boolean,
  stato: "attivo" | "sospeso" | "dimesso"
): void {
  if (stato === "dimesso" && socioAttivo === true) {
    throw new Error(
      "Incoerenza dati: un socio con stato 'dimesso' non può avere socioAttivo = true"
    );
  }
}

/**
 * Checks if a codiceFiscale already exists in the database.
 * 
 * Requirements:
 * - Req 1.2: Ensure codiceFiscale is unique
 * - Req 13.1: Validate CF uniqueness before save
 * 
 * @param ctx - Mutation context
 * @param codiceFiscale - The fiscal code to check
 * @param excludeMemberId - Optional member ID to exclude (for updates)
 * @throws Error if codiceFiscale already exists
 */
async function validateUniqueCodiceFiscale(
  ctx: MutationCtx,
  codiceFiscale: string,
  excludeMemberId?: Id<"members">
): Promise<void> {
  const existing = await ctx.db
    .query("members")
    .withIndex("by_codice_fiscale", (q) => q.eq("codiceFiscale", codiceFiscale))
    .unique();

  if (existing && existing._id !== excludeMemberId) {
    throw new Error("Codice fiscale già esistente nel sistema");
  }
}

/**
 * Calculates the changes between old and new member data for audit logging.
 * 
 * @param oldData - Original member data
 * @param newData - Updated member data
 * @returns Object containing only the changed fields
 */
function calculateChanges(
  oldData: Doc<"members">,
  newData: Partial<Doc<"members">>
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  
  const fieldsToCheck = [
    "nome", "cognome", "codiceFiscale", "dataNascita", "email",
    "telefono", "indirizzo", "comune", "cap", "note", "socioAttivo", "stato"
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
 * Creates a new member in the system.
 * 
 * Requirements:
 * - Req 1.1: Save all member fields
 * - Req 1.2: Ensure codiceFiscale is unique
 * - Req 13.1: Validate CF uniqueness before save
 * - Req 13.4: Validate socioAttivo/stato coherence
 * - Req 9.2: Only admin/direttivo can create members
 * - Req 11.1: Log member creation
 * 
 * @param args - Member data
 * @returns The new member ID
 */
export const createMember = mutation({
  args: {
    nome: v.string(),
    cognome: v.string(),
    codiceFiscale: v.string(),
    dataNascita: v.string(),
    sesso: v.optional(v.union(v.literal("M"), v.literal("F"))),
    luogoNascita: v.optional(v.string()),
    codiceCatastale: v.optional(v.string()),
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
    statusId: v.optional(v.id("memberStatuses")),
  },
  handler: async (ctx, args) => {
    // Check permissions - only admin or direttivo can create members
    await requireAdminOrDirettivo(ctx);

    // Validate codiceFiscale uniqueness
    await validateUniqueCodiceFiscale(ctx, args.codiceFiscale);

    // Validate socioAttivo/stato coherence
    validateSocioAttivoStatoCoherence(args.socioAttivo, args.stato);

    const now = Date.now();

    // Create the member
    const memberId = await ctx.db.insert("members", {
      nome: args.nome,
      cognome: args.cognome,
      codiceFiscale: args.codiceFiscale,
      dataNascita: args.dataNascita,
      sesso: args.sesso,
      luogoNascita: args.luogoNascita,
      codiceCatastale: args.codiceCatastale,
      email: args.email,
      telefono: args.telefono,
      indirizzo: args.indirizzo,
      comune: args.comune,
      cap: args.cap,
      note: args.note,
      socioAttivo: args.socioAttivo,
      stato: args.stato,
      statusId: args.statusId,
      createdAt: now,
      updatedAt: now,
    });

    // Create audit log entry
    await createAuditLog(ctx, {
      entityType: "members",
      entityId: memberId,
      action: "create",
      summary: `Creato socio ${args.nome} ${args.cognome} (CF: ${args.codiceFiscale})`,
    });

    return memberId;
  },
});

/**
 * Updates an existing member's data.
 * 
 * Requirements:
 * - Req 1.3: Validate and update member info
 * - Req 1.2: Ensure codiceFiscale is unique (if changed)
 * - Req 13.1: Validate CF uniqueness before save
 * - Req 13.4: Validate socioAttivo/stato coherence
 * - Req 9.2: Only admin/direttivo can update members
 * - Req 11.1: Log member updates with changes
 * 
 * @param args - Member ID and fields to update
 * @returns The updated member
 */
export const updateMember = mutation({
  args: {
    memberId: v.id("members"),
    nome: v.optional(v.string()),
    cognome: v.optional(v.string()),
    codiceFiscale: v.optional(v.string()),
    dataNascita: v.optional(v.string()),
    sesso: v.optional(v.union(v.literal("M"), v.literal("F"))),
    luogoNascita: v.optional(v.string()),
    codiceCatastale: v.optional(v.string()),
    email: v.optional(v.string()),
    telefono: v.optional(v.string()),
    indirizzo: v.optional(v.string()),
    comune: v.optional(v.string()),
    cap: v.optional(v.string()),
    note: v.optional(v.string()),
    socioAttivo: v.optional(v.boolean()),
    stato: v.optional(
      v.union(
        v.literal("attivo"),
        v.literal("sospeso"),
        v.literal("dimesso")
      )
    ),
    statusId: v.optional(v.id("memberStatuses")),
  },
  handler: async (ctx, args) => {
    // Check permissions - only admin or direttivo can update members
    await requireAdminOrDirettivo(ctx);

    // Get existing member
    const existingMember = await ctx.db.get(args.memberId);
    if (!existingMember) {
      throw new Error("Socio non trovato");
    }

    // If codiceFiscale is being changed, validate uniqueness
    if (args.codiceFiscale && args.codiceFiscale !== existingMember.codiceFiscale) {
      await validateUniqueCodiceFiscale(ctx, args.codiceFiscale, args.memberId);
    }

    // Determine final values for socioAttivo and stato
    const finalSocioAttivo = args.socioAttivo ?? existingMember.socioAttivo;
    const finalStato = args.stato ?? existingMember.stato;

    // Validate socioAttivo/stato coherence
    validateSocioAttivoStatoCoherence(finalSocioAttivo, finalStato);

    // Build update object with only provided fields
    const updateData: Partial<Doc<"members">> = {
      updatedAt: Date.now(),
    };

    if (args.nome !== undefined) updateData.nome = args.nome;
    if (args.cognome !== undefined) updateData.cognome = args.cognome;
    if (args.codiceFiscale !== undefined) updateData.codiceFiscale = args.codiceFiscale;
    if (args.dataNascita !== undefined) updateData.dataNascita = args.dataNascita;
    if (args.sesso !== undefined) (updateData as any).sesso = args.sesso;
    if (args.luogoNascita !== undefined) (updateData as any).luogoNascita = args.luogoNascita;
    if (args.codiceCatastale !== undefined) (updateData as any).codiceCatastale = args.codiceCatastale;
    if (args.email !== undefined) updateData.email = args.email;
    if (args.telefono !== undefined) updateData.telefono = args.telefono;
    if (args.indirizzo !== undefined) updateData.indirizzo = args.indirizzo;
    if (args.comune !== undefined) updateData.comune = args.comune;
    if (args.cap !== undefined) updateData.cap = args.cap;
    if (args.note !== undefined) updateData.note = args.note;
    if (args.socioAttivo !== undefined) updateData.socioAttivo = args.socioAttivo;
    if (args.stato !== undefined) updateData.stato = args.stato;
    if (args.statusId !== undefined) (updateData as any).statusId = args.statusId;

    // Calculate changes for audit log
    const changes = calculateChanges(existingMember, updateData);

    // Update the member
    await ctx.db.patch(args.memberId, updateData);

    // Create audit log entry with changes
    const changedFields = Object.keys(changes).join(", ");
    await createAuditLog(ctx, {
      entityType: "members",
      entityId: args.memberId,
      action: "update",
      summary: `Aggiornato socio ${existingMember.nome} ${existingMember.cognome}${changedFields ? ` (campi: ${changedFields})` : ""}`,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
    });

    // Return updated member
    const updatedMember = await ctx.db.get(args.memberId);
    return updatedMember;
  },
});

/**
 * Deletes a member and all associated data (cascade delete).
 * 
 * Requirements:
 * - Req 1.4: Remove member and all associated data
 * - Req 9.2: Only admin/direttivo can delete members
 * - Req 11.1: Log member deletion
 * 
 * Cascade deletes:
 * - All memberships (tessere) associated with the member
 * - All event participations associated with the member
 * 
 * @param args - Member ID to delete
 * @returns Success indicator
 */
export const deleteMember = mutation({
  args: {
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    // Check permissions - only admin or direttivo can delete members
    await requireAdminOrDirettivo(ctx);

    // Get existing member
    const existingMember = await ctx.db.get(args.memberId);
    if (!existingMember) {
      throw new Error("Socio non trovato");
    }

    // Delete all related memberships (cascade)
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    // Delete all related event participations (cascade)
    const participations = await ctx.db
      .query("eventParticipants")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    for (const participation of participations) {
      await ctx.db.delete(participation._id);
    }

    // Delete the member
    await ctx.db.delete(args.memberId);

    // Create audit log entry
    await createAuditLog(ctx, {
      entityType: "members",
      entityId: args.memberId,
      action: "delete",
      summary: `Eliminato socio ${existingMember.nome} ${existingMember.cognome} (CF: ${existingMember.codiceFiscale}) con ${memberships.length} tessere e ${participations.length} partecipazioni`,
    });

    return { success: true };
  },
});


// ============================================================================
// Types for Queries
// ============================================================================

/**
 * Minimized member data for list views.
 * Excludes sensitive fields like 'note' for privacy.
 * 
 * Requirements:
 * - Req 10.1: Minimize data in list views (exclude note)
 */
export interface MemberListItem {
  _id: Id<"members">;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  dataNascita: string;
  email?: string;
  telefono?: string;
  indirizzo?: string;
  comune?: string;
  cap?: string;
  socioAttivo: boolean;
  stato: "attivo" | "sospeso" | "dimesso";
  createdAt: number;
  updatedAt: number;
}

/**
 * Converts a full member document to a minimized list item.
 * Excludes the 'note' field for privacy in list views.
 * 
 * @param member - Full member document
 * @returns Minimized member data for list view
 */
function toMemberListItem(member: Doc<"members">): MemberListItem {
  return {
    _id: member._id,
    nome: member.nome,
    cognome: member.cognome,
    codiceFiscale: member.codiceFiscale,
    dataNascita: member.dataNascita,
    email: member.email,
    telefono: member.telefono,
    indirizzo: member.indirizzo,
    comune: member.comune,
    cap: member.cap,
    socioAttivo: member.socioAttivo,
    stato: member.stato,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Gets a single member by ID with full data.
 * 
 * Access control:
 * - Admin/direttivo can view any member
 * - Socio can only view their own member (via profile.memberId)
 * 
 * Requirements:
 * - Req 10.2: Full data only for authorized users
 * - Req 10.4: Socio can view all their own data
 * - Req 9.2: Admin/direttivo have full access
 * - Req 9.3: Socio can only view their own data
 * 
 * @param args.memberId - The member ID to retrieve
 * @returns Full member data if authorized, null if not found or unauthorized
 */
export const getMember = query({
  args: {
    memberId: v.id("members"),
  },
  handler: async (ctx, args): Promise<Doc<"members"> | null> => {
    // Check if user can read this member
    const canRead = await canReadMember(ctx, args.memberId);
    if (!canRead) {
      throw new Error("Accesso negato: permessi insufficienti per visualizzare questo socio");
    }

    // Get the member
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      return null;
    }

    // Return full member data (Req 10.2, 10.4)
    return member;
  },
});

/**
 * Lists members with optional filters and search.
 * Returns minimized data (excludes 'note' field) for privacy.
 * 
 * Access control:
 * - Only admin/direttivo can list all members
 * - Socio cannot list members (should use getMyMember instead)
 * 
 * Filters:
 * - search: Searches in nome, cognome, or codiceFiscale (Req 2.1)
 * - socioAttivo: Filter by active status (Req 2.2)
 * - stato: Filter by member status (Req 2.3)
 * - All filters are combined with AND logic (Req 2.4)
 * 
 * Requirements:
 * - Req 2.1: Search by nome, cognome, or codiceFiscale
 * - Req 2.2: Filter by socioAttivo
 * - Req 2.3: Filter by stato
 * - Req 2.4: Combine filters with AND
 * - Req 10.1: Minimize data in list views (exclude note)
 * - Req 9.2: Only admin/direttivo can list all members
 * 
 * @param args.search - Optional search text
 * @param args.socioAttivo - Optional filter by active status
 * @param args.stato - Optional filter by member status
 * @param args.limit - Maximum number of results (default 50)
 * @param args.cursor - Pagination cursor for next page
 * @returns Paginated list of minimized member data
 */
export const listMembers = query({
  args: {
    search: v.optional(v.string()),
    socioAttivo: v.optional(v.boolean()),
    stato: v.optional(
      v.union(
        v.literal("attivo"),
        v.literal("sospeso"),
        v.literal("dimesso")
      )
    ),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check permissions - only admin/direttivo can list all members
    const profile = await getOptionalProfile(ctx);
    if (!profile) {
      throw new Error("Non autenticato");
    }
    
    if (!isAdminOrDirettivo(profile)) {
      throw new Error("Accesso negato: solo admin e direttivo possono visualizzare l'elenco soci");
    }

    const limit = args.limit ?? 50;
    
    // Collect members - use index if socioAttivo filter is provided (Req 2.2)
    let members: Doc<"members">[];
    if (args.socioAttivo !== undefined) {
      members = await ctx.db
        .query("members")
        .withIndex("by_socio_attivo", (q) => q.eq("socioAttivo", args.socioAttivo!))
        .collect();
    } else {
      members = await ctx.db.query("members").collect();
    }
    
    // Apply stato filter (Req 2.3)
    if (args.stato !== undefined) {
      members = members.filter((m) => m.stato === args.stato);
    }
    
    // Apply search filter (Req 2.1)
    if (args.search && args.search.trim() !== "") {
      const searchLower = args.search.toLowerCase().trim();
      members = members.filter((m) => 
        m.nome.toLowerCase().includes(searchLower) ||
        m.cognome.toLowerCase().includes(searchLower) ||
        m.codiceFiscale.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by cognome, nome for consistent ordering
    members.sort((a, b) => {
      const cognomeCompare = a.cognome.localeCompare(b.cognome);
      if (cognomeCompare !== 0) return cognomeCompare;
      return a.nome.localeCompare(b.nome);
    });
    
    // Handle pagination with cursor
    let startIndex = 0;
    if (args.cursor) {
      const cursorIndex = members.findIndex((m) => m._id === args.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }
    
    // Get page of results
    const pageMembers = members.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < members.length;
    const nextCursor = hasMore ? pageMembers[pageMembers.length - 1]?._id : undefined;
    
    // Return minimized data (Req 10.1)
    return {
      members: pageMembers.map(toMemberListItem),
      nextCursor,
      hasMore,
      totalCount: members.length,
    };
  },
});

/**
 * Gets the member linked to the current user's profile.
 * For socio users to view their own data.
 * 
 * Access control:
 * - Any authenticated user can call this
 * - Returns the member linked via profile.memberId
 * - Returns null if user has no linked member
 * 
 * Requirements:
 * - Req 10.4: Socio can view all their own data
 * - Req 9.5: Link socio users to their member record via profile.memberId
 * 
 * @returns Full member data for the current user, or null if not linked
 */
export const getMyMember = query({
  args: {},
  handler: async (ctx): Promise<Doc<"members"> | null> => {
    // Get current user's profile
    const profile = await getOptionalProfile(ctx);
    if (!profile) {
      throw new Error("Non autenticato");
    }

    // Check if user has a linked member
    if (!profile.memberId) {
      return null;
    }

    // Get the linked member
    const member = await ctx.db.get(profile.memberId);
    if (!member) {
      return null;
    }

    // Return full member data (Req 10.4)
    return member;
  },
});

/**
 * Gets the total count of members with optional filters.
 * For dashboard statistics.
 * 
 * Access control:
 * - Only admin/direttivo can get member counts
 * 
 * @param args.socioAttivo - Optional filter by active status
 * @param args.stato - Optional filter by member status
 * @returns Total count of members matching filters
 */
export const getMemberCount = query({
  args: {
    socioAttivo: v.optional(v.boolean()),
    stato: v.optional(
      v.union(
        v.literal("attivo"),
        v.literal("sospeso"),
        v.literal("dimesso")
      )
    ),
  },
  handler: async (ctx, args): Promise<number> => {
    // Check permissions - only admin/direttivo can get counts
    const profile = await getOptionalProfile(ctx);
    if (!profile) {
      throw new Error("Non autenticato");
    }
    
    if (!isAdminOrDirettivo(profile)) {
      throw new Error("Accesso negato: solo admin e direttivo possono visualizzare le statistiche");
    }

    // Collect members - use index if socioAttivo filter is provided
    let members: Doc<"members">[];
    if (args.socioAttivo !== undefined) {
      members = await ctx.db
        .query("members")
        .withIndex("by_socio_attivo", (q) => q.eq("socioAttivo", args.socioAttivo!))
        .collect();
    } else {
      members = await ctx.db.query("members").collect();
    }
    
    // Apply stato filter
    if (args.stato !== undefined) {
      members = members.filter((m) => m.stato === args.stato);
    }
    
    return members.length;
  },
});
