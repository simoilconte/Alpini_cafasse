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
