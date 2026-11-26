import { dbConnect } from "./connection";
import { SystemLog, ISystemLog, LogLevel } from "./log-model";

export interface LogFilterParams {
  page?: number;
  limit?: number;
  level?: LogLevel;
  tag?: string;
  search?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface SystemLogDTO {
  _id: string;
  timestamp: string;
  level: LogLevel;
  tag: string;
  action?: string;
  message: string;
  durationMs?: number;
  data?: unknown;
  error?: unknown;
  signedBy?: string;
  signedByName?: string;
  signedByImageUrl?: string;
  createdAt: string;
}

export interface PaginatedLogsResult {
  items: SystemLogDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Decoupled background persistence of log events to MongoDB.
 * Completely safe and non-blocking: errors are caught silently so they never affect calling operations.
 */
export async function recordSystemLogInDb(entry: {
  level: LogLevel;
  tag: string;
  action?: string;
  message: string;
  durationMs?: number;
  data?: unknown;
  error?: unknown;
  signedBy?: string;
}): Promise<void> {
  try {
    await dbConnect();

    // Sanitize data and error objects so they can be stored in MongoDB without throwing
    let sanitizedData: any = entry.data;
    if (typeof entry.data === "object" && entry.data !== null) {
      try {
        sanitizedData = JSON.parse(JSON.stringify(entry.data));
      } catch {
        sanitizedData = "[Unserializable Data]";
      }
    }

    let sanitizedError: any = entry.error;
    if (entry.error instanceof Error) {
      sanitizedError = {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      };
    } else if (typeof entry.error === "object" && entry.error !== null) {
      try {
        sanitizedError = JSON.parse(JSON.stringify(entry.error));
      } catch {
        sanitizedError = String(entry.error);
      }
    }

    await SystemLog.create({
      timestamp: new Date(),
      level: entry.level,
      tag: entry.tag,
      action: entry.action,
      message: entry.message,
      durationMs: entry.durationMs,
      data: sanitizedData,
      error: sanitizedError,
      signedBy: entry.signedBy || "system",
    });
  } catch {
    // Intentionally suppressed: logging failures must never bubble up or interrupt application flow
  }
}

/**
 * Queries paginated system activity and audit logs for the Reports screen.
 */
export async function listSystemLogs(
  params?: LogFilterParams
): Promise<PaginatedLogsResult> {
  await dbConnect();

  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(100, Math.max(1, params?.limit || 25));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (params?.level) {
    filter.level = params.level;
  }

  if (params?.tag) {
    filter.tag = { $regex: new RegExp(params.tag.trim(), "i") };
  }

  if (params?.search && params.search.trim()) {
    const q = params.search.trim();
    filter.$or = [
      { message: { $regex: new RegExp(q, "i") } },
      { action: { $regex: new RegExp(q, "i") } },
      { tag: { $regex: new RegExp(q, "i") } },
      { signedBy: { $regex: new RegExp(q, "i") } },
    ];
  }

  if (params?.startDate || params?.endDate) {
    const dateQuery: Record<string, Date> = {};
    if (params.startDate) dateQuery.$gte = new Date(params.startDate);
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }
    filter.timestamp = dateQuery;
  }

  const [logs, total] = await Promise.all([
    SystemLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SystemLog.countDocuments(filter),
  ]);

  const items: SystemLogDTO[] = logs.map((doc) => ({
    _id: doc._id.toString(),
    timestamp: new Date(doc.timestamp).toISOString(),
    level: doc.level as LogLevel,
    tag: doc.tag,
    action: doc.action,
    message: doc.message,
    durationMs: doc.durationMs,
    data: doc.data,
    error: doc.error,
    signedBy: doc.signedBy,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
  }));

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Returns summary counts of system logs by severity level.
 */
export async function getSystemLogStats(): Promise<{
  total: number;
  info: number;
  warn: number;
  error: number;
}> {
  await dbConnect();

  const [total, info, warn, error] = await Promise.all([
    SystemLog.countDocuments(),
    SystemLog.countDocuments({ level: "INFO" }),
    SystemLog.countDocuments({ level: "WARN" }),
    SystemLog.countDocuments({ level: "ERROR" }),
  ]);

  return { total, info, warn, error };
}
