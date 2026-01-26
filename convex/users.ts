import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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

// Lista tutti gli utenti con profili (solo admin)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile || profile.role !== "admin") {
      return [];
    }

    // Ottieni tutti gli utenti
    const users = await ctx.db.query("users").collect();
    
    // Ottieni tutti i profili
    const profiles = await ctx.db.query("profiles").collect();
    
    // Ottieni tutti i ruoli
    const roles = await ctx.db.query("roles").collect();
    const rolesMap = new Map(roles.map(r => [r._id, r]));

    // Combina i dati
    return users.map(user => {
      const userProfile = profiles.find(p => p.userId === user._id);
      const role = userProfile?.roleId ? rolesMap.get(userProfile.roleId) : null;
      
      return {
        _id: user._id,
        email: user.email || "N/A",
        profile: userProfile ? {
          _id: userProfile._id,
          role: userProfile.role,
          roleId: userProfile.roleId,
          roleName: role?.displayName || userProfile.role,
          memberId: userProfile.memberId,
          createdAt: userProfile.createdAt,
        } : null,
        createdAt: user._creationTime,
      };
    });
  },
});

// Ottieni dettagli utente (solo admin)
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    let role = null;
    if (profile?.roleId) {
      role = await ctx.db.get(profile.roleId);
    }

    return {
      ...user,
      profile,
      roleDetails: role,
    };
  },
});

// Aggiorna ruolo utente (solo admin)
export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, { userId, roleId }) => {
    await requireAdmin(ctx);

    // Verifica che il ruolo esista
    const role = await ctx.db.get(roleId);
    if (!role) throw new Error("Ruolo non trovato");

    // Trova o crea il profilo
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (profile) {
      await ctx.db.patch(profile._id, {
        roleId,
        role: role.name,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("profiles", {
        userId,
        roleId,
        role: role.name,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Crea nuovo utente con password (solo admin)
// NOTA: Questa funzione richiede che l'utente si registri manualmente
// perché la creazione di password hash richiede il runtime Node
export const createUser = mutation({
  args: {
    email: v.string(),
    roleId: v.id("roles"),
  },
  handler: async (ctx, { email, roleId }) => {
    await requireAdmin(ctx);

    // Verifica che l'email non esista già
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();

    if (existingUser) {
      throw new Error("Esiste già un utente con questa email");
    }

    // Verifica che il ruolo esista
    const role = await ctx.db.get(roleId);
    if (!role) throw new Error("Ruolo non trovato");

    // Crea l'utente (senza password - dovrà registrarsi)
    const userId = await ctx.db.insert("users", {
      email,
    });

    // Crea il profilo
    const now = Date.now();
    await ctx.db.insert("profiles", {
      userId,
      roleId,
      role: role.name,
      createdAt: now,
      updatedAt: now,
    });

    return { userId, message: "Utente creato. Dovrà registrarsi con questa email." };
  },
});

// Elimina utente (solo admin)
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const { userId: currentUserId } = await requireAdmin(ctx);

    // Non puoi eliminare te stesso
    if (userId === currentUserId) {
      throw new Error("Non puoi eliminare il tuo account");
    }

    // Elimina sessioni
    const sessions = await ctx.db
      .query("authSessions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    
    for (const session of sessions) {
      // Elimina refresh tokens della sessione
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .filter((q) => q.eq(q.field("sessionId"), session._id))
        .collect();
      
      for (const token of tokens) {
        await ctx.db.delete(token._id);
      }
      
      await ctx.db.delete(session._id);
    }

    // Elimina account auth
    const accounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    
    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }

    // Elimina profilo
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (profile) {
      await ctx.db.delete(profile._id);
    }

    // Elimina utente
    await ctx.db.delete(userId);

    return { success: true };
  },
});

// Conta utenti
export const getCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const users = await ctx.db.query("users").collect();
    return users.length;
  },
});
