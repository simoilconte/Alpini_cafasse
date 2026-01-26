/**
 * Bag Deliveries Management
 * 
 * Track food bag deliveries to beneficiary families.
 * Enforces: 1 delivery per family per day.
 * Access: admin, direttivo, operatore
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireBorseSpesaAccess, requireAuth } from "./lib/auth";

/**
 * Create a new bag delivery
 * Enforces: max 1 delivery per family per day
 */
export const create = mutation({
  args: {
    familyId: v.id("beneficiaryFamilies"),
    deliveryDate: v.string(), // "YYYY-MM-DD"
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireBorseSpesaAccess(ctx);
    const { userId } = await requireAuth(ctx);

    // Check family exists and is active
    const family = await ctx.db.get(args.familyId);
    if (!family) {
      throw new Error("Famiglia non trovata");
    }
    if (!family.attiva) {
      throw new Error("Impossibile consegnare: la famiglia non è attiva");
    }

    // Check for existing delivery on same day (enforce 1/day rule)
    const existingDelivery = await ctx.db
      .query("bagDeliveries")
      .withIndex("by_family_date", (q) =>
        q.eq("familyId", args.familyId).eq("deliveryDate", args.deliveryDate)
      )
      .first();

    if (existingDelivery) {
      throw new Error(
        `Consegna già registrata per oggi (${args.deliveryDate}). Una sola borsa al giorno per famiglia.`
      );
    }

    const now = Date.now();

    return await ctx.db.insert("bagDeliveries", {
      familyId: args.familyId,
      deliveredAt: now,
      deliveryDate: args.deliveryDate,
      operatorUserId: userId,
      notes: args.notes,
      emptyBagReturned: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * List deliveries by date
 */
export const listByDate = query({
  args: { deliveryDate: v.string() },
  handler: async (ctx, args) => {
    await requireBorseSpesaAccess(ctx);

    const deliveries = await ctx.db
      .query("bagDeliveries")
      .withIndex("by_delivery_date", (q) => q.eq("deliveryDate", args.deliveryDate))
      .collect();

    // Enrich with family data
    const enriched = await Promise.all(
      deliveries.map(async (d) => {
        const family = await ctx.db.get(d.familyId);
        return { ...d, family };
      })
    );

    return enriched;
  },
});

/**
 * List deliveries by family (history)
 */
export const listByFamily = query({
  args: { familyId: v.id("beneficiaryFamilies") },
  handler: async (ctx, args) => {
    await requireBorseSpesaAccess(ctx);

    const deliveries = await ctx.db
      .query("bagDeliveries")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .order("desc")
      .collect();

    return deliveries;
  },
});

/**
 * Get unreturned deliveries for a family
 */
export const getUnreturnedByFamily = query({
  args: { familyId: v.id("beneficiaryFamilies") },
  handler: async (ctx, args) => {
    await requireBorseSpesaAccess(ctx);

    const deliveries = await ctx.db
      .query("bagDeliveries")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("emptyBagReturned"), false))
      .order("desc")
      .collect();

    return deliveries;
  },
});

/**
 * Mark empty bag as returned
 */
export const markReturned = mutation({
  args: { deliveryId: v.id("bagDeliveries") },
  handler: async (ctx, args) => {
    await requireBorseSpesaAccess(ctx);

    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) {
      throw new Error("Consegna non trovata");
    }

    if (delivery.emptyBagReturned) {
      throw new Error("Borsa già segnata come resa");
    }

    await ctx.db.patch(args.deliveryId, {
      emptyBagReturned: true,
      emptyBagReturnedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get warning counts for all families (unreturned bags count)
 * Returns a map: familyId -> count of unreturned bags
 */
export const getFamilyWarningCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireBorseSpesaAccess(ctx);

    // Get all unreturned deliveries
    const unreturned = await ctx.db
      .query("bagDeliveries")
      .withIndex("by_empty_bag_returned", (q) => q.eq("emptyBagReturned", false))
      .collect();

    // Count by family
    const counts: Record<string, number> = {};
    for (const d of unreturned) {
      const key = d.familyId;
      counts[key] = (counts[key] || 0) + 1;
    }

    return counts;
  },
});

/**
 * Delete/cancel a delivery (undo)
 */
export const remove = mutation({
  args: { deliveryId: v.id("bagDeliveries") },
  handler: async (ctx, args) => {
    await requireBorseSpesaAccess(ctx);

    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) {
      throw new Error("Consegna non trovata");
    }

    await ctx.db.delete(args.deliveryId);
  },
});

/**
 * List all deliveries with optional filters (for registry page)
 */
export const listAll = query({
  args: {
    familyId: v.optional(v.id("beneficiaryFamilies")),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireBorseSpesaAccess(ctx);

    let deliveries = await ctx.db
      .query("bagDeliveries")
      .order("desc")
      .collect();

    // Filter by family
    if (args.familyId) {
      deliveries = deliveries.filter((d) => d.familyId === args.familyId);
    }

    // Filter by date range
    if (args.dateFrom) {
      deliveries = deliveries.filter((d) => d.deliveryDate >= args.dateFrom!);
    }
    if (args.dateTo) {
      deliveries = deliveries.filter((d) => d.deliveryDate <= args.dateTo!);
    }

    // Enrich with family data
    const enriched = await Promise.all(
      deliveries.map(async (d) => {
        const family = await ctx.db.get(d.familyId);
        return { ...d, family };
      })
    );

    return enriched;
  },
});

/**
 * Check if family already has delivery today
 */
export const hasDeliveryToday = query({
  args: {
    familyId: v.id("beneficiaryFamilies"),
    deliveryDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireBorseSpesaAccess(ctx);

    const existing = await ctx.db
      .query("bagDeliveries")
      .withIndex("by_family_date", (q) =>
        q.eq("familyId", args.familyId).eq("deliveryDate", args.deliveryDate)
      )
      .first();

    return !!existing;
  },
});
