import mongoose from "mongoose";

/**
 * Utility to safely convert Mongoose documents, ObjectIds, and Decimal128 values
 * into plain JSON-serializable JavaScript objects ready for React Server Components
 * and Next.js Server Actions.
 */

export function isObjectId(value: unknown): boolean {
  return (
    value instanceof mongoose.Types.ObjectId ||
    (typeof value === "object" &&
      value !== null &&
      "_bsontype" in value &&
      (value as { _bsontype: string })._bsontype === "ObjectID")
  );
}

export function isDecimal128(value: unknown): boolean {
  return (
    value instanceof mongoose.Types.Decimal128 ||
    (typeof value === "object" &&
      value !== null &&
      "_bsontype" in value &&
      (value as { _bsontype: string })._bsontype === "Decimal128")
  );
}

export function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  if (isDecimal128(value)) {
    return parseFloat((value as mongoose.Types.Decimal128).toString()) || 0;
  }
  if (typeof (value as { toString?: () => string }).toString === "function") {
    return parseFloat((value as { toString: () => string }).toString()) || 0;
  }
  return 0;
}

export function toPlainObject<T = unknown>(input: unknown): T {
  if (input === null || input === undefined) {
    return input as T;
  }

  // Handle Mongoose document
  if (typeof (input as { toObject?: () => unknown }).toObject === "function") {
    return toPlainObject((input as { toObject: () => unknown }).toObject());
  }

  // Handle Decimal128
  if (isDecimal128(input)) {
    return decimalToNumber(input) as unknown as T;
  }

  // Handle ObjectId
  if (isObjectId(input)) {
    return (input as mongoose.Types.ObjectId).toString() as unknown as T;
  }

  // Handle Date
  if (input instanceof Date) {
    return input.toISOString() as unknown as T;
  }

  // Handle Array
  if (Array.isArray(input)) {
    return input.map((item) => toPlainObject(item)) as unknown as T;
  }

  // Handle Object
  if (typeof input === "object") {
    const plain: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (key === "_id" && (isObjectId(value) || typeof value === "string")) {
        plain._id = value.toString();
      } else if (isDecimal128(value)) {
        plain[key] = decimalToNumber(value);
      } else if (isObjectId(value)) {
        plain[key] = value.toString();
      } else if (value instanceof Date) {
        plain[key] = value.toISOString();
      } else {
        plain[key] = toPlainObject(value);
      }
    }
    return plain as T;
  }

  return input as T;
}
