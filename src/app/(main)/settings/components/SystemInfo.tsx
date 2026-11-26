"use client";

import { MdOutlineInfo } from "react-icons/md";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  infoTitle: "Factory & System Specifications",
  infoSubtitle: "Technical environment, date localization, and accounting currency",
  versionLabel: "System Version:",
  versionVal: "JABA Operations v1.0 (Next.js 16 + React 19)",
  currencyLabel: "Accounting Currency:",
  currencyVal: "Ethiopian Birr (ETB)",
  calendarLabel: "Calendar Engine:",
  calendarVal: "Ethiopian Calendar (EC) + Gregorian Calendar (GC)",
  databaseLabel: "Data Persistence:",
  databaseVal: "MongoDB Atlas Replica Set with Multi-Document Transactions",
};

export default function SystemInfo() {
  return (
    <div className="rounded-3xl border border-theme-border/40 bg-theme-card/75 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 pb-4 border-b border-theme-border/40">
          <MdOutlineInfo className="size-5 text-blue-400" />
          <div>
            <h2 className="text-base font-bold text-theme-text">
              {STRINGS.infoTitle}
            </h2>
            <p className="text-xs text-theme-text/50">
              {STRINGS.infoSubtitle}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-theme-background/40 border border-theme-border/30 gap-1">
            <span className="text-theme-text/60 font-semibold">{STRINGS.versionLabel}</span>
            <span className="font-mono font-bold text-theme-text">{STRINGS.versionVal}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-theme-background/40 border border-theme-border/30 gap-1">
            <span className="text-theme-text/60 font-semibold">{STRINGS.currencyLabel}</span>
            <span className="font-mono font-bold text-theme-accent">{STRINGS.currencyVal}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-theme-background/40 border border-theme-border/30 gap-1">
            <span className="text-theme-text/60 font-semibold">{STRINGS.calendarLabel}</span>
            <span className="font-mono font-bold text-theme-text">{STRINGS.calendarVal}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-theme-background/40 border border-theme-border/30 gap-1">
            <span className="text-theme-text/60 font-semibold">{STRINGS.databaseLabel}</span>
            <span className="font-mono text-[11px] text-theme-text/80">{STRINGS.databaseVal}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
