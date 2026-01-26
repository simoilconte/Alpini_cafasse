import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper per verificare se l'utente è admin
async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Non autenticato");

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!profile || profile.role !== "admin") {
    throw new Error("Solo gli amministratori possono eseguire questa operazione");
  }

  return { userId, profile };
}

// Lista tutti gli status attivi
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("memberStatuses")
      .withIndex("by_sort_order")
      .collect();
  },
});

// Lista solo status attivi (per dropdown)
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const statuses = await ctx.db
      .query("memberStatuses")
      .withIndex("by_active", (q: any) => q.eq("isActive", true))
      .collect();

    return statuses.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Ottieni uno status per ID
export const getById = query({
  args: { statusId: v.id("memberStatuses") },
  handler: async (ctx, { statusId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db.get(statusId);
  },
});

// Crea un nuovo status (solo admin)
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Verifica che il nome non esista già
    const existing = await ctx.db
      .query("memberStatuses")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error("Esiste già uno status con questo nome");
    }

    // Trova il prossimo sortOrder
    const statuses = await ctx.db.query("memberStatuses").collect();
    const maxOrder = statuses.reduce((max, s) => Math.max(max, s.sortOrder), 0);

    const now = Date.now();
    return await ctx.db.insert("memberStatuses", {
      name: args.name,
      description: args.description,
      color: args.color || "#6B7280",
      sortOrder: maxOrder + 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Aggiorna uno status (solo admin)
export const update = mutation({
  args: {
    statusId: v.id("memberStatuses"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const status = await ctx.db.get(args.statusId);
    if (!status) throw new Error("Status non trovato");

    // Se cambia il nome, verifica unicità
    if (args.name && args.name !== status.name) {
      const existing = await ctx.db
        .query("memberStatuses")
        .withIndex("by_name", (q) => q.eq("name", args.name!))
        .first();

      if (existing) {
        throw new Error("Esiste già uno status con questo nome");
      }
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.color !== undefined) updates.color = args.color;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.statusId, updates);
    return args.statusId;
  },
});

// Elimina uno status (solo admin)
export const remove = mutation({
  args: { statusId: v.id("memberStatuses") },
  handler: async (ctx, { statusId }) => {
    await requireAdmin(ctx);

    const status = await ctx.db.get(statusId);
    if (!status) throw new Error("Status non trovato");

    // Verifica che nessun socio abbia questo status
    const membersWithStatus = await ctx.db
      .query("members")
      .withIndex("by_status", (q: any) => q.eq("statusId", statusId))
      .collect();

    if (membersWithStatus.length > 0) {
      throw new Error(`Ci sono ${membersWithStatus.length} soci con questo status. Riassegnali prima di eliminare.`);
    }

    await ctx.db.delete(statusId);
  },
});

// Riordina gli status (solo admin)
export const reorder = mutation({
  args: {
    statusIds: v.array(v.id("memberStatuses")),
  },
  handler: async (ctx, { statusIds }) => {
    await requireAdmin(ctx);

    const now = Date.now();
    for (let i = 0; i < statusIds.length; i++) {
      await ctx.db.patch(statusIds[i], {
        sortOrder: i + 1,
        updatedAt: now,
      });
    }
  },
});

// Seed status di default (internal)
export const seedDefaultStatuses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("memberStatuses").collect();
    if (existing.length > 0) return { message: "Status già esistenti" };

    const now = Date.now();
    const defaultStatuses = [
      { name: "Presidente", color: "#C41E3A", sortOrder: 1 },
      { name: "Vicepresidente", color: "#009246", sortOrder: 2 },
      { name: "Segretario", color: "#1E40AF", sortOrder: 3 },
      { name: "Tesoriere", color: "#7C3AED", sortOrder: 4 },
      { name: "Consigliere", color: "#0891B2", sortOrder: 5 },
      { name: "Socio Ordinario", color: "#6B7280", sortOrder: 6 },
    ];

    for (const status of defaultStatuses) {
      await ctx.db.insert("memberStatuses", {
        name: status.name,
        color: status.color,
        sortOrder: status.sortOrder,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { message: "Status di default creati" };
  },
});
