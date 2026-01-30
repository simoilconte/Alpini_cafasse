/**
 * Beneficiary Families Management
 * 
 * CRUD operations for families receiving food bags (borse spesa).
 * Access: admin, direttivo, operatore
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireBorseSpesaAccess } from "./lib/auth";

/**
 * List beneficiary families with optional filters
 */
export const list = query({
  args: {
    attiva: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireBorseSpesaAccess(ctx);

    let families;
    
    if (args.attiva !== undefined) {
      families = await ctx.db
        .query("beneficiaryFamilies")
        .withIndex("by_attiva", (q) => q.eq("attiva", args.attiva!))
        .collect();
    } else {
      families = await ctx.db.query("beneficiaryFamilies").collect();
    }

    // Filter by search if provided
    if (args.search && args.search.trim()) {
      const searchLower = args.search.toLowerCase().trim();
      families = families.filter(
        (f) =>
          f.referenteNome.toLowerCase().includes(searchLower) ||
          f.referenteCognome.toLowerCase().includes(searchLower)
      );
    }

    // Sort by cognome
    families.sort((a, b) => 
      a.referenteCognome.localeCompare(b.referenteCognome)
    );

    return families;
  },
});

/**
 * Get a single beneficiary family by ID
 */
export const get = query({
  args: { id: v.id("beneficiaryFamilies") },
  handler: async (ctx, args) => {
    await requireBorseSpesaAccess(ctx);
    return await ctx.db.get(args.id);
  },
});

/**
 * Create or update a beneficiary family
 */
export const upsert = mutation({
  args: {
    id: v.optional(v.id("beneficiaryFamilies")),
    referenteNome: v.string(),
    referenteCognome: v.string(),
    componentiNucleo: v.number(),
    deliveryLocation: v.optional(v.string()),
    attiva: v.boolean(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireBorseSpesaAccess(ctx);

    const now = Date.now();
    const { id, ...data } = args;

    if (id) {
      // Update existing
      await ctx.db.patch(id, {
        ...data,
        updatedAt: now,
      });
      return id;
    } else {
      // Create new
      return await ctx.db.insert("beneficiaryFamilies", {
        ...data,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Toggle family active status
 */
export const toggleActive = mutation({
  args: {
    id: v.id("beneficiaryFamilies"),
    attiva: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireBorseSpesaAccess(ctx);

    await ctx.db.patch(args.id, {
      attiva: args.attiva,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a beneficiary family
 * Note: Should check if there are deliveries first
 */
export const remove = mutation({
  args: { id: v.id("beneficiaryFamilies") },
  handler: async (ctx, args) => {
    await requireBorseSpesaAccess(ctx);

    // Check for existing deliveries
    const deliveries = await ctx.db
      .query("bagDeliveries")
      .withIndex("by_family", (q) => q.eq("familyId", args.id))
      .first();

    if (deliveries) {
      throw new Error(
        "Impossibile eliminare: esistono consegne associate a questa famiglia. Disattivala invece."
      );
    }

    await ctx.db.delete(args.id);
  },
});
