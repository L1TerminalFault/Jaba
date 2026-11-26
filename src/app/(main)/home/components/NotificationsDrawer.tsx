"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { DailyRawMaterialUsageItem, LowStockAlert } from "@/types";
import { formatWithAutoUnit } from "@/lib/units";
import {
  FiX,
  FiBell,
  FiAlertTriangle,
  FiCheckCircle,
  FiLayers,
} from "react-icons/fi";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  title: "Notifications & Pace",
  subtitle: "Low stock alerts and daily raw material consumption pace",
  materialUsageSection: "Daily Raw Material Usage",
  lowStockSection: "Low Stock Inventory Alerts",
  noUsageText: "No raw materials have been consumed in production today yet.",
  noAlertsText: "All material and product stocks are above safety thresholds.",
  overPaceBadge: "High Daily Usage",
  normalPaceBadge: "Normal Pace",
  daysLeftPrefix: "~",
  daysLeftSuffix: "days left",
  usedLabel: "Used today:",
  dailyLimitLabel: "Daily pace:",
  perDay: "/ day",
  materialTag: "Raw Material",
  productTag: "Product",
  thresholdLabel: "Min threshold",
  closeLabel: "Close",
};

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: LowStockAlert[];
  materialUsage: DailyRawMaterialUsageItem[];
}

export default function NotificationsDrawer({
  isOpen,
  onClose,
  alerts,
  materialUsage,
}: NotificationsDrawerProps) {
  const activeUsage = materialUsage.filter((m) => m.usedToday > 0);
  const overPaceCount = activeUsage.filter((m) => m.isOverDailyBudget).length;
  const totalWarnings = alerts.length + overPaceCount;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Right Slide-Over Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-theme-border/40 bg-theme-background/95 backdrop-blur-2xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-theme-border/40 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-theme-accent/15 border border-theme-accent/35 text-theme-accent">
                  <FiBell className="size-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-theme-text">
                      {STRINGS.title}
                    </h2>
                    {totalWarnings > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {totalWarnings}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-theme-text/55">
                    {STRINGS.subtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={STRINGS.closeLabel}
                className="flex size-8 items-center justify-center rounded-full border border-theme-border/50 bg-theme-card/60 text-theme-text/70 hover:text-theme-text hover:border-theme-accent/50 cursor-pointer transition-colors"
              >
                <FiX className="size-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* 1. Daily Raw Material Usage Section */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <FiLayers className="size-4 text-theme-accent" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text/70">
                    {STRINGS.materialUsageSection}
                  </h3>
                </div>

                {activeUsage.length > 0 ? (
                  <div className="space-y-2.5">
                    {activeUsage.map((item) => {
                      const pct =
                        item.recommendedDailyLimit > 0
                          ? Math.round(item.usageRatio * 100)
                          : 0;
                      const daysLeft =
                        item.estimatedDaysLeftAtTodayPace !== null
                          ? Math.max(
                              0,
                              Math.round(item.estimatedDaysLeftAtTodayPace * 10) /
                                10
                            )
                          : null;

                      return (
                        <div
                          key={item.rawMaterialId}
                          className={`rounded-2xl border p-3.5 space-y-2 ${
                            item.isOverDailyBudget
                              ? "border-amber-500/40 bg-amber-500/10"
                              : "border-theme-border/35 bg-theme-card/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-theme-text">
                              {item.name}
                            </span>

                            {item.isOverDailyBudget ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                <FiAlertTriangle className="size-3 text-amber-400" />
                                <span>
                                  {STRINGS.overPaceBadge}
                                  {pct > 100 ? ` (${pct}%)` : ""}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                                <FiCheckCircle className="size-3" />
                                <span>{STRINGS.normalPaceBadge}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-theme-text/75">
                            <span>
                              {STRINGS.usedLabel}{" "}
                              <strong
                                className={
                                  item.isOverDailyBudget
                                    ? "text-amber-300"
                                    : "text-theme-text"
                                }
                              >
                                {formatWithAutoUnit(item.usedToday, item.unit)}
                              </strong>
                            </span>

                            {item.recommendedDailyLimit > 0 && (
                              <span className="text-theme-text/55">
                                {STRINGS.dailyLimitLabel}{" "}
                                {formatWithAutoUnit(
                                  Number(item.recommendedDailyLimit.toFixed(2)),
                                  item.unit
                                )}{" "}
                                {STRINGS.perDay}
                              </span>
                            )}
                          </div>

                          {daysLeft !== null && (
                            <div className="text-[10px] font-mono text-right text-theme-text/55">
                              {STRINGS.daysLeftPrefix}
                              {daysLeft} {STRINGS.daysLeftSuffix}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-theme-border/30 bg-theme-card/40 text-xs text-theme-text/55">
                    <FiCheckCircle className="size-4 text-theme-accent shrink-0" />
                    <span>{STRINGS.noUsageText}</span>
                  </div>
                )}
              </section>

              {/* 2. Low Stock Inventory Alerts Section */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <FiAlertTriangle className="size-4 text-rose-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text/70">
                    {STRINGS.lowStockSection}
                  </h3>
                </div>

                {alerts.length > 0 ? (
                  <div className="space-y-2.5">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-rose-500/25 bg-rose-500/10"
                      >
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
                            {alert.type === "raw_material"
                              ? STRINGS.materialTag
                              : STRINGS.productTag}
                          </span>
                          <h4 className="text-xs font-bold text-theme-text mt-0.5">
                            {alert.name}
                          </h4>
                          <p className="text-[10px] text-theme-text/50 font-mono mt-0.5">
                            {STRINGS.thresholdLabel}: {alert.threshold}{" "}
                            {alert.unit || "pcs"}
                          </p>
                        </div>

                        <div className="text-right font-mono">
                          <span className="text-sm font-black text-rose-400 block">
                            {alert.currentStock.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-theme-text/50">
                            {alert.unit || "pcs"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 text-xs text-emerald-300">
                    <FiCheckCircle className="size-4 text-emerald-400 shrink-0" />
                    <span>{STRINGS.noAlertsText}</span>
                  </div>
                )}
              </section>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
