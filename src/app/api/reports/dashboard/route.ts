import { NextRequest, NextResponse } from "next/server";
import { getDashboardSummary } from "@/db/methods";
import { logger } from "@/lib/logger";

/**
 * GET /api/reports/dashboard
 * Computes live real-time factory analytics, today's sales/production, carryover,
 * weekly/monthly stats, and low stock alerts.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const carryOverDate = searchParams.get("carryOverDate") || undefined;

  try {
    const data = await logger.track(
      "API:REPORTS",
      "GET /api/reports/dashboard",
      { carryOverDate },
      async () => {
        return await getDashboardSummary(
          carryOverDate ? { carryOverDate } : undefined
        );
      }
    );
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate dashboard summary.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
