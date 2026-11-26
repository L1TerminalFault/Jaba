"use client";

import { motion } from "framer-motion";
import { LogLevel } from "@/db/log-model";
import { FiSearch } from "react-icons/fi";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  searchPlaceholder: "Search logs by action, message, tag, or user...",
  allLevel: "All Levels",
  infoLevel: "Info",
  warnLevel: "Warnings",
  errorLevel: "Errors",
};

interface LogFiltersProps {
  level?: LogLevel;
  onLevelChange: (level?: LogLevel) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export default function LogFilters({
  level,
  onLevelChange,
  search,
  onSearchChange,
}: LogFiltersProps) {
  const levelTabs: Array<{ label: string; value?: LogLevel }> = [
    { label: STRINGS.allLevel, value: undefined },
    { label: STRINGS.infoLevel, value: "INFO" },
    { label: STRINGS.warnLevel, value: "WARN" },
    { label: STRINGS.errorLevel, value: "ERROR" },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Search Input */}
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

      {/* Level Filter Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl border border-theme-border/40 bg-theme-card/60 backdrop-blur-md overflow-x-auto">
        {levelTabs.map((tab) => {
          const active = level === tab.value;

          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => onLevelChange(tab.value)}
              className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? "text-black shadow-sm font-black"
                  : "text-theme-text/60 hover:text-theme-text hover:bg-theme-text/[0.04]"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="logLevelTab"
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
