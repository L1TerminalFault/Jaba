import { NextRequest, NextResponse } from "next/server";
import {
  getOutputProductById,
  updateOutputProduct,
  toggleOutputProductStatus,
} from "@/db/methods";
import { logger } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/products/[id]
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const data = await logger.track(
      "API:PRODUCTS",
      `GET /api/products/${id}`,
      { id },
      async () => {
        return await getOutputProductById(id);
      }
    );
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Product not found.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 404 }
    );
  }
}

/**
 * PATCH /api/products/[id]
 * Body:
 *  - name?: string
 *  - description?: string
 *  - image?: string
 *  - recipe?: Array<{ rawMaterial: string; quantity: number }>
 *  - isActive?: boolean
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await req.json();
    const data = await logger.track(
      "API:PRODUCTS",
      `PATCH /api/products/${id}`,
      { id, body },
      async () => {
        if (
          Object.keys(body).length === 1 &&
          typeof body.isActive === "boolean"
        ) {
          return await toggleOutputProductStatus(id, body.isActive);
        }
        return await updateOutputProduct(id, body);
      }
    );

    return NextResponse.json({
      success: true,
      data,
      message: `Product "${data.name}" updated successfully.`,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update product.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "ERROR";
    const status = code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json(
      { success: false, error: message, code },
      { status }
    );
  }
}
