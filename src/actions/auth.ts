"use server";

import { resolveServerPermissions } from "@/lib/rbac";
import type { UserPermissions } from "@/lib/rbac-shared";
import type { ActionResult } from "@/types";

/**
 * Server Action: Resolves the currently signed-in user's role and permissions.
 * Ensures server-side env vars like `SUPER_ADMIN_CLERK_ID` are accurately reflected
 * in the client UI even without a `NEXT_PUBLIC_` prefix.
 */
export async function getMyPermissionsAction(): Promise<
  ActionResult<UserPermissions>
> {
  try {
    const data = await resolveServerPermissions();
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to resolve user permissions.";
    return { success: false, error: message };
  }
}
