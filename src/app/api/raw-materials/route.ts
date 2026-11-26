import { NextRequest, NextResponse } from "next/server";
import {
  createRawMaterial,
  listRawMaterials,
} from "@/db/methods";
import { logger } from "@/lib/logger";

/**
 * GET /api/raw-materials
 * Query parameters:
 *  - search: string (optional)
 *  - isActive: "true" | "false" (optional)
 *  - page: number (optional, default 1)
 *  - limit: number (optional, default 50)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const isActiveParam = searchParams.get("isActive");
  const isActive =
    isActiveParam !== null ? isActiveParam === "true" : undefined;
  const page = searchParams.get("page")
    ? parseInt(searchParams.get("page")!, 10)
    : undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : undefined;

  try {
    const data = await logger.track(
      "API:RAW_MATERIALS",
      "GET /api/raw-materials",
      { search, isActive, page, limit },
      async () => {
        return await listRawMaterials({ search, isActive, page, limit });
      }
    );
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to list raw materials.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/raw-materials
 * Body:
 *  - name: string (required)
 *  - unit: "g" | "ml" | "piece" (required)
 *  - image?: string
 *  - initialPrice?: number
 *  - initialStock?: number
 *  - isActive?: boolean
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await logger.track(
      "API:RAW_MATERIALS",
      "POST /api/raw-materials",
      body,
      async () => {
        return await createRawMaterial(body);
      }
    );
    return NextResponse.json(
      {
        success: true,
        data,
        message: `Raw material "${data.name}" created successfully.`,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create raw material.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "VALIDATION_ERROR";
    const status = code === "VALIDATION_ERROR" || code === "DUPLICATE_ERROR" ? 400 : 500;
    return NextResponse.json(
      { success: false, error: message, code },
      { status }
    );
  }
}
