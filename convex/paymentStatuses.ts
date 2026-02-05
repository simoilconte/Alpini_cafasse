/**
 * Payment Statuses Management
 * 
 * CRUD operations for payment statuses.
 * Access: admin, direttivo
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, requireAdminOrDirettivo } from "./lib/auth";

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
        .query("paymentStatuses")
        .withIndex("by_attivo", (q) => q.eq("attivo", true))
        .collect();
    } else {
      statuses = await ctx.db.query("paymentStatuses").collect();
    }

    return statuses.sort((a, b) => a.nome.localeCompare(b.nome));
  },
});

/**
 * Get single status
 */
export const get = query({
  args: { id: v.id("paymentStatuses") },
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
    id: v.optional(v.id("paymentStatuses")),
    nome: v.string(),
    descrizione: v.optional(v.string()),
    attivo: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdminOrDirettivo(ctx);

    const now = Date.now();
    const { id, ...data } = args;

    // Check for duplicate name
    const existing = await ctx.db
      .query("paymentStatuses")
      .withIndex("by_nome", (q) => q.eq("nome", data.nome))
      .first();

    if (existing && existing._id !== id) {
      throw new Error("Esiste già uno stato con questo nome");
    }

    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: now });
      return id;
    } else {
      return await ctx.db.insert("paymentStatuses", {
        ...data,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Delete status
 * Only if no payments are associated
 */
export const remove = mutation({
  args: { id: v.id("paymentStatuses") },
  handler: async (ctx, args) => {
    await requireAdminOrDirettivo(ctx);

    // Check for associated payments
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("statusId", args.id))
      .first();

    if (payment) {
      throw new Error(
        "Impossibile eliminare: ci sono pagamenti associati a questo stato. Disattivalo invece."
      );
    }

    await ctx.db.delete(args.id);
  },
});
