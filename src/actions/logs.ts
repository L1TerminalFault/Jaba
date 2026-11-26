"use server";

import {
  listSystemLogs,
  getSystemLogStats,
  LogFilterParams,
  PaginatedLogsResult,
} from "@/db/log-methods";
import { assertPermission } from "@/lib/rbac";
import {
  resolveClerkUserProfiles,
  formatActorDisplayName,
} from "@/lib/auth-server";
import type { ActionResult } from "@/types";

/**
 * Server Action: Queries paginated system activity and audit logs for the Logs screen (SuperAdmin only).
 *
 * @param params - Optional filters: page, limit, level (INFO, WARN, ERROR), search query, date range.
 * @returns ActionResult<PaginatedLogsResult>
 */
export async function getSystemLogsAction(
  params?: LogFilterParams
): Promise<ActionResult<PaginatedLogsResult>> {
  try {
    await assertPermission("canViewLogs", "getSystemLogsAction");
    const data = await listSystemLogs(params);

    const profiles = await resolveClerkUserProfiles(
      data.items.map((item) => item.signedBy || "")
    );

    const enrichedItems = data.items.map((item) => {
      const profile = formatActorDisplayName(item.signedBy, profiles);
      return {
        ...item,
        signedByName: profile.fullName,
        signedByImageUrl: profile.imageUrl,
      };
    });

    return {
      success: true,
      data: {
        ...data,
        items: enrichedItems,
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load system logs.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Retrieves summary statistics for system logs (counts by level, SuperAdmin only).
 *
 * @returns ActionResult<{ total: number; info: number; warn: number; error: number }>
 */
export async function getSystemLogStatsAction(): Promise<
  ActionResult<{ total: number; info: number; warn: number; error: number }>
> {
  try {
    await assertPermission("canViewLogs", "getSystemLogStatsAction");
    const data = await getSystemLogStats();
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load log stats.";
    return { success: false, error: message };
  }
}
