import { NextRequest, NextResponse } from "next/server";
import { calculateDailyCarryOver } from "@/db/methods";
import { logger } from "@/lib/logger";

/**
 * GET /api/reports/carryover
 * Computes serverless on-the-fly daily carryover (no DB persistence or crons needed).
 * Query parameters:
 *  - date: string (optional, YYYY-MM-DD)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || undefined;

  try {
    const data = await logger.track(
      "API:CARRYOVER",
      `GET /api/reports/carryover?date=${date || "today"}`,
      { date },
      async () => {
        return await calculateDailyCarryOver(date);
      }
    );
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to calculate daily carryover.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
