import { NextRequest, NextResponse } from "next/server";
import {
  getProductionEntryById,
  voidProductionEntry,
} from "@/db/methods";
import { resolveSignedBy } from "@/lib/auth-server";
import { logger } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/transactions/production/[id]
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const data = await logger.track(
      "API:PRODUCTION",
      `GET /api/transactions/production/${id}`,
      { id },
      async () => {
        return await getProductionEntryById(id);
      }
    );
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Production entry not found.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 404 }
    );
  }
}

/**
 * POST /api/transactions/production/[id] (Void action)
 * Body:
 *  - voidReason: string (required)
 *  - signedBy?: string
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await req.json();
    const signedBy = await resolveSignedBy(body.signedBy);

    const data = await logger.track(
      "API:PRODUCTION",
      `POST /api/transactions/production/${id} (void)`,
      { id, ...body, signedBy },
      async () => {
        return await voidProductionEntry({
          id,
          reason: body.voidReason,
          signedBy,
        });
      }
    );

    return NextResponse.json({
      success: true,
      data,
      message: "Production entry voided and inventory restored.",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to void production entry.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "VOID_ERROR";
    const status =
      code === "INSUFFICIENT_STOCK" || code === "VALIDATION_ERROR"
        ? 400
        : code === "NOT_FOUND"
        ? 404
        : 500;
    return NextResponse.json(
      { success: false, error: message, code },
      { status }
    );
  }
}
