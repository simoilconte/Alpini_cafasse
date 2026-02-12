import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// List all movement statuses
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    return await ctx.db
      .query("movementStatuses")
      .withIndex("by_attivo", (q) => q.eq("attivo", true))
      .collect();
  },
});

// Get by ID
export const getById = query({
  args: { id: v.id("movementStatuses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    return await ctx.db.get(args.id);
  },
});

// Create movement status
export const create = mutation({
  args: {
    nome: v.string(),
    descrizione: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // Check permissions
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !["admin", "direttivo"].includes(profile.role)) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();

    // Check if name already exists
    const existing = await ctx.db
      .query("movementStatuses")
      .withIndex("by_nome", (q) => q.eq("nome", args.nome))
      .first();

    if (existing) {
      throw new Error("Stato con questo nome già esistente");
    }

    const statusId = await ctx.db.insert("movementStatuses", {
      nome: args.nome,
      descrizione: args.descrizione,
      attivo: true,
      createdAt: now,
      updatedAt: now,
    });

    return statusId;
  },
});

// Update movement status
export const update = mutation({
  args: {
    id: v.id("movementStatuses"),
    nome: v.string(),
    descrizione: v.optional(v.string()),
    attivo: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // Check permissions
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !["admin", "direttivo"].includes(profile.role)) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();

    // Check if name already exists (excluding current)
    const existing = await ctx.db
      .query("movementStatuses")
      .withIndex("by_nome", (q) => q.eq("nome", args.nome))
      .first();

    if (existing && existing._id !== args.id) {
      throw new Error("Stato con questo nome già esistente");
    }

    await ctx.db.patch(args.id, {
      nome: args.nome,
      descrizione: args.descrizione,
      attivo: args.attivo,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Remove movement status
export const remove = mutation({
  args: { id: v.id("movementStatuses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // Check permissions
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !["admin", "direttivo"].includes(profile.role)) {
      throw new Error("Unauthorized");
    }

    // Check if status is being used
    const movementsUsing = await ctx.db
      .query("movements")
      .withIndex("by_status", (q) => q.eq("statusId", args.id))
      .first();

    if (movementsUsing) {
      throw new Error("Impossibile eliminare: questo stato è utilizzato da movimenti");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});
