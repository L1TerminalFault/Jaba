"use client";

import { motion } from "framer-motion";
import type { SystemLogDTO } from "@/db/log-methods";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiClock,
  FiExternalLink,
  FiChevronLeft,
  FiChevronRight,
  FiUser,
} from "react-icons/fi";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  emptyText: "No log events found matching the selected criteria.",
  prevBtn: "Previous",
  nextBtn: "Next",
  pageLabel: "Page",
  ofLabel: "of",
  systemActor: "System",
};

interface LogListProps {
  logs: SystemLogDTO[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelectLog: (log: SystemLogDTO) => void;
}

export default function LogList({
  logs,
  page,
  totalPages,
  onPageChange,
  onSelectLog,
}: LogListProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-3xl border border-theme-border/40 bg-theme-card/60 p-12 text-center text-xs sm:text-sm text-theme-text/45">
        {STRINGS.emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Log Items */}
      <div className="space-y-2.5">
        {logs.map((log, idx) => {
          const isError = log.level === "ERROR";
          const isWarn = log.level === "WARN";
          const actorLabel = log.signedByName || STRINGS.systemActor;

          return (
            <motion.div
              key={log._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.02 }}
              onClick={() => onSelectLog(log)}
              className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border cursor-pointer ${
                isError
                  ? "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/50"
                  : isWarn
                  ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50"
                  : "border-theme-border/40 bg-theme-card/70 hover:bg-theme-text/[0.04] hover:border-theme-accent/40"
              }`}
            >
              {/* Left side: Icon, Tag, Message */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {isError ? (
                    <FiXCircle className="size-4 text-rose-400" />
                  ) : isWarn ? (
                    <FiAlertTriangle className="size-4 text-amber-400" />
                  ) : (
                    <FiCheckCircle className="size-4 text-emerald-400" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        isError
                          ? "bg-rose-500/20 text-rose-300"
                          : isWarn
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {log.tag}
                    </span>

                    {log.durationMs !== undefined && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-theme-text/45">
                        <FiClock className="size-2.5" />
                        {log.durationMs}ms
                      </span>
                    )}

                    <span className="text-[10px] text-theme-text/40 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-theme-text mt-1 truncate">
                    {log.message}
                  </p>
                </div>
              </div>

              {/* Right side: Clerk Full Name + User Icon & Self-Describing Link Icon */}
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                <div className="flex items-center gap-1.5 text-xs text-theme-text/70">
                  {log.signedByImageUrl ? (
                    <img
                      src={log.signedByImageUrl}
                      alt={actorLabel}
                      className="size-5 rounded-full object-cover border border-theme-border/50"
                    />
                  ) : (
                    <span className="flex size-5 items-center justify-center rounded-full bg-theme-background/70 border border-theme-border/50 text-theme-accent">
                      <FiUser className="size-3" />
                    </span>
                  )}
                  <span className="font-medium truncate max-w-[140px]">
                    {actorLabel}
                  </span>
                </div>

                <FiExternalLink className="size-3.5 text-theme-accent group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-theme-border/20 text-xs">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-theme-border/50 bg-theme-card text-theme-text/70 hover:text-theme-text disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <FiChevronLeft className="size-3.5" />
            <span>{STRINGS.prevBtn}</span>
          </button>

          <span className="text-theme-text/60 font-medium">
            {STRINGS.pageLabel} <span className="font-bold text-theme-text">{page}</span> {STRINGS.ofLabel}{" "}
            <span className="font-bold text-theme-text">{totalPages}</span>
          </span>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-theme-border/50 bg-theme-card text-theme-text/70 hover:text-theme-text disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <span>{STRINGS.nextBtn}</span>
            <FiChevronRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
