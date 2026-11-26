import { NextRequest, NextResponse } from "next/server";
import { listSystemLogs, getSystemLogStats } from "@/db/log-methods";
import { LogLevel } from "@/db/log-model";

/**
 * GET /api/logs
 * Query parameters:
 *  - page: number
 *  - limit: number
 *  - level: "INFO" | "WARN" | "ERROR" | "DEBUG"
 *  - search: string
 *  - startDate: string (YYYY-MM-DD)
 *  - endDate: string (YYYY-MM-DD)
 *  - stats: "true" (optional, returns summary counts instead of items)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get("stats") === "true") {
    try {
      const stats = await getSystemLogStats();
      return NextResponse.json({ success: true, data: stats });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load log stats.";
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  }

  const page = searchParams.get("page")
    ? parseInt(searchParams.get("page")!, 10)
    : undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : undefined;
  const level = (searchParams.get("level") as LogLevel) || undefined;
  const search = searchParams.get("search") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  try {
    const data = await listSystemLogs({
      page,
      limit,
      level,
      search,
      startDate,
      endDate,
    });
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to query system logs.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
