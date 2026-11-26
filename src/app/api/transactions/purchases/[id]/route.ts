import { NextRequest, NextResponse } from "next/server";
import {
  getRawMaterialTransactionById,
  voidRawMaterialTransaction,
} from "@/db/methods";
import { resolveSignedBy } from "@/lib/auth-server";
import { logger } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/transactions/purchases/[id]
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const data = await logger.track(
      "API:PURCHASES",
      `GET /api/transactions/purchases/${id}`,
      { id },
      async () => {
        return await getRawMaterialTransactionById(id);
      }
    );
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Purchase transaction not found.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 404 }
    );
  }
}

/**
 * POST /api/transactions/purchases/[id] (Void action)
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
      "API:PURCHASES",
      `POST /api/transactions/purchases/${id} (void)`,
      { id, ...body, signedBy },
      async () => {
        return await voidRawMaterialTransaction({
          id,
          reason: body.voidReason,
          signedBy,
        });
      }
    );

    return NextResponse.json({
      success: true,
      data,
      message: "Purchase transaction voided and stock restored.",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to void transaction.";
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
