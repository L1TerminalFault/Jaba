"use server";

import {
  getRawMaterialStock,
  getProductStock,
  listAllStocks,
} from "@/db/methods";
import { logger } from "@/lib/logger";
import type {
  ActionResult,
  RawMaterialStockDTO,
  ProductStockDTO,
} from "@/types";

/**
 * Server Action: Queries the real-time stock balance for a specific raw material.
 *
 * @param rawMaterialId - MongoDB ObjectId of the raw material.
 * @returns ActionResult<RawMaterialStockDTO> with live quantity in base units (g, ml, or piece).
 */
export async function getRawMaterialStockAction(
  rawMaterialId: string
): Promise<ActionResult<RawMaterialStockDTO>> {
  try {
    const data = await logger.track(
      "ACTION:INVENTORY",
      "getRawMaterialStockAction",
      { rawMaterialId },
      async () => {
        return await getRawMaterialStock(rawMaterialId);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch raw material stock.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Queries the real-time stock balance for a manufactured output product.
 *
 * @param productId - MongoDB ObjectId of the product.
 * @returns ActionResult<ProductStockDTO> with live quantity in integer units.
 */
export async function getProductStockAction(
  productId: string
): Promise<ActionResult<ProductStockDTO>> {
  try {
    const data = await logger.track(
      "ACTION:INVENTORY",
      "getProductStockAction",
      { productId },
      async () => {
        return await getProductStock(productId);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch product stock.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Lists all live raw material stocks and product stocks across the entire factory.
 *
 * @returns ActionResult<{ rawMaterials: RawMaterialStockDTO[]; products: ProductStockDTO[] }>
 */
export async function listAllStocksAction(): Promise<
  ActionResult<{
    rawMaterials: RawMaterialStockDTO[];
    products: ProductStockDTO[];
  }>
> {
  try {
    const data = await logger.track(
      "ACTION:INVENTORY",
      "listAllStocksAction",
      {},
      async () => {
        return await listAllStocks();
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to list stocks.";
    return { success: false, error: message };
  }
}
