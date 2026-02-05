/**
 * Warehouse Locations Management
 * 
 * CRUD operations for warehouse locations.
 * Access: admin, direttivo
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, requireAdminOrDirettivo } from "./lib/auth";

/**
 * List all locations (active or all)
 */
export const list = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    let locations;
    if (args.activeOnly) {
      locations = await ctx.db
        .query("warehouseLocations")
        .withIndex("by_attiva", (q) => q.eq("attiva", true))
        .collect();
    } else {
      locations = await ctx.db.query("warehouseLocations").collect();
    }

    return locations.sort((a, b) => a.nome.localeCompare(b.nome));
  },
});

/**
 * Get single location
 */
export const get = query({
  args: { id: v.id("warehouseLocations") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

/**
 * Create or update location
 * Only admin and direttivo
 */
export const upsert = mutation({
  args: {
    id: v.optional(v.id("warehouseLocations")),
    nome: v.string(),
    descrizione: v.optional(v.string()),
    attiva: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdminOrDirettivo(ctx);

    const now = Date.now();
    const { id, ...data } = args;

    // Check for duplicate name
    const existing = await ctx.db
      .query("warehouseLocations")
      .withIndex("by_nome", (q) => q.eq("nome", data.nome))
      .first();

    if (existing && existing._id !== id) {
      throw new Error("Esiste già un'ubicazione con questo nome");
    }

    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: now });
      return id;
    } else {
      return await ctx.db.insert("warehouseLocations", {
        ...data,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Delete location
 * Only if no equipment is associated
 */
export const remove = mutation({
  args: { id: v.id("warehouseLocations") },
  handler: async (ctx, args) => {
    await requireAdminOrDirettivo(ctx);

    // Check for associated equipment
    const equipment = await ctx.db
      .query("equipment")
      .withIndex("by_ubicazione", (q) => q.eq("ubicazioneId", args.id))
      .first();

    if (equipment) {
      throw new Error(
        "Impossibile eliminare: ci sono attrezzature associate a questa ubicazione. Disattivala invece."
      );
    }

    await ctx.db.delete(args.id);
  },
});
