"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserButton, SignInButton, Show } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeStore, defaultThemes } from "@/lib/theme";
import { getEthiopianDate } from "@/lib/ethiopian-date";
import { usePermissions } from "@/lib/rbac-client";
import type { UserRole } from "@/lib/rbac-shared";
import {
  IoColorPaletteOutline,
  IoCalendarOutline,
  IoTimeOutline,
} from "react-icons/io5";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  brandName: "JABA",
  version: "v1.0",
  calendarLabel: "EC", // Ethiopian Calendar
  signIn: "Sign In",
  themeModalTitle: "Theme Palette",
  close: "Close",
  activeBadge: "Active",
  roleLabels: {
    super_admin: "SuperAdmin",
    admin: "Admin",
    sale: "Sale",
    producer: "Producer",
    staff: "Staff",
  } satisfies Record<UserRole, string>,
};

export default function TitleBar() {
  const { currentTheme, setTheme } = useThemeStore();
  const { role, permissions } = usePermissions();
  const [showThemeModal, setShowThemeModal] = useState(false);

  const brandHref = permissions.canViewHome
    ? "/home"
    : permissions.canViewInventory
    ? "/inventory"
    : "/settings";
  const [ethDate, setEthDate] = useState<{
    formattedEn: string;
    formattedAm: string;
    timeStr: string;
  }>({
    formattedEn: "",
    formattedAm: "",
    timeStr: "",
  });

  useEffect(() => {
    const updateTime = () => {
      const eth = getEthiopianDate(new Date());
      setEthDate({
        formattedEn: eth.formattedEn,
        formattedAm: eth.formattedAm,
        timeStr: eth.timeStr,
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 pointer-events-none"
      >
        <div className="pointer-events-auto flex items-center justify-between gap-3 sm:gap-4 rounded-full px-5 py-2.5 sm:px-6 sm:py-3 shadow-xl shadow-black/35 backdrop-blur-2xl bg-theme-card/85 border border-theme-border/40 min-w-[min(100%,320px)] max-w-7xl w-full transition-colors duration-300">
          {/* Brand & Version */}
          <Link href={brandHref} className="flex items-center gap-2.5 group shrink-0">
            <div className="flex size-8 sm:size-9 items-center justify-center rounded-xl bg-theme-accent/20 //border border-theme-accent/40 text-theme-accent font-black text-xl shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-transform group-hover:scale-105">
              J
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-wider text-theme-text group-hover:text-theme-accent transition-colors">
                {STRINGS.brandName}
              </span>
              <span className="text-[10px] sm:text-xs text-theme-text/45 font-medium px-1.5 py-0.5 rounded-full bg-theme-background/60 border border-theme-border/30">
                {STRINGS.version}
              </span>
              {role && (
                <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-theme-accent/15 text-theme-accent //border border-theme-accent/30">
                  {STRINGS.roleLabels[role]}
                </span>
              )}
            </div>
          </Link>

          {/* Ethiopian Calendar Live Date & Time Display */}
	  {/* <div className="hidden md:flex items-center gap-2.5 px-3 py-1 rounded-full border border-theme-border/50 bg-theme-background/50 backdrop-blur-md shadow-inner text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-theme-accent">
              <IoCalendarOutline className="size-3.5" />
              <span>{ethDate.formattedEn || "..."}</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-theme-accent/20 border border-theme-accent/30 font-mono">
                {STRINGS.calendarLabel}
              </span>
            </div>
            <span className="text-theme-border/60">•</span>
            <div className="flex items-center gap-1 text-theme-text/75 font-mono text-[11px]">
              <IoTimeOutline className="size-3 text-theme-text/40" />
              <span>{ethDate.timeStr}</span>
            </div>
          </div> */}

          {/* Controls: Theme Switcher & Clerk Authentication */}
          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
	  {/* <button
              onClick={() => setShowThemeModal(true)}
              title="Theme Customizer"
              className="flex size-8 sm:size-8.5 items-center justify-center rounded-full border border-theme-border/60 bg-theme-background/60 text-theme-text/80 hover:text-theme-accent hover:border-theme-accent/50 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            >
              <IoColorPaletteOutline className="size-4" />
            </button> */}

            <Show when="signed-in">
              <UserButton
                showName
                appearance={{
                  elements: {
                    userButtonOuterIdentifier: {
                      color: "inherit",
                      fontSize: "12px",
                      fontWeight: "600",
                    },
                    avatarBox: "size-8",
                  },
                }}
              />
            </Show>

            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="cursor-pointer rounded-full bg-theme-accent px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-black transition-all hover:opacity-90 active:scale-95 shadow-md">
                  {STRINGS.signIn}
                </button>
              </SignInButton>
            </Show>
          </div>
        </div>
      </motion.div>

      {/* Theme Selection Modal */}
      <AnimatePresence>
        {showThemeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-2xl border border-theme-border/60 bg-theme-background/95 p-5 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-theme-border/40">
                <h3 className="text-sm font-bold text-theme-text">
                  {STRINGS.themeModalTitle}
                </h3>
                <button
                  onClick={() => setShowThemeModal(false)}
                  className="text-xs text-theme-text/50 hover:text-theme-text cursor-pointer px-2 py-1"
                >
                  ✕
                </button>
              </div>

              <div className="mt-3.5 max-h-72 overflow-y-auto space-y-2 pr-1">
                {defaultThemes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t);
                      setShowThemeModal(false);
                    }}
                    className={`flex items-center justify-between w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      currentTheme.id === t.id
                        ? "border-theme-accent bg-theme-accent/15 text-theme-text font-bold"
                        : "border-theme-border/40 bg-theme-card/40 text-theme-text/70 hover:border-theme-accent/40 hover:text-theme-text"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-4.5 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: t.accent }}
                      />
                      <span className="text-xs">{t.name}</span>
                    </div>
                    {currentTheme.id === t.id && (
                      <span className="text-[10px] text-theme-accent font-semibold px-2 py-0.5 rounded-full bg-theme-accent/20">
                        {STRINGS.activeBadge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowThemeModal(false)}
                className="mt-4 w-full rounded-xl border border-theme-border/50 bg-theme-card/60 py-2 text-xs font-semibold text-theme-text/75 hover:text-theme-text cursor-pointer transition-colors"
              >
                {STRINGS.close}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
