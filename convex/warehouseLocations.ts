/**
 * Warehouse Locations Management
 * 
 * CRUD operations for warehouse locations.
 * Access: admin, direttivo
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Non autenticato");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
      .first();

    if (!profile || !["admin", "direttivo"].includes(profile.role)) {
      throw new Error("Non hai i permessi per modificare le ubicazioni");
    }

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Non autenticato");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
      .first();

    if (!profile || !["admin", "direttivo"].includes(profile.role)) {
      throw new Error("Non hai i permessi per eliminare le ubicazioni");
    }

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
