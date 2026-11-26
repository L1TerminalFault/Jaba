"use server";

import {
  getDashboardSummary,
  getSalesAnalytics,
  getProductionAnalytics,
  calculateDailyCarryOver,
  getSimpleActivityReports,
} from "@/db/methods";
import { assertPermission } from "@/lib/rbac";
import {
  resolveClerkUserProfiles,
  formatActorDisplayName,
} from "@/lib/auth-server";
import { logger } from "@/lib/logger";
import type {
  ActionResult,
  DashboardSummaryDTO,
  DailyCarryOverDTO,
  SalesAnalyticsReport,
  ProductionAnalyticsReport,
  SimpleReportsResult,
  SimpleReportType,
} from "@/types";

/**
 * Server Action: Computes the comprehensive real-time executive dashboard metrics.
 *
 * Metrics computed:
 * - Active counts of catalogue materials and manufactured products.
 * - Current total asset valuation of raw materials and finished inventory.
 * - Today's sales revenue, COGS-deducted profit, sales count, and units sold.
 * - Today's production cost, production runs, and total units produced.
 * - 7-day rolling revenue, cost, and net profit trends for visual charts.
 * - 30-day monthly sales and net profit totals.
 * - Serverless on-the-fly Daily Carryover calculation (unsold goods carried from yesterday + today's remaining unsold).
 * - Low stock inventory alerts based on safety thresholds.
 *
 * @returns ActionResult<DashboardSummaryDTO>
 */
export async function getDashboardSummaryAction(
  carryOverDate?: string
): Promise<ActionResult<DashboardSummaryDTO>> {
  try {
    const data = await logger.track(
      "ACTION:REPORTS",
      "getDashboardSummaryAction",
      { carryOverDate },
      async () => {
        await assertPermission("canViewHome", "getDashboardSummaryAction");
        return await getDashboardSummary(
          carryOverDate ? { carryOverDate } : undefined
        );
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load dashboard summary.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Computes daily product carryover on the fly (100% serverless, zero crons needed).
 *
 * Mathematical logic:
 * - Current stock $S$ is read directly from ProductStock.
 * - Production on target date $P$ is summed from completed ProductionEntry records.
 * - Carried over from prior days = $\max(0, S - P)$.
 * - Today's unsold remaining = $\min(S, P)$.
 * - If querying a historical date, historical stock is reconstructed from past sales & production ledger entries.
 * - Multiplies remaining quantities by recipe raw material costs for precise asset valuation.
 *
 * @param date - Optional ISO date string (YYYY-MM-DD); defaults to current date.
 * @returns ActionResult<DailyCarryOverDTO>
 */
export async function calculateDailyCarryOverAction(
  date?: string
): Promise<ActionResult<DailyCarryOverDTO>> {
  try {
    const data = await logger.track(
      "ACTION:REPORTS",
      "calculateDailyCarryOverAction",
      { date },
      async () => {
        await assertPermission("canViewHome", "calculateDailyCarryOverAction");
        return await calculateDailyCarryOver(date);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to calculate daily carryover.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Generates sales analytics including total revenue, transactions count,
 * voided rate, total items sold, and top-selling products.
 *
 * @param params - Optional date range { startDate, endDate }.
 * @returns ActionResult<SalesAnalyticsReport>
 */
export async function getSalesAnalyticsAction(params?: {
  startDate?: string | Date;
  endDate?: string | Date;
}): Promise<ActionResult<SalesAnalyticsReport>> {
  try {
    const data = await logger.track(
      "ACTION:REPORTS",
      "getSalesAnalyticsAction",
      params || {},
      async () => {
        await assertPermission("canViewHome", "getSalesAnalyticsAction");
        return await getSalesAnalytics(params);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load sales analytics.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Generates production analytics including total production batches,
 * units manufactured, total raw material costs consumed, and product breakdowns.
 *
 * @param params - Optional date range { startDate, endDate }.
 * @returns ActionResult<ProductionAnalyticsReport>
 */
export async function getProductionAnalyticsAction(params?: {
  startDate?: string | Date;
  endDate?: string | Date;
}): Promise<ActionResult<ProductionAnalyticsReport>> {
  try {
    const data = await logger.track(
      "ACTION:REPORTS",
      "getProductionAnalyticsAction",
      params || {},
      async () => {
        await assertPermission("canViewHome", "getProductionAnalyticsAction");
        return await getProductionAnalytics(params);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load production analytics.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Fetches simplified human-readable operations reports (Buys, Sales, Productions)
 * enriched with Clerk full names and avatars (visible to Admin & SuperAdmin).
 */
export async function getSimpleActivityReportsAction(params?: {
  type?: SimpleReportType;
  search?: string;
  limit?: number;
}): Promise<ActionResult<SimpleReportsResult>> {
  try {
    const data = await logger.track(
      "ACTION:REPORTS",
      "getSimpleActivityReportsAction",
      params || {},
      async () => {
        await assertPermission("canViewReports", "getSimpleActivityReportsAction");
        const reportData = await getSimpleActivityReports({
          limit: params?.limit,
        });

        const profiles = await resolveClerkUserProfiles(
          reportData.items.map((item) => item.signedBy || "")
        );

        let enriched = reportData.items.map((item) => {
          const profile = formatActorDisplayName(item.signedBy, profiles);
          return {
            ...item,
            actorName: profile.fullName,
            actorImageUrl: profile.imageUrl,
          };
        });

        if (params?.type) {
          enriched = enriched.filter((item) => item.type === params.type);
        }

        if (params?.search && params.search.trim()) {
          const q = params.search.trim().toLowerCase();
          enriched = enriched.filter(
            (item) =>
              item.headline.toLowerCase().includes(q) ||
              item.summary.toLowerCase().includes(q) ||
              (item.note && item.note.toLowerCase().includes(q)) ||
              (item.actorName && item.actorName.toLowerCase().includes(q))
          );
        }

        return {
          items: enriched,
          counts: reportData.counts,
        };
      }
    );

    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load activity reports.";
    return { success: false, error: message };
  }
}
