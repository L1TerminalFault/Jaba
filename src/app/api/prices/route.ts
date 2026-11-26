import { NextRequest, NextResponse } from "next/server";
import {
  getProductPrice,
  getRawMaterialPrice,
  setProductPrice,
  setRawMaterialPrice,
} from "@/db/methods";
import { logger } from "@/lib/logger";

/**
 * GET /api/prices
 * Query parameters:
 *  - productId: string (optional)
 *  - rawMaterialId: string (optional)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const rawMaterialId = searchParams.get("rawMaterialId");

  if (!productId && !rawMaterialId) {
    return NextResponse.json(
      {
        success: false,
        error: "Either 'productId' or 'rawMaterialId' query parameter is required.",
      },
      { status: 400 }
    );
  }

  try {
    if (productId) {
      const price = await logger.track(
        "API:PRICES",
        `GET /api/prices?productId=${productId}`,
        { productId },
        async () => {
          return await getProductPrice(productId);
        }
      );
      return NextResponse.json({ success: true, data: { productId, unitPrice: price } });
    }

    if (rawMaterialId) {
      const price = await logger.track(
        "API:PRICES",
        `GET /api/prices?rawMaterialId=${rawMaterialId}`,
        { rawMaterialId },
        async () => {
          return await getRawMaterialPrice(rawMaterialId);
        }
      );
      return NextResponse.json({ success: true, data: { rawMaterialId, unitPrice: price } });
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve price.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prices
 * Body:
 *  - type: "product" | "rawMaterial" (required)
 *  - id: string (required)
 *  - unitPrice: number (required, >= 0)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, id, unitPrice } = body;

    if (!type || !id || unitPrice === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Fields 'type' ('product' | 'rawMaterial'), 'id', and 'unitPrice' are required.",
        },
        { status: 400 }
      );
    }

    if (typeof unitPrice !== "number" || unitPrice < 0) {
      return NextResponse.json(
        { success: false, error: "unitPrice must be a non-negative number." },
        { status: 400 }
      );
    }

    if (type === "product") {
      const data = await logger.track(
        "API:PRICES",
        "POST /api/prices (product)",
        body,
        async () => {
          return await setProductPrice(id, unitPrice);
        }
      );
      return NextResponse.json({
        success: true,
        data,
        message: `Product price updated to $${unitPrice.toFixed(2)}.`,
      });
    } else if (type === "rawMaterial") {
      const data = await logger.track(
        "API:PRICES",
        "POST /api/prices (rawMaterial)",
        body,
        async () => {
          return await setRawMaterialPrice(id, unitPrice);
        }
      );
      return NextResponse.json({
        success: true,
        data,
        message: `Raw material price updated to $${unitPrice.toFixed(2)}.`,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid type. Must be 'product' or 'rawMaterial'.",
        },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to set price.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
