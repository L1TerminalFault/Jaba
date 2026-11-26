"use server";

import { revalidatePath } from "next/cache";
import {
  createRawMaterial,
  updateRawMaterial,
  toggleRawMaterialStatus,
  getRawMaterialById,
  listRawMaterials,
} from "@/db/methods";
import { assertPermission } from "@/lib/rbac";
import { logger } from "@/lib/logger";
import type {
  ActionResult,
  RawMaterialDTO,
  CreateRawMaterialInput,
  UpdateRawMaterialInput,
  PaginatedResult,
} from "@/types";

/**
 * Server Action: Creates a new Raw Material entry in the catalogue.
 *
 * @param input - Registration payload including name, base unit ('g' | 'ml' | 'piece'), optional image,
 *                and optional initialPrice and initialStock.
 * @returns ActionResult<RawMaterialDTO> with the newly created raw material data.
 *
 * Side effects:
 * - Ensures unique material naming (case-insensitive).
 * - Seeds default RawMaterialPrice if initialPrice is provided.
 * - Seeds default RawMaterialStock if initialStock is provided.
 * - Revalidates `/materials`, `/inventory`, and `/`.
 */
export async function createRawMaterialAction(
  input: CreateRawMaterialInput
): Promise<ActionResult<RawMaterialDTO>> {
  try {
    const data = await logger.track(
      "ACTION:RAW_MATERIALS",
      "createRawMaterialAction",
      input,
      async () => {
        await assertPermission("canViewCatalogue", "createRawMaterialAction");
        const result = await createRawMaterial(input);
        revalidatePath("/materials");
        revalidatePath("/inventory");
        revalidatePath("/");
        return result;
      }
    );

    return {
      success: true,
      data,
      message: `Raw material "${data.name}" created successfully.`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create raw material.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "RAW_MATERIAL_ERROR";
    return { success: false, error: message, code };
  }
}

/**
 * Server Action: Updates an existing raw material's details (name, unit, image, isActive).
 *
 * @param id - MongoDB ObjectId of the raw material.
 * @param input - Fields to update.
 * @returns ActionResult<RawMaterialDTO> with the updated entity.
 *
 * Side effects:
 * - Validates name uniqueness if modified.
 * - Revalidates `/materials`, `/inventory`, and `/`.
 */
export async function updateRawMaterialAction(
  id: string,
  input: UpdateRawMaterialInput
): Promise<ActionResult<RawMaterialDTO>> {
  try {
    const data = await logger.track(
      "ACTION:RAW_MATERIALS",
      "updateRawMaterialAction",
      { id, input },
      async () => {
        await assertPermission("canViewCatalogue", "updateRawMaterialAction");
        const result = await updateRawMaterial(id, input);
        revalidatePath("/materials");
        revalidatePath("/inventory");
        revalidatePath("/");
        return result;
      }
    );

    return {
      success: true,
      data,
      message: `Raw material "${data.name}" updated successfully.`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update raw material.";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "RAW_MATERIAL_ERROR";
    return { success: false, error: message, code };
  }
}

/**
 * Server Action: Activates or deactivates a raw material for operations.
 *
 * @param id - MongoDB ObjectId of the raw material.
 * @param isActive - Explicit target status; toggles current status if omitted.
 * @returns ActionResult<RawMaterialDTO> with updated active state.
 *
 * Side effects:
 * - Deactivated materials cannot be selected for purchase or new production batches.
 * - Revalidates `/materials` and `/inventory`.
 */
export async function toggleRawMaterialStatusAction(
  id: string,
  isActive?: boolean
): Promise<ActionResult<RawMaterialDTO>> {
  try {
    const data = await logger.track(
      "ACTION:RAW_MATERIALS",
      "toggleRawMaterialStatusAction",
      { id, isActive },
      async () => {
        await assertPermission(
          "canViewCatalogue",
          "toggleRawMaterialStatusAction"
        );
        const result = await toggleRawMaterialStatus(id, isActive);
        revalidatePath("/materials");
        revalidatePath("/inventory");
        return result;
      }
    );

    return {
      success: true,
      data,
      message: `Raw material "${data.name}" is now ${data.isActive ? "active" : "inactive"}.`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update status.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Retrieves a single raw material by ID along with current price and live stock.
 *
 * @param id - MongoDB ObjectId of the raw material.
 * @returns ActionResult<RawMaterialDTO>
 */
export async function getRawMaterialAction(
  id: string
): Promise<ActionResult<RawMaterialDTO>> {
  try {
    const data = await logger.track(
      "ACTION:RAW_MATERIALS",
      "getRawMaterialAction",
      { id },
      async () => {
        return await getRawMaterialById(id);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch raw material.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Lists raw materials with optional search filtering and pagination.
 *
 * @param params - Optional search query, active status filter, page number, and page limit.
 * @returns ActionResult<PaginatedResult<RawMaterialDTO>>
 */
export async function listRawMaterialsAction(params?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<ActionResult<PaginatedResult<RawMaterialDTO>>> {
  try {
    const data = await logger.track(
      "ACTION:RAW_MATERIALS",
      "listRawMaterialsAction",
      params || {},
      async () => {
        return await listRawMaterials(params);
      }
    );
    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to list raw materials.";
    return { success: false, error: message };
  }
}
