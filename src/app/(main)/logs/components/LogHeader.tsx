"use client";

import { MdOutlineSync, MdOutlineAssessment } from "react-icons/md";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  title: "System Activity & Audit Logs",
  subtitle: "Decoupled real-time tracking of operational transactions, execution timings, and error traces",
  refreshBtn: "Refresh Logs",
  totalLogs: "Total Events",
  errorCount: "Errors",
  warnCount: "Warnings",
  infoCount: "Info",
};

interface LogHeaderProps {
  stats: { total: number; info: number; warn: number; error: number };
  onRefresh: () => void;
  loading: boolean;
}

export default function LogHeader({
  stats,
  onRefresh,
  loading,
}: LogHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MdOutlineAssessment className="size-6 text-theme-accent" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-theme-text">
              {STRINGS.title}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-theme-text/60 mt-1">
            {STRINGS.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-2xl border border-theme-border/50 bg-theme-card/80 text-xs sm:text-sm font-semibold text-theme-text/80 hover:text-theme-text hover:border-theme-accent/50 cursor-pointer transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          <MdOutlineSync className={`size-4 ${loading ? "animate-spin text-theme-accent" : ""}`} />
          <span>{STRINGS.refreshBtn}</span>
        </button>
      </div>

      {/* Stats Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl border border-theme-border/40 bg-theme-card/60 backdrop-blur-md">
          <span className="text-[10px] text-theme-text/50 font-semibold uppercase tracking-wider block">
            {STRINGS.totalLogs}
          </span>
          <span className="text-lg font-black text-theme-text font-mono mt-0.5 block">
            {stats.total.toLocaleString()}
          </span>
        </div>

        <div className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-md">
          <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">
            {STRINGS.infoCount}
          </span>
          <span className="text-lg font-black text-emerald-400 font-mono mt-0.5 block">
            {stats.info.toLocaleString()}
          </span>
        </div>

        <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-md">
          <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block">
            {STRINGS.warnCount}
          </span>
          <span className="text-lg font-black text-amber-400 font-mono mt-0.5 block">
            {stats.warn.toLocaleString()}
          </span>
        </div>

        <div className="p-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 backdrop-blur-md">
          <span className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider block">
            {STRINGS.errorCount}
          </span>
          <span className="text-lg font-black text-rose-400 font-mono mt-0.5 block">
            {stats.error.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
