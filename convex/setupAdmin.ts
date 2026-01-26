import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Lista tutti gli utenti
export const listUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const accounts = await ctx.db.query("authAccounts").collect();
    const profiles = await ctx.db.query("profiles").collect();
    const roles = await ctx.db.query("roles").collect();
    return { users, accounts, profiles, roles };
  },
});

// Crea profilo admin per un utente
export const createAdminProfile = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Trova il ruolo admin
    const adminRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "admin"))
      .first();

    if (!adminRole) {
      throw new Error("Ruolo admin non trovato. Esegui prima seedDefaultRoles.");
    }

    // Verifica se esiste già un profilo
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      // Aggiorna a admin con roleId
      await ctx.db.patch(existing._id, { 
        role: "admin", 
        roleId: adminRole._id,
        updatedAt: Date.now() 
      });
      return { action: "updated", profileId: existing._id };
    }

    // Crea nuovo profilo admin
    const now = Date.now();
    const profileId = await ctx.db.insert("profiles", {
      userId,
      roleId: adminRole._id,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });

    return { action: "created", profileId };
  },
});

// Aggiorna tutti i profili esistenti con roleId
export const migrateProfilesToRoleId = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    const roles = await ctx.db.query("roles").collect();
    
    const roleMap = new Map(roles.map(r => [r.name, r._id]));
    
    let updated = 0;
    for (const profile of profiles) {
      if (!profile.roleId && profile.role) {
        const roleId = roleMap.get(profile.role);
        if (roleId) {
          await ctx.db.patch(profile._id, { roleId });
          updated++;
        }
      }
    }
    
    return { updated };
  },
});
