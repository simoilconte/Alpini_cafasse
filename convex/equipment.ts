/**
 * Equipment Management
 * 
 * CRUD operations for equipment inventory.
 * Access: admin and direttivo can modify, operatore can only view
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, requireAdminOrDirettivo } from "./lib/auth";

/**
 * List equipment with filters
 */
export const list = query({
  args: {
    search: v.optional(v.string()),
    ubicazioneId: v.optional(v.id("warehouseLocations")),
    statoId: v.optional(v.id("equipmentStatuses")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    let equipment = await ctx.db.query("equipment").collect();

    // Filter by location
    if (args.ubicazioneId) {
      equipment = equipment.filter((e) => e.ubicazioneId === args.ubicazioneId);
    }

    // Filter by status
    if (args.statoId) {
      equipment = equipment.filter((e) => e.statoId === args.statoId);
    }

    // Filter by search
    if (args.search && args.search.trim()) {
      const searchLower = args.search.toLowerCase().trim();
      equipment = equipment.filter(
        (e) =>
          e.nome.toLowerCase().includes(searchLower) ||
          (e.codice && e.codice.toLowerCase().includes(searchLower))
      );
    }

    // Fetch related data
    const equipmentWithDetails = await Promise.all(
      equipment.map(async (e) => {
        const ubicazione = await ctx.db.get(e.ubicazioneId);
        const stato = await ctx.db.get(e.statoId);
        return {
          ...e,
          ubicazione,
          stato,
        };
      })
    );

    return equipmentWithDetails.sort((a, b) => a.nome.localeCompare(b.nome));
  },
});

/**
 * Get single equipment
 */
export const get = query({
  args: { id: v.id("equipment") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    const equipment = await ctx.db.get(args.id);
    if (!equipment) return null;

    const ubicazione = await ctx.db.get(equipment.ubicazioneId);
    const stato = await ctx.db.get(equipment.statoId);

    return {
      ...equipment,
      ubicazione,
      stato,
    };
  },
});

/**
 * Create or update equipment
 * Only admin and direttivo
 */
export const upsert = mutation({
  args: {
    id: v.optional(v.id("equipment")),
    nome: v.string(),
    codice: v.optional(v.string()),
    ubicazioneId: v.id("warehouseLocations"),
    statoId: v.id("equipmentStatuses"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminOrDirettivo(ctx);

    const now = Date.now();
    const { id, ...data } = args;

    // Validate location is active
    const location = await ctx.db.get(data.ubicazioneId);
    if (!location || !location.attiva) {
      throw new Error("L'ubicazione selezionata non è attiva");
    }

    // Validate status is active
    const status = await ctx.db.get(data.statoId);
    if (!status || !status.attivo) {
      throw new Error("Lo stato selezionato non è attivo");
    }

    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: now });
      return id;
    } else {
      return await ctx.db.insert("equipment", {
        ...data,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Delete equipment
 * Only admin and direttivo
 */
export const remove = mutation({
  args: { id: v.id("equipment") },
  handler: async (ctx, args) => {
    await requireAdminOrDirettivo(ctx);
    await ctx.db.delete(args.id);
  },
});

/**
 * Get equipment count by location
 */
export const countByLocation = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const equipment = await ctx.db.query("equipment").collect();
    const counts: Record<string, number> = {};

    for (const e of equipment) {
      counts[e.ubicazioneId] = (counts[e.ubicazioneId] || 0) + 1;
    }

    return counts;
  },
});

/**
 * Get equipment count by status
 */
export const countByStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const equipment = await ctx.db.query("equipment").collect();
    const counts: Record<string, number> = {};

    for (const e of equipment) {
      counts[e.statoId] = (counts[e.statoId] || 0) + 1;
    }

    return counts;
  },
});
