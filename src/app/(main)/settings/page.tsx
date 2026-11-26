"use client";

import ThemeSelector from "./components/ThemeSelector";
import SystemInvariants from "./components/SystemInvariants";
import SystemInfo from "./components/SystemInfo";
import RoleStatusCard from "./components/RoleStatusCard";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  pageTitle: "System & Theme Preferences",
  pageSubtitle: "Customize interface theme palettes, visual accents, and inspect system invariants",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title Bar */}
      <div className="border-b border-theme-border/40 pb-4">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-theme-text">
          {STRINGS.pageTitle}
        </h1>
        <p className="text-xs sm:text-sm text-theme-text/60 mt-1">
          {STRINGS.pageSubtitle}
        </p>
      </div>

      {/* Theme Palettes Selector */}
      <ThemeSelector />

      {/* Active Account & Role Access */}
      <RoleStatusCard />

      {/* Invariants & System Specs */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SystemInvariants />
        <SystemInfo />
      </div> */}
    </div>
  );
}
