/**
 * ============================================================================
 * RBAC (Role-Based Access Control) Server Module
 * ============================================================================
 *
 * Server-side role resolution and permission assertions.
 * Shared types and permission matrix live in `./rbac-shared` so Client Components
 * can share the exact same rules without importing `@clerk/nextjs/server`.
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import {
  getPermissions,
  normalizeRole,
  resolveClientRole,
  type UserPermissions,
  type UserRole,
} from "./rbac-shared";

export {
  getPermissions,
  normalizeRole,
  resolveClientRole,
  type UserPermissions,
  type UserRole,
};

// ============================================================================
// Server-side Role Resolution
// ============================================================================

/**
 * Resolves the current user's role from Clerk session on the server side.
 * Checks SuperAdmin env var override (`SUPER_ADMIN_CLERK_ID`) first, then reads `publicMetadata.role`.
 */
export async function resolveServerRole(): Promise<UserRole | null> {
  try {
    const session = await auth();

    if (!session?.userId) {
      return null;
    }

    // Check SuperAdmin override via environment variable
    const superAdminId = process.env.SUPER_ADMIN_CLERK_ID?.trim();
    if (superAdminId && session.userId === superAdminId) {
      return "super_admin";
    }

    // Read role from Clerk publicMetadata
    const user = await currentUser();
    if (!user) {
      return null;
    }

    const metadataRole = (user.publicMetadata as Record<string, unknown>)?.role;
    return normalizeRole(metadataRole);
  } catch {
    // In non-request contexts (e.g., build time), gracefully return null
    return null;
  }
}

/**
 * Server-side helper: resolves role AND permissions in one call.
 */
export async function resolveServerPermissions(): Promise<UserPermissions> {
  const role = await resolveServerRole();
  return getPermissions(role);
}

/**
 * Server-side guard: throws an Unauthorized error if the user lacks the required permission.
 */
export async function assertPermission(
  permissionKey: keyof Omit<UserPermissions, "role">,
  actionName: string
): Promise<UserPermissions> {
  const perms = await resolveServerPermissions();

  if (!perms[permissionKey]) {
    throw new Error(
      `Unauthorized: You do not have permission to perform "${actionName}". ` +
        `Required: ${permissionKey}. Your role: ${perms.role ?? "none"}`
    );
  }

  return perms;
}
