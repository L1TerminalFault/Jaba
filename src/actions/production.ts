"use server";

import { revalidatePath } from "next/cache";
import {
  createProductionEntry,
  voidProductionEntry,
  getProductionEntryById,
  listProductionEntries,
} from "@/db/methods";
import { resolveSignedBy } from "@/lib/auth-server";
import { assertPermission } from "@/lib/rbac";
import { logger } from "@/lib/logger";
import type {
  ActionResult,
  ProductionEntryDTO,
  CreateProductionEntryInput,
  VoidTransactionInput,
  TransactionFilterParams,
  PaginatedResult,
} from "@/types";

/**
 * Server Action: Records a factory manufacturing/production batch.
 *
 * @param input - Contains products manufactured (productId, quantityProduced, optional materialUsage overrides),
 *                optional notes, and signedBy operator name.
 * @returns ActionResult<ProductionEntryDTO> with batch summary, material costs, and inventory updates.
 *
 * Database side effects (Atomic Transaction):
 * - Validates that sufficient raw material inventory exists for each ingredient in the recipe.
 * - Atomically decrements the required raw materials from RawMaterialStock.
 * - Snapshots the exact unit cost of each raw material used at the moment of production.
 * - Atomically increments ProductStock for each manufactured output product.
 * - Creates an immutable ProductionEntry document (status: COMPLETED).
 * - Revalidates `/production`, `/inventory`, `/products`, `/materials`, and `/`.
 */
export async function createProductionEntryAction(
  input: CreateProductionEntryInput
): Promise<ActionResult<ProductionEntryDTO>> {
  try {
    const data = await logger.track(
      "ACTION:PRODUCTION",
      "createProductionEntryAction",
      input,
      async () => {
        await assertPermission("canProduce", "createProductionEntryAction");
        const signedBy = await resolveSignedBy(input.signedBy);
        const result = await createProductionEntry({
          ...input,
          signedBy,
        });

        revalidatePath("/production");
        revalidatePath("/inventory");
        revalidatePath("/products");
        revalidatePath("/materials");
        revalidatePath("/");

        return result;
      }
    );

    return {
      success: true,
      data,
      message: `Production of ${data.totalUnitsProduced} units recorded successfully.`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to record production entry.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "PRODUCTION_ERROR";
    return { success: false, error: message, code };
  }
}

/**
 * Server Action: Voids a previously recorded production batch.
 *
 * @param input - Contains entryId, voidReason, and signedBy operator name.
 * @returns ActionResult<ProductionEntryDTO> with VOIDED status and timestamp.
 *
 * Database side effects (Atomic Transaction):
 * - Checks that the batch has not already been voided.
 * - Verifies that the produced products are still in inventory (have not already been sold).
 * - Atomically decrements the produced units from ProductStock.
 * - Atomically refunds the consumed raw materials back to RawMaterialStock.
 * - Marks the ProductionEntry status as VOIDED with audit reason and operator info.
 * - Revalidates `/production`, `/inventory`, `/products`, `/materials`, and `/`.
 */
export async function voidProductionEntryAction(
  input: VoidTransactionInput
): Promise<ActionResult<ProductionEntryDTO>> {
  try {
    const data = await logger.track(
      "ACTION:PRODUCTION",
      "voidProductionEntryAction",
      input,
      async () => {
        await assertPermission("canVoidTransactions", "voidProductionEntryAction");
        const signedBy = await resolveSignedBy(input.signedBy);
        const result = await voidProductionEntry({
          ...input,
          signedBy,
        });

        revalidatePath("/production");
        revalidatePath("/inventory");
        revalidatePath("/products");
        revalidatePath("/materials");
        revalidatePath("/");

        return result;
      }
    );

    return {
      success: true,
      data,
      message: "Production entry voided and stock restored successfully.",
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to void production entry.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "VOID_ERROR";
    return { success: false, error: message, code };
  }
}

/**
 * Server Action: Retrieves a specific production entry by ID with product and material breakdowns.
 *
 * @param id - MongoDB ObjectId of the production entry.
 * @returns ActionResult<ProductionEntryDTO>
 */
export async function getProductionEntryAction(
  id: string
): Promise<ActionResult<ProductionEntryDTO>> {
  try {
    const data = await logger.track(
      "ACTION:PRODUCTION",
      "getProductionEntryAction",
      { id },
      async () => {
        return await getProductionEntryById(id);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch production entry.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Lists production entries with date range, status filters, and pagination.
 *
 * @param params - Optional filters (startDate, endDate, status, page, limit).
 * @returns ActionResult<PaginatedResult<ProductionEntryDTO>>
 */
export async function listProductionEntriesAction(
  params?: TransactionFilterParams
): Promise<ActionResult<PaginatedResult<ProductionEntryDTO>>> {
  try {
    const data = await logger.track(
      "ACTION:PRODUCTION",
      "listProductionEntriesAction",
      params || {},
      async () => {
        return await listProductionEntries(params);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to list production entries.";
    return { success: false, error: message };
  }
}
