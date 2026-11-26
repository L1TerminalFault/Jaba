"use server";

import { revalidatePath } from "next/cache";
import {
  createRawMaterialTransaction,
  voidRawMaterialTransaction,
  getRawMaterialTransactionById,
  listRawMaterialTransactions,
} from "@/db/methods";
import { resolveSignedBy } from "@/lib/auth-server";
import { assertPermission } from "@/lib/rbac";
import { logger } from "@/lib/logger";
import type {
  ActionResult,
  RawMaterialTransactionDTO,
  CreateRawMaterialTransactionInput,
  VoidTransactionInput,
  TransactionFilterParams,
  PaginatedResult,
} from "@/types";

/**
 * Server Action: Records a purchase transaction for raw materials.
 *
 * @param input - Transaction payload containing raw material items (material ID, quantity in base units, unit price),
 *                optional notes, and signedBy user name.
 * @returns ActionResult<RawMaterialTransactionDTO> with transaction details and updated stocks.
 *
 * Database side effects (Atomic Transaction):
 * - Atomically increments RawMaterialStock for each purchased material.
 * - Updates the latest RawMaterialPrice reference to reflect the most recent purchase cost.
 * - Records the immutable RawMaterialTransaction document (status: COMPLETED).
 * - Revalidates `/materials`, `/inventory`, `/transactions`, and `/`.
 */
export async function createRawMaterialTransactionAction(
  input: CreateRawMaterialTransactionInput
): Promise<ActionResult<RawMaterialTransactionDTO>> {
  try {
    const data = await logger.track(
      "ACTION:PURCHASES",
      "createRawMaterialTransactionAction",
      input,
      async () => {
        await assertPermission(
          "canPurchaseRawMaterials",
          "createRawMaterialTransactionAction"
        );
        const signedBy = await resolveSignedBy(input.signedBy);
        const result = await createRawMaterialTransaction({
          ...input,
          signedBy,
        });

        revalidatePath("/materials");
        revalidatePath("/inventory");
        revalidatePath("/transactions");
        revalidatePath("/");

        return result;
      }
    );

    return {
      success: true,
      data,
      message: "Raw material purchase recorded and stock updated successfully.",
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to record raw material purchase.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "PURCHASE_ERROR";
    return { success: false, error: message, code };
  }
}

/**
 * Server Action: Voids a previously completed raw material purchase transaction.
 *
 * @param input - Contains transactionId, voidReason, and signedBy.
 * @returns ActionResult<RawMaterialTransactionDTO> with VOIDED status and timestamp.
 *
 * Database side effects (Atomic Transaction):
 * - Validates that the purchase has not already been voided.
 * - Verifies that sufficient inventory remains to reverse the purchase.
 * - Atomically decrements the RawMaterialStock for each item.
 * - Marks transaction status as VOIDED with audit reason and operator info.
 * - Revalidates `/materials`, `/inventory`, `/transactions`, and `/`.
 */
export async function voidRawMaterialTransactionAction(
  input: VoidTransactionInput
): Promise<ActionResult<RawMaterialTransactionDTO>> {
  try {
    const data = await logger.track(
      "ACTION:PURCHASES",
      "voidRawMaterialTransactionAction",
      input,
      async () => {
        await assertPermission(
          "canVoidTransactions",
          "voidRawMaterialTransactionAction"
        );
        const signedBy = await resolveSignedBy(input.signedBy);
        const result = await voidRawMaterialTransaction({
          ...input,
          signedBy,
        });

        revalidatePath("/materials");
        revalidatePath("/inventory");
        revalidatePath("/transactions");
        revalidatePath("/");

        return result;
      }
    );

    return {
      success: true,
      data,
      message: "Purchase transaction voided and stock restored successfully.",
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to void transaction.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "VOID_ERROR";
    return { success: false, error: message, code };
  }
}

/**
 * Server Action: Fetches a single raw material purchase transaction by ID.
 *
 * @param id - MongoDB ObjectId of the transaction.
 * @returns ActionResult<RawMaterialTransactionDTO>
 */
export async function getRawMaterialTransactionAction(
  id: string
): Promise<ActionResult<RawMaterialTransactionDTO>> {
  try {
    const data = await logger.track(
      "ACTION:PURCHASES",
      "getRawMaterialTransactionAction",
      { id },
      async () => {
        return await getRawMaterialTransactionById(id);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch purchase transaction.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Lists raw material purchase transactions with filtering (date range, status) and pagination.
 *
 * @param params - Optional filters (startDate, endDate, status, page, limit).
 * @returns ActionResult<PaginatedResult<RawMaterialTransactionDTO>>
 */
export async function listRawMaterialTransactionsAction(
  params?: TransactionFilterParams
): Promise<ActionResult<PaginatedResult<RawMaterialTransactionDTO>>> {
  try {
    const data = await logger.track(
      "ACTION:PURCHASES",
      "listRawMaterialTransactionsAction",
      params || {},
      async () => {
        return await listRawMaterialTransactions(params);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to list purchase transactions.";
    return { success: false, error: message };
  }
}
