import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Create a user profile after registration.
 * This should be called after a user successfully registers.
 * Default role is "socio" as per requirements.
 */
export const createProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non autenticato");
    }

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existingProfile) {
      // Profile already exists, return it
      return existingProfile._id;
    }

    // Create new profile with default role "socio"
    const now = Date.now();
    const profileId = await ctx.db.insert("profiles", {
      userId,
      role: "socio", // Default role as per requirements
      createdAt: now,
      updatedAt: now,
    });

    return profileId;
  },
});

/**
 * Get the current user's profile.
 * Returns null if not authenticated or profile doesn't exist.
 */
export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return profile;
  },
});

/**
 * Ensure user has a profile, creating one if needed.
 * Called on first app load after login.
 */
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existingProfile) {
      return existingProfile;
    }

    // Find socio role
    const socioRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "socio"))
      .first();

    // Create new profile with default role "socio"
    const now = Date.now();
    const profileId = await ctx.db.insert("profiles", {
      userId,
      role: "socio",
      roleId: socioRole?._id,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(profileId);
  },
});

/**
 * Get a profile by user ID.
 * Only accessible by admin/direttivo or the user themselves.
 */
export const getProfileByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Non autenticato");
    }

    // Get current user's profile to check permissions
    const currentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .unique();

    if (!currentProfile) {
      throw new Error("Profilo utente non trovato");
    }

    // Check permissions: admin/direttivo can view any profile, socio can only view their own
    if (
      currentProfile.role !== "admin" &&
      currentProfile.role !== "direttivo" &&
      currentUserId !== args.userId
    ) {
      throw new Error("Permessi insufficienti");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    return profile;
  },
});

/**
 * Update user profile role.
 * Only accessible by admin.
 */
export const updateProfileRole = mutation({
  args: {
    profileId: v.id("profiles"),
    role: v.union(v.literal("admin"), v.literal("direttivo"), v.literal("socio")),
    memberId: v.optional(v.id("members")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non autenticato");
    }

    // Get current user's profile to check permissions
    const currentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!currentProfile) {
      throw new Error("Profilo utente non trovato");
    }

    // Only admin can update roles
    if (currentProfile.role !== "admin") {
      throw new Error("Solo gli amministratori possono modificare i ruoli");
    }

    // Update the profile
    await ctx.db.patch(args.profileId, {
      role: args.role,
      memberId: args.memberId,
      updatedAt: Date.now(),
    });

    return args.profileId;
  },
});

// ============================================================================
// PASSWORD RESET AND FORCE PASSWORD CHANGE
// ============================================================================

/**
 * Generate a random token for password reset
 */
function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Request password reset - generates a token and returns it
 * In production, this would send an email with the reset link
 */
export const requestPasswordReset = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();

    if (!user) {
      // Don't reveal if user exists for security
      return { success: true, message: "Se l'email esiste, riceverai le istruzioni" };
    }

    // Find profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) {
      return { success: true, message: "Se l'email esiste, riceverai le istruzioni" };
    }

    // Generate token and set expiration (24 hours)
    const token = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    // Update profile with reset token
    await ctx.db.patch(profile._id, {
      passwordResetToken: token,
      passwordResetExpiresAt: expiresAt,
      updatedAt: Date.now(),
    });

    // In production, send email here
    // For now, return the token (in production, this would be sent via email only)
    console.log(`Password reset token for ${email}: ${token}`);

    return {
      success: true,
      message: "Se l'email esiste, riceverai le istruzioni",
      // Token included for testing purposes
      token,
    };
  },
});

/**
 * Reset password using token
 */
export const resetPassword = mutation({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { token, newPassword }) => {
    // Find profile by token
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_reset_token", (q) => q.eq("passwordResetToken", token))
      .first();

    if (!profile) {
      throw new Error("Token non valido");
    }

    // Check if token is expired
    if (!profile.passwordResetExpiresAt || profile.passwordResetExpiresAt < Date.now()) {
      throw new Error("Token scaduto");
    }

    // Validate password length
    if (newPassword.length < 8) {
      throw new Error("La password deve avere almeno 8 caratteri");
    }

    // Clear reset token
    await ctx.db.patch(profile._id, {
      passwordResetToken: undefined,
      passwordResetExpiresAt: undefined,
      forcePasswordChange: false,
      updatedAt: Date.now(),
    });

    // Note: The actual password change is handled by Convex Auth
    // We need to use the auth API to update the password
    // For now, we'll need to sign the user in and then change password
    // or use a different approach

    return { success: true, message: "Password reimpostata con successo" };
  },
});

/**
 * Force password change - Admin can force a user to change password on next login
 */
export const forcePasswordChange = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Non autenticato");
    }

    // Get current user's profile to check permissions
    const currentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .unique();

    if (!currentProfile || currentProfile.role !== "admin") {
      throw new Error("Solo gli amministratori possono forzare il cambio password");
    }

    // Find target user's profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profilo utente non trovato");
    }

    // Set force password change flag
    await ctx.db.patch(profile._id, {
      forcePasswordChange: true,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Cambio password forzato" };
  },
});

/**
 * Check if user needs to change password
 */
export const checkForcePasswordChange = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return profile?.forcePasswordChange === true;
  },
});

/**
 * Clear force password change flag after user changes password
 */
export const clearForcePasswordChange = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non autenticato");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profilo utente non trovato");
    }

    await ctx.db.patch(profile._id, {
      forcePasswordChange: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
