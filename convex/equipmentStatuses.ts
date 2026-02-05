/**
 * Equipment Statuses Management
 * 
 * CRUD operations for equipment statuses.
 * Access: admin, direttivo
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

/**
 * List all statuses (active or all)
 */
export const list = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    let statuses;
    if (args.activeOnly) {
      statuses = await ctx.db
        .query("equipmentStatuses")
        .withIndex("by_attivo", (q) => q.eq("attivo", true))
        .collect();
    } else {
      statuses = await ctx.db.query("equipmentStatuses").collect();
    }

    return statuses.sort((a, b) => a.nome.localeCompare(b.nome));
  },
});

/**
 * Get single status
 */
export const get = query({
  args: { id: v.id("equipmentStatuses") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

/**
 * Create or update status
 * Only admin and direttivo
 */
export const upsert = mutation({
  args: {
    id: v.optional(v.id("equipmentStatuses")),
    nome: v.string(),
    descrizione: v.optional(v.string()),
    attivo: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Non autenticato");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
      .first();

    if (!profile || !["admin", "direttivo"].includes(profile.role)) {
      throw new Error("Non hai i permessi per modificare gli stati");
    }

    const now = Date.now();
    const { id, ...data } = args;

    // Check for duplicate name
    const existing = await ctx.db
      .query("equipmentStatuses")
      .withIndex("by_nome", (q) => q.eq("nome", data.nome))
      .first();

    if (existing && existing._id !== id) {
      throw new Error("Esiste già uno stato con questo nome");
    }

    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: now });
      return id;
    } else {
      return await ctx.db.insert("equipmentStatuses", {
        ...data,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Delete status
 * Only if no equipment is associated
 */
export const remove = mutation({
  args: { id: v.id("equipmentStatuses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Non autenticato");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
      .first();

    if (!profile || !["admin", "direttivo"].includes(profile.role)) {
      throw new Error("Non hai i permessi per eliminare gli stati");
    }

    // Check for associated equipment
    const equipment = await ctx.db
      .query("equipment")
      .withIndex("by_stato", (q) => q.eq("statoId", args.id))
      .first();

    if (equipment) {
      throw new Error(
        "Impossibile eliminare: ci sono attrezzature associate a questo stato. Disattivalo invece."
      );
    }

    await ctx.db.delete(args.id);
  },
});
