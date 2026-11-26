"use client";

import { motion } from "framer-motion";
import type { SystemLogDTO } from "@/db/log-methods";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  modalTitle: "Log Event Inspector",
  actionLabel: "Action / Operation",
  tagLabel: "Tag Domain",
  durationLabel: "Execution Duration",
  userLabel: "Signed By",
  timeLabel: "Timestamp",
  payloadLabel: "Serialized Data Payload",
  errorLabel: "Error Trace Details",
  closeBtn: "Close",
};

interface LogDetailsModalProps {
  log: SystemLogDTO | null;
  onClose: () => void;
}

export default function LogDetailsModal({ log, onClose }: LogDetailsModalProps) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl rounded-3xl border border-theme-border/60 bg-theme-background/95 p-6 shadow-2xl backdrop-blur-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-theme-border/40">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                log.level === "ERROR"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : log.level === "WARN"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              {log.level}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-theme-text">
              {STRINGS.modalTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-theme-text/50 hover:text-theme-text cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-theme-card/40 border border-theme-border/30">
            <div>
              <span className="text-[10px] text-theme-text/50 font-semibold block uppercase">
                {STRINGS.tagLabel}
              </span>
              <span className="font-mono font-bold text-theme-accent">
                {log.tag}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-theme-text/50 font-semibold block uppercase">
                {STRINGS.durationLabel}
              </span>
              <span className="font-mono text-theme-text/80">
                {log.durationMs !== undefined ? `${log.durationMs}ms` : "-"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-theme-text/50 font-semibold block uppercase">
                {STRINGS.userLabel}
              </span>
              <span className="font-mono text-theme-text/80">
                {log.signedByName || log.signedBy || "system"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-theme-text/50 font-semibold block uppercase">
                {STRINGS.timeLabel}
              </span>
              <span className="font-mono text-theme-text/60 text-[10px]">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Message */}
          <div>
            <span className="text-[11px] font-semibold text-theme-text/50 block mb-1 uppercase">
              Message
            </span>
            <div className="p-3 rounded-xl bg-theme-card/60 border border-theme-border/40 font-mono text-theme-text text-xs">
              {log.message}
            </div>
          </div>

          {/* Action if present */}
          {log.action && (
            <div>
              <span className="text-[11px] font-semibold text-theme-text/50 block mb-1 uppercase">
                {STRINGS.actionLabel}
              </span>
              <div className="p-2.5 rounded-xl bg-theme-card/40 border border-theme-border/30 font-mono text-theme-accent text-xs">
                {log.action}
              </div>
            </div>
          )}

          {/* Error Details */}
          {/* Error Details */}
          {Boolean(log.error) && (
            <div>
              <span className="text-[11px] font-semibold text-rose-400 block mb-1 uppercase">
                {STRINGS.errorLabel}
              </span>
              <pre className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                {typeof log.error === "object"
                  ? JSON.stringify(log.error, null, 2)
                  : String(log.error)}
              </pre>
            </div>
          )}

          {/* Data Payload */}
          {Boolean(log.data) && (
            <div>
              <span className="text-[11px] font-semibold text-theme-text/50 block mb-1 uppercase">
                {STRINGS.payloadLabel}
              </span>
              <pre className="p-3 rounded-xl bg-theme-card/60 border border-theme-border/30 text-theme-text/80 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-56">
                {typeof log.data === "object"
                  ? JSON.stringify(log.data, null, 2)
                  : String(log.data)}
              </pre>
            </div>
          )}

          {/* Close button */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-theme-border/50 bg-theme-card text-xs font-semibold text-theme-text hover:bg-theme-card/80 cursor-pointer transition-colors"
            >
              {STRINGS.closeBtn}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
