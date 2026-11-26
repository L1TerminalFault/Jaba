/**
 * Structured Logger for JABA Backend, Server Actions, and API Route Handlers.
 * Provides consistent console output, timing, and error serialization for debugging
 * and production telemetry.
 *
 * Automatically pushes logs to MongoDB in a decoupled, non-blocking background queue
 * so that zero latency or overhead is added to transactions and business operations.
 */

import { recordSystemLogInDb } from "@/db/log-methods";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

interface LogPayload {
  action?: string;
  endpoint?: string;
  method?: string;
  durationMs?: number;
  data?: unknown;
  error?: unknown;
  signedBy?: string;
  [key: string]: unknown;
}

class Logger {
  private formatTime(): string {
    return new Date().toISOString();
  }

  private serializeError(err: unknown): { message: string; stack?: string; code?: string; name?: string } {
    if (err instanceof Error) {
      return {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: (err as { code?: string }).code,
      };
    }
    return {
      name: "UnknownError",
      message: typeof err === "string" ? err : JSON.stringify(err),
    };
  }

  private print(level: LogLevel, tag: string, message: string, payload?: LogPayload) {
    const timestamp = this.formatTime();
    const prefix = `[${timestamp}] [${level}] [${tag}]`;

    if (level === "ERROR") {
      const errDetails = payload?.error ? this.serializeError(payload.error) : undefined;
      console.error(`${prefix} ❌ ${message}`, {
        ...payload,
        error: errDetails,
      });
    } else if (level === "WARN") {
      console.warn(`${prefix} ⚠️ ${message}`, payload || "");
    } else {
      console.log(`${prefix} ℹ️ ${message}`, payload || "");
    }

    // Decoupled, non-blocking background push to database
    // Completely un-awaited: failures in logging are caught silently and never disrupt business flow
    try {
      const signedBy =
        payload?.signedBy ||
        (payload?.data && typeof payload.data === "object" && "signedBy" in payload.data
          ? String((payload.data as { signedBy?: unknown }).signedBy)
          : "system");

      queueMicrotask(() => {
        recordSystemLogInDb({
          level,
          tag,
          action: payload?.action,
          message,
          durationMs: payload?.durationMs,
          data: payload?.data,
          error: payload?.error,
          signedBy,
        }).catch(() => {});
      });
    } catch {
      // Ignored: logging must never crash the caller
    }
  }

  public info(tag: string, message: string, payload?: LogPayload) {
    this.print("INFO", tag, message, payload);
  }

  public warn(tag: string, message: string, payload?: LogPayload) {
    this.print("WARN", tag, message, payload);
  }

  public error(tag: string, message: string, payload?: LogPayload) {
    this.print("ERROR", tag, message, payload);
  }

  public debug(tag: string, message: string, payload?: LogPayload) {
    if (process.env.NODE_ENV !== "production") {
      this.print("DEBUG", tag, message, payload);
    }
  }

  /**
   * Measures and logs execution time of Server Actions or API routes.
   */
  public async track<T>(
    tag: string,
    actionName: string,
    inputs: unknown,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    this.info(tag, `🚀 START: ${actionName}`, { action: actionName, data: inputs });

    try {
      const result = await fn();
      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      this.info(tag, `✅ SUCCESS: ${actionName} (${durationMs}ms)`, {
        action: actionName,
        durationMs,
        data: result,
      });
      return result;
    } catch (err: unknown) {
      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      this.error(tag, `💥 FAILED: ${actionName} (${durationMs}ms)`, {
        action: actionName,
        durationMs,
        error: err,
        data: inputs,
      });
      throw err;
    }
  }
}

export const logger = new Logger();
