"use client";

import { MdOutlineSync, MdOutlineSummarize } from "react-icons/md";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  title: "Activity Reports",
  subtitle: "Human-readable feed of raw material buys, production batches, and customer sales",
  refreshBtn: "Refresh",
  allCount: "Total Events",
  buysCount: "Buys",
  productionsCount: "Productions",
  salesCount: "Sales",
};

interface ReportHeaderProps {
  counts: { all: number; purchases: number; sales: number; productions: number };
  onRefresh: () => void;
  loading: boolean;
}

export default function ReportHeader({
  counts,
  onRefresh,
  loading,
}: ReportHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MdOutlineSummarize className="size-6 text-theme-accent" />
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
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-2xl border border-theme-border/50 bg-theme-card/80 text-xs sm:text-sm font-semibold text-theme-text/80 hover:text-theme-text hover:border-theme-accent/50 cursor-pointer transition-colors shadow-md active:scale-95 disabled:opacity-50"
        >
          <MdOutlineSync className={`size-4 ${loading ? "animate-spin text-theme-accent" : ""}`} />
          <span>{STRINGS.refreshBtn}</span>
        </button>
      </div>

      {/* Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl border border-theme-border/40 bg-theme-card/60 backdrop-blur-md">
          <span className="text-[10px] text-theme-text/50 font-semibold uppercase tracking-wider block">
            {STRINGS.allCount}
          </span>
          <span className="text-lg font-black text-theme-text font-mono mt-0.5 block">
            {counts.all.toLocaleString()}
          </span>
        </div>

        <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-md">
          <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block">
            {STRINGS.buysCount}
          </span>
          <span className="text-lg font-black text-amber-400 font-mono mt-0.5 block">
            {counts.purchases.toLocaleString()}
          </span>
        </div>

        <div className="p-3 rounded-2xl border border-blue-500/30 bg-blue-500/5 backdrop-blur-md">
          <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider block">
            {STRINGS.productionsCount}
          </span>
          <span className="text-lg font-black text-blue-400 font-mono mt-0.5 block">
            {counts.productions.toLocaleString()}
          </span>
        </div>

        <div className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-md">
          <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">
            {STRINGS.salesCount}
          </span>
          <span className="text-lg font-black text-emerald-400 font-mono mt-0.5 block">
            {counts.sales.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
