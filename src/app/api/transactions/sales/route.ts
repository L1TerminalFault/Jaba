import { NextRequest, NextResponse } from "next/server";
import {
  createSaleTransaction,
  listSaleTransactions,
} from "@/db/methods";
import { resolveSignedBy } from "@/lib/auth-server";
import { logger } from "@/lib/logger";

/**
 * GET /api/transactions/sales
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
      "API:SALES",
      "GET /api/transactions/sales",
      { startDate, endDate, status, page, limit },
      async () => {
        return await listSaleTransactions({
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
        : "Failed to list sale transactions.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transactions/sales
 * Body:
 *  - items: Array<{
 *      product: string;
 *      quantity: number;
 *      unitPrice: number;
 *      unitCost?: number;
 *    }>
 *  - notes?: string
 *  - signedBy?: string
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const signedBy = await resolveSignedBy(body.signedBy);

    const data = await logger.track(
      "API:SALES",
      "POST /api/transactions/sales",
      { ...body, signedBy },
      async () => {
        return await createSaleTransaction({
          ...body,
          signedBy,
        });
      }
    );

    return NextResponse.json(
      {
        success: true,
        data,
        message: `Sale completed: ${data.totalItemsCount} items sold for $${data.totalRevenue.toFixed(2)}.`,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to record sale transaction.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "TRANSACTION_ERROR";
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
