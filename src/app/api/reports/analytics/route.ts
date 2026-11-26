import { NextRequest, NextResponse } from "next/server";
import {
  getSalesAnalytics,
  getProductionAnalytics,
} from "@/db/methods";
import { logger } from "@/lib/logger";

/**
 * GET /api/reports/analytics
 * Query parameters:
 *  - type: "sales" | "production" (required)
 *  - startDate: string (optional, YYYY-MM-DD)
 *  - endDate: string (optional, YYYY-MM-DD)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  if (!type || (type !== "sales" && type !== "production")) {
    return NextResponse.json(
      {
        success: false,
        error: "Query parameter 'type' must be either 'sales' or 'production'.",
      },
      { status: 400 }
    );
  }

  try {
    if (type === "sales") {
      const data = await logger.track(
        "API:ANALYTICS",
        "GET /api/reports/analytics (sales)",
        { startDate, endDate },
        async () => {
          return await getSalesAnalytics({ startDate, endDate });
        }
      );
      return NextResponse.json({ success: true, data });
    } else {
      const data = await logger.track(
        "API:ANALYTICS",
        "GET /api/reports/analytics (production)",
        { startDate, endDate },
        async () => {
          return await getProductionAnalytics({ startDate, endDate });
        }
      );
      return NextResponse.json({ success: true, data });
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load analytics report.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
