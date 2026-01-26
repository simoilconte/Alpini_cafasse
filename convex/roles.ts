import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Permessi disponibili nel sistema
export const PERMISSIONS = {
  // Utenti
  "users:read": "Visualizza utenti",
  "users:write": "Gestisci utenti",
  "users:delete": "Elimina utenti",
  // Ruoli
  "roles:read": "Visualizza ruoli",
  "roles:write": "Gestisci ruoli",
  // Soci
  "members:read": "Visualizza soci",
  "members:write": "Gestisci soci",
  "members:delete": "Elimina soci",
  // Tessere
  "memberships:read": "Visualizza tessere",
  "memberships:write": "Gestisci tessere",
  // Eventi
  "events:read": "Visualizza eventi",
  "events:write": "Gestisci eventi",
  "events:delete": "Elimina eventi",
  // Dashboard
  "dashboard:stats": "Visualizza statistiche",
} as const;

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

// Lista tutti i ruoli
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const roles = await ctx.db
      .query("roles")
      .withIndex("by_sort_order")
      .collect();

    return roles;
  },
});

// Ottieni un ruolo per ID
export const getById = query({
  args: { roleId: v.id("roles") },
  handler: async (ctx, { roleId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db.get(roleId);
  },
});

// Ottieni un ruolo per nome
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    return await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
  },
});

// Crea un nuovo ruolo (solo admin)
export const create = mutation({
  args: {
    name: v.string(),
    displayName: v.string(),
    description: v.optional(v.string()),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Verifica che il nome non esista già
    const existing = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error("Esiste già un ruolo con questo nome");
    }

    // Trova il prossimo sortOrder
    const roles = await ctx.db.query("roles").collect();
    const maxOrder = roles.reduce((max, r) => Math.max(max, r.sortOrder), 0);

    const now = Date.now();
    return await ctx.db.insert("roles", {
      name: args.name,
      displayName: args.displayName,
      description: args.description,
      permissions: args.permissions,
      isSystem: false,
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Aggiorna un ruolo (solo admin)
export const update = mutation({
  args: {
    roleId: v.id("roles"),
    displayName: v.optional(v.string()),
    description: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const role = await ctx.db.get(args.roleId);
    if (!role) throw new Error("Ruolo non trovato");

    const updates: any = { updatedAt: Date.now() };
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.description !== undefined) updates.description = args.description;
    if (args.permissions !== undefined) updates.permissions = args.permissions;

    await ctx.db.patch(args.roleId, updates);
    return args.roleId;
  },
});

// Elimina un ruolo (solo admin, non system)
export const remove = mutation({
  args: { roleId: v.id("roles") },
  handler: async (ctx, { roleId }) => {
    await requireAdmin(ctx);

    const role = await ctx.db.get(roleId);
    if (!role) throw new Error("Ruolo non trovato");

    if (role.isSystem) {
      throw new Error("Non puoi eliminare un ruolo di sistema");
    }

    // Verifica che nessun utente abbia questo ruolo
    const usersWithRole = await ctx.db
      .query("profiles")
      .withIndex("by_role_id", (q) => q.eq("roleId", roleId))
      .collect();

    if (usersWithRole.length > 0) {
      throw new Error(`Ci sono ${usersWithRole.length} utenti con questo ruolo. Riassegnali prima di eliminare.`);
    }

    await ctx.db.delete(roleId);
  },
});

// Lista permessi disponibili
export const getPermissions = query({
  args: {},
  handler: async () => {
    return Object.entries(PERMISSIONS).map(([key, label]) => ({
      key,
      label,
    }));
  },
});

// Seed ruoli di default (internal)
export const seedDefaultRoles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("roles").collect();
    if (existing.length > 0) return { message: "Ruoli già esistenti" };

    const now = Date.now();

    // Admin - tutti i permessi
    await ctx.db.insert("roles", {
      name: "admin",
      displayName: "Amministratore",
      description: "Accesso completo al sistema",
      permissions: Object.keys(PERMISSIONS),
      isSystem: true,
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    });

    // Direttivo - gestione soci, tessere, eventi
    await ctx.db.insert("roles", {
      name: "direttivo",
      displayName: "Direttivo",
      description: "Gestione operativa dell'associazione",
      permissions: [
        "members:read", "members:write",
        "memberships:read", "memberships:write",
        "events:read", "events:write",
        "dashboard:stats",
      ],
      isSystem: true,
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    });

    // Socio - solo lettura
    await ctx.db.insert("roles", {
      name: "socio",
      displayName: "Socio",
      description: "Accesso base per i soci",
      permissions: [
        "members:read",
        "events:read",
      ],
      isSystem: true,
      sortOrder: 3,
      createdAt: now,
      updatedAt: now,
    });

    return { message: "Ruoli di default creati" };
  },
});
