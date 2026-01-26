/**
 * RBAC (Role-Based Access Control) Middleware
 * 
 * Provides centralized permission controls for the ODV Management System.
 * 
 * Requirements:
 * - Req 9.1: Support roles admin, direttivo, socio
 * - Req 9.2: Admin/direttivo have full access to all operations
 * - Req 9.3: Socio can only view their own data
 * - Req 9.4: Deny unauthorized access
 * - Req 9.5: Link socio users to their member record via profile.memberId
 */

import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============================================================================
// Types
// ============================================================================

/**
 * User roles supported by the system
 * - admin: Full access to all operations
 * - direttivo: Full access to all operations (same as admin)
 * - operatore: Can manage beneficiary families and bag deliveries
 * - socio: Can only view their own data
 */
export type UserRole = "admin" | "direttivo" | "operatore" | "socio";

/**
 * User profile type from the database
 */
export type UserProfile = Doc<"profiles">;

/**
 * Authentication result containing userId and profile
 */
export interface AuthResult {
  userId: Id<"users">;
  profile: UserProfile;
}

// ============================================================================
// Core Authentication Functions
// ============================================================================

/**
 * Simple authentication check.
 * Returns userId and profile if authenticated.
 * Throws if not authenticated.
 * 
 * @param ctx - Query or Mutation context
 * @returns AuthResult with userId and profile
 * @throws Error if not authenticated or profile not found
 * 
 * @example
 * ```typescript
 * const { userId, profile } = await requireAuth(ctx);
 * ```
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<AuthResult> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Non autenticato");
  }

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  if (!profile) {
    throw new Error("Profilo utente non trovato");
  }

  return { userId, profile };
}

/**
 * Checks if user is authenticated and has one of the allowed roles.
 * 
 * @param ctx - Query or Mutation context
 * @param allowedRoles - Array of roles that are permitted for this operation
 * @returns The user profile if authorized
 * @throws Error if not authenticated, profile not found, or insufficient permissions
 * 
 * Requirements:
 * - Req 9.1: Support roles admin, direttivo, socio
 * - Req 9.4: Deny unauthorized access
 * 
 * @example
 * ```typescript
 * // Only admin and direttivo can access
 * const profile = await requireRole(ctx, ["admin", "direttivo"]);
 * 
 * // Any authenticated user can access
 * const profile = await requireRole(ctx, ["admin", "direttivo", "socio"]);
 * ```
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: UserRole[]
): Promise<UserProfile> {
  const { profile } = await requireAuth(ctx);

  if (!allowedRoles.includes(profile.role as UserRole)) {
    throw new Error("Permessi insufficienti");
  }

  return profile;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper to check if profile has admin or direttivo role.
 * 
 * @param profile - User profile to check
 * @returns true if user is admin or direttivo
 * 
 * Requirements:
 * - Req 9.2: Admin/direttivo have full access to all operations
 * 
 * @example
 * ```typescript
 * if (isAdminOrDirettivo(profile)) {
 *   // Allow full access
 * }
 * ```
 */
export function isAdminOrDirettivo(profile: UserProfile): boolean {
  return profile.role === "admin" || profile.role === "direttivo";
}

/**
 * Helper to check if profile can access Borse Spesa feature.
 * Admin, direttivo, and operatore can access.
 * 
 * @param profile - User profile to check
 * @returns true if user can access Borse Spesa
 */
export function canAccessBorseSpesa(profile: UserProfile): boolean {
  return profile.role === "admin" || profile.role === "direttivo" || profile.role === "operatore";
}

/**
 * Requires access to Borse Spesa feature.
 * Admin, direttivo, and operatore can access.
 * 
 * @param ctx - Query or Mutation context
 * @returns The user profile if authorized
 * @throws Error if not authorized
 */
export async function requireBorseSpesaAccess(
  ctx: QueryCtx | MutationCtx
): Promise<UserProfile> {
  return requireRole(ctx, ["admin", "direttivo", "operatore"]);
}

// ============================================================================
// Member Access Control Functions
// ============================================================================

