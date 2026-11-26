import { NextRequest, NextResponse } from "next/server";
import {
  createRawMaterialTransaction,
  listRawMaterialTransactions,
} from "@/db/methods";
import { resolveSignedBy } from "@/lib/auth-server";
import { logger } from "@/lib/logger";

/**
 * GET /api/transactions/purchases
 * Query parameters:
 *  - startDate: string (optional)
 *  - endDate: string (optional)
 *  - status: "COMPLETED" | "VOIDED" (optional)
 *  - page: number (optional)
 *  - limit: number (optional)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const status = (searchParams.get("status") as "COMPLETED" | "VOIDED") || undefined;
  const page = searchParams.get("page")
    ? parseInt(searchParams.get("page")!, 10)
    : undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : undefined;

  try {
    const data = await logger.track(
      "API:PURCHASES",
      "GET /api/transactions/purchases",
      { startDate, endDate, status, page, limit },
      async () => {
        return await listRawMaterialTransactions({
          startDate,
          endDate,
          status,
          page,
          limit,
        });
      }
    );
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to list purchase transactions.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transactions/purchases
 * Body:
 *  - items: Array<{ rawMaterial: string; quantity: number; unitPrice: number }>
 *  - notes?: string
 *  - signedBy?: string
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const signedBy = await resolveSignedBy(body.signedBy);

    const data = await logger.track(
      "API:PURCHASES",
      "POST /api/transactions/purchases",
      { ...body, signedBy },
      async () => {
        return await createRawMaterialTransaction({
          ...body,
          signedBy,
        });
      }
    );

    return NextResponse.json(
      {
        success: true,
        data,
        message: "Purchase transaction recorded and inventory updated.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to record purchase transaction.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "TRANSACTION_ERROR";
    const status =
      code === "VALIDATION_ERROR" || code === "NOT_FOUND" ? 400 : 500;
    return NextResponse.json(
      { success: false, error: message, code },
      { status }
    );
  }
}
