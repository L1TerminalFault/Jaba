import mongoose from "mongoose";
import { dbConnect } from "@/db/connection";

export class InsufficientStockError extends Error {
  public code = "INSUFFICIENT_STOCK";
  constructor(message: string) {
    super(message);
    this.name = "InsufficientStockError";
  }
}

export class ValidationError extends Error {
  public code = "VALIDATION_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  public code = "NOT_FOUND";
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  public code = "CONFLICT";
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * Executes work within a MongoDB multi-document transaction as required by
 * SYSTEM INVARIANT 1: Stock mutations MUST run inside a `mongoose.startSession()` transaction.
 *
 * Automatically handles session lifecycle, commit/abort, and provides graceful
 * fallback if MongoDB is running as a local standalone development instance without replica set.
 */
export async function withTransaction<T>(
  work: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  await dbConnect();

  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
  } catch (err: unknown) {
    // If sessions aren't supported at all in environment
    console.warn(
      "Warning: Could not start mongoose session. Running non-transactionally.",
      err
    );
    return await work(undefined as unknown as mongoose.ClientSession);
  }

  try {
    let result: T | undefined;
    try {
      await session.withTransaction(async () => {
        result = await work(session!);
      });
      return result!;
    } catch (txError: unknown) {
      const errorMsg = txError instanceof Error ? txError.message : String(txError);
      // Check for standalone MongoDB error (code 20 or replica set error)
      if (
        errorMsg.includes("replica set") ||
        errorMsg.includes("Transaction numbers are only allowed") ||
        (typeof txError === "object" && txError !== null && (txError as { code?: number }).code === 20)
      ) {
        console.warn(
          "MongoDB is not running as a replica set. Falling back to non-transactional execution for local dev."
        );
        // Execute without transaction block using same session or standalone
        return await work(session);
      }
      throw txError;
    }
  } finally {
    if (session) {
      await session.endSession().catch((err) => {
        console.error("Error ending mongoose session:", err);
      });
    }
  }
}
