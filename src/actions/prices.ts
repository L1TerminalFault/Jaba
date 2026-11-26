"use server";

import { revalidatePath } from "next/cache";
import {
  setProductPrice,
  setRawMaterialPrice,
  getProductPrice,
  getRawMaterialPrice,
} from "@/db/methods";
import { assertPermission } from "@/lib/rbac";
import { logger } from "@/lib/logger";
import type {
  ActionResult,
  ProductPriceDTO,
  RawMaterialPriceDTO,
} from "@/types";

/**
 * Server Action: Sets or updates the standard unit sales price for a manufactured product.
 *
 * @param productId - MongoDB ObjectId of the output product.
 * @param unitPrice - Non-negative decimal price per unit.
 * @returns ActionResult<ProductPriceDTO> with the newly updated price record.
 *
 * Side effects:
 * - Upserts the ProductPrice document for the product.
 * - Revalidates `/products`, `/sales`, `/inventory`, and `/`.
 */
export async function setProductPriceAction(
  productId: string,
  unitPrice: number
): Promise<ActionResult<ProductPriceDTO>> {
  try {
    const data = await logger.track(
      "ACTION:PRICES",
      "setProductPriceAction",
      { productId, unitPrice },
      async () => {
        await assertPermission("canViewCatalogue", "setProductPriceAction");
        const result = await setProductPrice(productId, unitPrice);
        revalidatePath("/products");
        revalidatePath("/sales");
        revalidatePath("/inventory");
        revalidatePath("/");
        return result;
      }
    );

    return {
      success: true,
      data,
      message: `Product price updated to $${unitPrice.toFixed(2)}.`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to set product price.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Sets or updates the default purchasing unit price for a raw material.
 *
 * @param rawMaterialId - MongoDB ObjectId of the raw material.
 * @param unitPrice - Non-negative decimal price per unit (g, ml, or piece).
 * @returns ActionResult<RawMaterialPriceDTO> with the updated price record.
 *
 * Side effects:
 * - Upserts the RawMaterialPrice document.
 * - Used as default fallback unit cost when costing production batches and carryover asset valuation.
 * - Revalidates `/materials`, `/production`, `/inventory`, and `/`.
 */
export async function setRawMaterialPriceAction(
  rawMaterialId: string,
  unitPrice: number
): Promise<ActionResult<RawMaterialPriceDTO>> {
  try {
    const data = await logger.track(
      "ACTION:PRICES",
      "setRawMaterialPriceAction",
      { rawMaterialId, unitPrice },
      async () => {
        await assertPermission("canViewCatalogue", "setRawMaterialPriceAction");
        const result = await setRawMaterialPrice(rawMaterialId, unitPrice);
        revalidatePath("/materials");
        revalidatePath("/production");
        revalidatePath("/inventory");
        revalidatePath("/");
        return result;
      }
    );

    return {
      success: true,
      data,
      message: `Raw material price updated to $${unitPrice.toFixed(2)}.`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to set raw material price.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Retrieves the current active unit sales price for a product.
 *
 * @param productId - MongoDB ObjectId of the product.
 * @returns ActionResult<number | null> containing the numeric price or null if unassigned.
 */
export async function getProductPriceAction(
  productId: string
): Promise<ActionResult<number | null>> {
  try {
    const data = await logger.track(
      "ACTION:PRICES",
      "getProductPriceAction",
      { productId },
      async () => {
        return await getProductPrice(productId);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get product price.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Retrieves the current default unit purchasing price for a raw material.
 *
 * @param rawMaterialId - MongoDB ObjectId of the raw material.
 * @returns ActionResult<number | null> containing the numeric price or null if unassigned.
 */
export async function getRawMaterialPriceAction(
  rawMaterialId: string
): Promise<ActionResult<number | null>> {
  try {
    const data = await logger.track(
      "ACTION:PRICES",
      "getRawMaterialPriceAction",
      { rawMaterialId },
      async () => {
        return await getRawMaterialPrice(rawMaterialId);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get raw material price.";
    return { success: false, error: message };
  }
}
