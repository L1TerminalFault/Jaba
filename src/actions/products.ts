"use server";

import { revalidatePath } from "next/cache";
import {
  createOutputProduct,
  updateOutputProduct,
  toggleOutputProductStatus,
  getOutputProductById,
  listOutputProducts,
} from "@/db/methods";
import { assertPermission } from "@/lib/rbac";
import { logger } from "@/lib/logger";
import type {
  ActionResult,
  OutputProductDTO,
  CreateOutputProductInput,
  UpdateOutputProductInput,
  PaginatedResult,
} from "@/types";

/**
 * Server Action: Registers a new manufactured Output Product in the catalogue.
 *
 * @param input - Registration payload including name, optional description, recipe ingredients,
 *                optional initialPrice, and optional initialStock.
 * @returns ActionResult<OutputProductDTO> with populated recipe and live stock data.
 *
 * Side effects:
 * - Validates unique product name (case-insensitive).
 * - Validates that all raw materials in the recipe exist in the system.
 * - Seeds default ProductPrice if initialPrice is specified.
 * - Seeds initial ProductStock if initialStock is specified.
 * - Revalidates `/products`, `/inventory`, `/production`, and `/`.
 */
export async function createOutputProductAction(
  input: CreateOutputProductInput
): Promise<ActionResult<OutputProductDTO>> {
  try {
    const data = await logger.track(
      "ACTION:PRODUCTS",
      "createOutputProductAction",
      input,
      async () => {
        await assertPermission("canViewCatalogue", "createOutputProductAction");
        const result = await createOutputProduct(input);
        revalidatePath("/products");
        revalidatePath("/inventory");
        revalidatePath("/production");
        revalidatePath("/");
        return result;
      }
    );

    return {
      success: true,
      data,
      message: `Product "${data.name}" created successfully.`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create product.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "PRODUCT_ERROR";
    return { success: false, error: message, code };
  }
}

/**
 * Server Action: Updates an existing output product's name, description, recipe, image, or active status.
 *
 * @param id - MongoDB ObjectId of the product.
 * @param input - Updated fields (name, description, recipe, image, isActive).
 * @returns ActionResult<OutputProductDTO> with the updated entity.
 *
 * Side effects:
 * - Validates recipe raw materials if modified.
 * - Revalidates `/products`, `/inventory`, `/production`, and `/`.
 */
export async function updateOutputProductAction(
  id: string,
  input: UpdateOutputProductInput
): Promise<ActionResult<OutputProductDTO>> {
  try {
    const data = await logger.track(
      "ACTION:PRODUCTS",
      "updateOutputProductAction",
      { id, input },
      async () => {
        await assertPermission("canViewCatalogue", "updateOutputProductAction");
        const result = await updateOutputProduct(id, input);
        revalidatePath("/products");
        revalidatePath("/inventory");
        revalidatePath("/production");
        revalidatePath("/");
        return result;
      }
    );

    return {
      success: true,
      data,
      message: `Product "${data.name}" updated successfully.`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update product.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "PRODUCT_ERROR";
    return { success: false, error: message, code };
  }
}

/**
 * Server Action: Activates or deactivates an output product for manufacturing and sales.
 *
 * @param id - MongoDB ObjectId of the product.
 * @param isActive - Explicit target status; toggles current status if omitted.
 * @returns ActionResult<OutputProductDTO> with updated active state.
 *
 * Side effects:
 * - Inactive products cannot be selected in new production entries or sales transactions.
 * - Revalidates `/products`, `/inventory`, and `/production`.
 */
export async function toggleOutputProductStatusAction(
  id: string,
  isActive?: boolean
): Promise<ActionResult<OutputProductDTO>> {
  try {
    const data = await logger.track(
      "ACTION:PRODUCTS",
      "toggleOutputProductStatusAction",
      { id, isActive },
      async () => {
        await assertPermission(
          "canViewCatalogue",
          "toggleOutputProductStatusAction"
        );
        const result = await toggleOutputProductStatus(id, isActive);
        revalidatePath("/products");
        revalidatePath("/inventory");
        revalidatePath("/production");
        return result;
      }
    );

    return {
      success: true,
      data,
      message: `Product "${data.name}" is now ${data.isActive ? "active" : "inactive"}.`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update product status.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Fetches a single output product by ID with recipe details and current stock.
 *
 * @param id - MongoDB ObjectId of the product.
 * @returns ActionResult<OutputProductDTO>
 */
export async function getOutputProductAction(
  id: string
): Promise<ActionResult<OutputProductDTO>> {
  try {
    const data = await logger.track(
      "ACTION:PRODUCTS",
      "getOutputProductAction",
      { id },
      async () => {
        return await getOutputProductById(id);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch product.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Lists output products with optional search query, active filter, and pagination.
 *
 * @param params - Optional search query, active status filter, page number, and page limit.
 * @returns ActionResult<PaginatedResult<OutputProductDTO>>
 */
export async function listOutputProductsAction(params?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<ActionResult<PaginatedResult<OutputProductDTO>>> {
  try {
    const data = await logger.track(
      "ACTION:PRODUCTS",
      "listOutputProductsAction",
      params || {},
      async () => {
        return await listOutputProducts(params);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to list products.";
    return { success: false, error: message };
  }
}
