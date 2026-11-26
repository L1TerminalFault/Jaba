"use server";

import { revalidatePath } from "next/cache";
import {
  createSaleTransaction,
  voidSaleTransaction,
  getSaleTransactionById,
  listSaleTransactions,
} from "@/db/methods";
import { resolveSignedBy } from "@/lib/auth-server";
import { assertPermission } from "@/lib/rbac";
import { logger } from "@/lib/logger";
import type {
  ActionResult,
  SaleTransactionDTO,
  CreateSaleTransactionInput,
  VoidTransactionInput,
  TransactionFilterParams,
  PaginatedResult,
} from "@/types";

/**
 * Server Action: Records a customer sale transaction for finished manufactured goods.
 *
 * @param input - Contains sold items (productId, quantity, unitPrice, optional unitCost),
 *                optional notes, and signedBy cashier/sales agent name.
 * @returns ActionResult<SaleTransactionDTO> with items summary, revenue, and COGS calculations.
 *
 * Database side effects (Atomic Transaction):
 * - Validates product stock availability for each item.
 * - Atomically decrements the sold quantities from ProductStock.
 * - Automatically derives the unitCost from product recipe if omitted, ensuring exact COGS tracking.
 * - Persists the immutable SaleTransaction document (status: COMPLETED).
 * - Revalidates `/sales`, `/inventory`, `/products`, and `/`.
 */
export async function createSaleTransactionAction(
  input: CreateSaleTransactionInput
): Promise<ActionResult<SaleTransactionDTO>> {
  try {
    const data = await logger.track(
      "ACTION:SALES",
      "createSaleTransactionAction",
      input,
      async () => {
        await assertPermission("canSell", "createSaleTransactionAction");
        const signedBy = await resolveSignedBy(input.signedBy);
        const result = await createSaleTransaction({
          ...input,
          signedBy,
        });

        revalidatePath("/sales");
        revalidatePath("/inventory");
        revalidatePath("/products");
        revalidatePath("/");

        return result;
      }
    );

    return {
      success: true,
      data,
      message: `Sale completed: ${data.totalItemsCount} items sold for $${data.totalRevenue.toFixed(2)}.`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to record sale transaction.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "SALE_ERROR";
    return { success: false, error: message, code };
  }
}

/**
 * Server Action: Voids a previously recorded customer sale transaction.
 *
 * @param input - Contains transactionId, voidReason, and signedBy operator name.
 * @returns ActionResult<SaleTransactionDTO> with VOIDED status and timestamp.
 *
 * Database side effects (Atomic Transaction):
 * - Checks that the sale has not already been voided.
 * - Atomically restores the sold goods back into ProductStock.
 * - Marks the SaleTransaction status as VOIDED with audit reason and operator info.
 * - Revalidates `/sales`, `/inventory`, `/products`, and `/`.
 */
export async function voidSaleTransactionAction(
  input: VoidTransactionInput
): Promise<ActionResult<SaleTransactionDTO>> {
  try {
    const data = await logger.track(
      "ACTION:SALES",
      "voidSaleTransactionAction",
      input,
      async () => {
        await assertPermission("canVoidTransactions", "voidSaleTransactionAction");
        const signedBy = await resolveSignedBy(input.signedBy);
        const result = await voidSaleTransaction({
          ...input,
          signedBy,
        });

        revalidatePath("/sales");
        revalidatePath("/inventory");
        revalidatePath("/products");
        revalidatePath("/");

        return result;
      }
    );

    return {
      success: true,
      data,
      message: "Sale transaction voided and products returned to stock successfully.",
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to void sale transaction.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "VOID_ERROR";
    return { success: false, error: message, code };
  }
}

/**
 * Server Action: Fetches a single sale transaction by ID.
 *
 * @param id - MongoDB ObjectId of the sale transaction.
 * @returns ActionResult<SaleTransactionDTO>
 */
export async function getSaleTransactionAction(
  id: string
): Promise<ActionResult<SaleTransactionDTO>> {
  try {
    const data = await logger.track(
      "ACTION:SALES",
      "getSaleTransactionAction",
      { id },
      async () => {
        return await getSaleTransactionById(id);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch sale transaction.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Lists sales transactions with optional date range, status filters, and pagination.
 *
 * @param params - Optional filters (startDate, endDate, status, page, limit).
 * @returns ActionResult<PaginatedResult<SaleTransactionDTO>>
 */
export async function listSaleTransactionsAction(
  params?: TransactionFilterParams
): Promise<ActionResult<PaginatedResult<SaleTransactionDTO>>> {
  try {
    const data = await logger.track(
      "ACTION:SALES",
      "listSaleTransactionsAction",
      params || {},
      async () => {
        return await listSaleTransactions(params);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to list sale transactions.";
    return { success: false, error: message };
  }
}
