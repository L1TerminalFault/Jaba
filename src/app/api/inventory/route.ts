import { NextRequest, NextResponse } from "next/server";
import {
  getRawMaterialStock,
  getProductStock,
  listAllStocks,
} from "@/db/methods";
import { logger } from "@/lib/logger";

/**
 * GET /api/inventory
 * Query parameters:
 *  - rawMaterialId: string (optional)
 *  - productId: string (optional)
 * If no query param is provided, returns all live stocks.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawMaterialId = searchParams.get("rawMaterialId");
  const productId = searchParams.get("productId");

  try {
    if (rawMaterialId) {
      const data = await logger.track(
        "API:INVENTORY",
        `GET /api/inventory?rawMaterialId=${rawMaterialId}`,
        { rawMaterialId },
        async () => {
          return await getRawMaterialStock(rawMaterialId);
        }
      );
      return NextResponse.json({ success: true, data });
    }

    if (productId) {
      const data = await logger.track(
        "API:INVENTORY",
        `GET /api/inventory?productId=${productId}`,
        { productId },
        async () => {
          return await getProductStock(productId);
        }
      );
      return NextResponse.json({ success: true, data });
    }

    const data = await logger.track(
      "API:INVENTORY",
      "GET /api/inventory (all stocks)",
      {},
      async () => {
        return await listAllStocks();
      }
    );
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch inventory stock.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
