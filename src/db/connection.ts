import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

declare global {
  // Must use `var`, not `let` or `const`, to attach to the global scope
  var mongoose:
    | {
        conn: typeof import("mongoose") | null;
        promise: Promise<typeof import("mongoose")> | null;
      }
    | undefined;
}

/* Snippet is same as:
 *
 * if (!cached) {
 *   cached = global.mongoose = { conn: null, promise: null };
 * }
 *
 */
const cached = (global.mongoose ??= { conn: null, promise: null });

/// NOTE: Snippet for connecting the database once (to avoid multiple connections error)
export async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}
