import { NextRequest, NextResponse } from "next/server";
import {
  getRawMaterialById,
  updateRawMaterial,
  toggleRawMaterialStatus,
} from "@/db/methods";
import { logger } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/raw-materials/[id]
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const data = await logger.track(
      "API:RAW_MATERIALS",
      `GET /api/raw-materials/${id}`,
      { id },
      async () => {
        return await getRawMaterialById(id);
      }
    );
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Raw material not found.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 404 }
    );
  }
}

/**
 * PATCH /api/raw-materials/[id]
 * Body:
 *  - name?: string
 *  - unit?: "g" | "ml" | "piece"
 *  - image?: string
 *  - isActive?: boolean
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await req.json();
    const data = await logger.track(
      "API:RAW_MATERIALS",
      `PATCH /api/raw-materials/${id}`,
      { id, body },
      async () => {
        // If body only has isActive, use toggleRawMaterialStatus
        if (
          Object.keys(body).length === 1 &&
          typeof body.isActive === "boolean"
        ) {
          return await toggleRawMaterialStatus(id, body.isActive);
        }
        return await updateRawMaterial(id, body);
      }
    );

    return NextResponse.json({
      success: true,
      data,
      message: `Raw material "${data.name}" updated successfully.`,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update raw material.";
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
