/**
 * App Settings Management
 * 
 * Key-value store for application settings.
 * Distribution settings: admin/direttivo only
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAdminOrDirettivo, requireBorseSpesaAccess, requireAuth } from "./lib/auth";

// Setting keys
export const SETTING_KEYS = {
  ACTIVE_DISTRIBUTION_WEEKDAYS: "activeDistributionWeekdays",
} as const;

/**
 * Get distribution settings (active weekdays)
 * Returns array of weekday numbers: 0=Sunday, 1=Monday, ..., 6=Saturday
 */
export const getDistributionSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireBorseSpesaAccess(ctx);

    const setting = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", SETTING_KEYS.ACTIVE_DISTRIBUTION_WEEKDAYS))
      .unique();

    // Default: Monday, Wednesday, Friday (1, 3, 5)
    return (setting?.value as number[]) ?? [1, 3, 5];
  },
});

/**
 * Update distribution active weekdays
 * Only admin/direttivo can update
 */
export const updateDistributionWeekdays = mutation({
  args: {
    weekdays: v.array(v.number()), // Array of 0-6
  },
  handler: async (ctx, args) => {
    await requireAdminOrDirettivo(ctx);
    const { userId } = await requireAuth(ctx);

    // Validate weekdays
    for (const day of args.weekdays) {
      if (day < 0 || day > 6) {
        throw new Error("Giorno non valido. Usa 0-6 (Dom-Sab)");
      }
    }

    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", SETTING_KEYS.ACTIVE_DISTRIBUTION_WEEKDAYS))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.weekdays,
        updatedAt: now,
        updatedBy: userId,
      });
    } else {
      await ctx.db.insert("appSettings", {
        key: SETTING_KEYS.ACTIVE_DISTRIBUTION_WEEKDAYS,
        value: args.weekdays,
        updatedAt: now,
        updatedBy: userId,
      });
    }
  },
});
