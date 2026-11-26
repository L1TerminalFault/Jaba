import { NextRequest, NextResponse } from "next/server";
import {
  getSaleTransactionById,
  voidSaleTransaction,
} from "@/db/methods";
import { resolveSignedBy } from "@/lib/auth-server";
import { logger } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/transactions/sales/[id]
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const data = await logger.track(
      "API:SALES",
      `GET /api/transactions/sales/${id}`,
      { id },
      async () => {
        return await getSaleTransactionById(id);
      }
    );
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Sale transaction not found.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 404 }
    );
  }
}

/**
 * POST /api/transactions/sales/[id] (Void action)
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
      "API:SALES",
      `POST /api/transactions/sales/${id} (void)`,
      { id, ...body, signedBy },
      async () => {
        return await voidSaleTransaction({
          id,
          reason: body.voidReason,
          signedBy,
        });
      }
    );

    return NextResponse.json({
      success: true,
      data,
      message: "Sale transaction voided and products returned to inventory.",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to void sale transaction.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "VOID_ERROR";
    const status =
      code === "VALIDATION_ERROR"
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
