"use client";

import { motion } from "framer-motion";
import type { SimpleReportType } from "@/types";
import { FiSearch } from "react-icons/fi";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  searchPlaceholder: "Search buys, sales, productions, or team member...",
  allTab: "All",
  buysTab: "Buys",
  productionsTab: "Production",
  salesTab: "Sales",
};

interface ReportFiltersProps {
  type?: SimpleReportType;
  onTypeChange: (type?: SimpleReportType) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export default function ReportFilters({
  type,
  onTypeChange,
  search,
  onSearchChange,
}: ReportFiltersProps) {
  const typeTabs: Array<{ label: string; value?: SimpleReportType }> = [
    { label: STRINGS.allTab, value: undefined },
    { label: STRINGS.buysTab, value: "PURCHASE" },
    { label: STRINGS.productionsTab, value: "PRODUCTION" },
    { label: STRINGS.salesTab, value: "SALE" },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Search Input with visible icon */}
      <div className="flex items-center gap-2.5 max-w-md w-full rounded-2xl border border-theme-border/50 bg-theme-card/60 px-3.5 py-2.5 backdrop-blur-md focus-within:border-theme-accent transition-colors">
        <FiSearch className="size-4 text-theme-text/50 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={STRINGS.searchPlaceholder}
          className="w-full bg-transparent text-xs sm:text-sm text-theme-text placeholder:text-theme-text/40 focus:outline-none"
        />
      </div>

      {/* Activity Type Filter Tabs (with Framer Motion sliding pill) */}
      <div className="flex items-center gap-1 p-1 rounded-2xl border border-theme-border/40 bg-theme-card/60 backdrop-blur-md overflow-x-auto">
        {typeTabs.map((tab) => {
          const active = type === tab.value;

          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => onTypeChange(tab.value)}
              className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? "text-black shadow-sm font-black"
                  : "text-theme-text/60 hover:text-theme-text hover:bg-theme-text/[0.04]"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="reportTypeTab"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-0 rounded-xl bg-theme-accent shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