/**
 * Checks if the current user can read a specific member's data.
 * 
 * - Admin and direttivo can read any member
 * - Socio can only read their own member record (via profile.memberId)
 * 
 * @param ctx - Query context
 * @param memberId - The member ID to check access for
 * @returns true if user can read the member, false otherwise
 * 
 * Requirements:
 * - Req 9.2: Admin/direttivo have full access to all operations
 * - Req 9.3: Socio can only view their own data
 * - Req 9.5: Link socio users to their member record via profile.memberId
 * 
 * @example
 * ```typescript
 * const canRead = await canReadMember(ctx, memberId);
 * if (!canRead) {
 *   throw new Error("Accesso negato");
 * }
 * ```
 */
export async function canReadMember(
  ctx: QueryCtx,
  memberId: Id<"members">
): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return false;
  }

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  if (!profile) {
    return false;
  }

  // Admin and direttivo can read any member
  if (isAdminOrDirettivo(profile)) {
    return true;
  }

  // Socio can only read their own member record
  if (profile.role === "socio" && profile.memberId) {
    return profile.memberId === memberId;
  }

  return false;
}

/**
 * Checks if the current user can modify a specific member's data.
 * 
 * - Only admin and direttivo can modify members
 * - Socio cannot modify any member (including themselves)
 * 
 * @param ctx - Query or Mutation context
 * @param memberId - The member ID to check modification access for
 * @returns true if user can modify the member, false otherwise
 * 
 * Requirements:
 * - Req 9.2: Admin/direttivo have full access to all operations
 * - Req 9.3: Socio can only view their own data (not modify)
 * 
 * @example
 * ```typescript
 * const canModify = await canModifyMember(ctx, memberId);
 * if (!canModify) {
 *   throw new Error("Permessi insufficienti per modificare questo socio");
 * }
 * ```
 */
export async function canModifyMember(
  ctx: QueryCtx | MutationCtx,
  _memberId: Id<"members">
): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return false;
  }

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  if (!profile) {
    return false;
  }

  // Only admin and direttivo can modify members
  // Socio cannot modify any member, including themselves
  return isAdminOrDirettivo(profile);
}

// ============================================================================
// Convenience Functions for Common Permission Checks
// ============================================================================

/**
 * Requires admin or direttivo role.
 * Convenience function for operations that require full access.
 * 
 * @param ctx - Query or Mutation context
 * @returns The user profile if authorized
 * @throws Error if not admin or direttivo
 * 
 * @example
 * ```typescript
 * const profile = await requireAdminOrDirettivo(ctx);
 * // Proceed with full-access operation
 * ```
 */
export async function requireAdminOrDirettivo(
  ctx: QueryCtx | MutationCtx
): Promise<UserProfile> {
  return requireRole(ctx, ["admin", "direttivo"]);
}

/**
 * Requires admin role only.
 * For operations restricted to administrators.
 * 
 * @param ctx - Query or Mutation context
 * @returns The user profile if authorized
 * @throws Error if not admin
 * 
 * @example
 * ```typescript
 * const profile = await requireAdmin(ctx);
 * // Proceed with admin-only operation
 * ```
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<UserProfile> {
  return requireRole(ctx, ["admin"]);
}

/**
 * Gets the current user's profile without throwing.
 * Useful for optional authentication checks.
 * 
 * @param ctx - Query or Mutation context
 * @returns The user profile or null if not authenticated
 * 
 * @example
 * ```typescript
 * const profile = await getOptionalProfile(ctx);
 * if (profile) {
 *   // User is authenticated
 * }
 * ```
 */
export async function getOptionalProfile(
  ctx: QueryCtx | MutationCtx
): Promise<UserProfile | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  return profile;
}

/**
 * Checks if the current user can access their own member data.
 * Returns the member ID if the user is a socio with a linked member.
 * 
 * @param ctx - Query context
 * @returns The linked member ID or null
 * 
 * Requirements:
 * - Req 9.5: Link socio users to their member record via profile.memberId
 * 
 * @example
 * ```typescript
 * const myMemberId = await getOwnMemberId(ctx);
 * if (myMemberId) {
 *   // User has a linked member record
 * }
 * ```
 */
export async function getOwnMemberId(
  ctx: QueryCtx
): Promise<Id<"members"> | null> {
  const profile = await getOptionalProfile(ctx);
  if (!profile) {
    return null;
  }

  return profile.memberId ?? null;
}
