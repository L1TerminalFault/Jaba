"use client";

import { motion } from "framer-motion";
import type { DailyRawMaterialUsageItem } from "@/types";
import { formatWithAutoUnit } from "@/lib/units";
import {
  FiLayers,
  FiAlertTriangle,
  FiCheckCircle,
} from "react-icons/fi";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  title: "Today's Raw Material Usage",
  subtitle: "Daily consumption tracked against your 30-day monthly purchase pace",
  monthlyCycleBadge: "30-Day Pace",
  withinPaceBadge: "Within Daily Pace",
  warningsBadgeSuffix: "Over Daily Pace",
  emptyText: "No raw materials have been consumed in production batches today yet.",
  usedTodayLabel: "Used Today",
  dailyAllowanceLabel: "Daily Allowance",
  remainingStockLabel: "Stock Left",
  overPaceWarning: "High daily usage",
  daysLeftPrefix: "~",
  daysLeftSuffix: "days left at this rate",
  normalPaceLabel: "Normal pace",
  perDay: "/ day",
  noTargetYet: "No monthly baseline",
};

interface RawMaterialUsageCardProps {
  items: DailyRawMaterialUsageItem[];
}

export default function RawMaterialUsageCard({
  items,
}: RawMaterialUsageCardProps) {
  const activeTodayItems = items.filter((item) => item.usedToday > 0);
  const warningCount = activeTodayItems.filter(
    (item) => item.isOverDailyBudget
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="rounded-3xl border border-theme-border/40 bg-theme-card/75 p-6 backdrop-blur-xl shadow-xl space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-theme-border/30">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <FiLayers className="size-5 text-theme-accent" />
            <h3 className="text-base font-bold text-theme-text">
              {STRINGS.title}
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-theme-accent/20 text-theme-accent border border-theme-accent/30 font-semibold">
              {STRINGS.monthlyCycleBadge}
            </span>
          </div>
          <p className="text-xs text-theme-text/55 mt-1">{STRINGS.subtitle}</p>
        </div>

        {/* Summary Warning / Status Pill */}
        {activeTodayItems.length > 0 && (
          <div className="self-start sm:self-auto">
            {warningCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/35 font-bold">
                <FiAlertTriangle className="size-3.5 text-amber-400" />
                <span>
                  {warningCount} {STRINGS.warningsBadgeSuffix}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                <FiCheckCircle className="size-3.5 text-emerald-400" />
                <span>{STRINGS.withinPaceBadge}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Material Consumption Grid */}
      {activeTodayItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {activeTodayItems.map((item, idx) => {
            const pct =
              item.recommendedDailyLimit > 0
                ? Math.round(item.usageRatio * 100)
                : 0;
            const barWidth =
              item.recommendedDailyLimit > 0
                ? Math.min(100, Math.max(4, item.usageRatio * 100))
                : item.isOverDailyBudget
                ? 100
                : 0;
            const daysLeft =
              item.estimatedDaysLeftAtTodayPace !== null
                ? Math.max(0, Math.round(item.estimatedDaysLeftAtTodayPace * 10) / 10)
                : null;

            return (
              <motion.div
                key={item.rawMaterialId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                className={`rounded-2xl border p-4 backdrop-blur-md space-y-3 ${
                  item.isOverDailyBudget
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-theme-border/35 bg-theme-background/40"
                }`}
              >
                {/* Name & Warning Pill */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-theme-text">
                    {item.name}
                  </h4>

                  {item.isOverDailyBudget ? (
                    <span
                      title={
                        daysLeft !== null
                          ? `${STRINGS.daysLeftPrefix}${daysLeft} ${STRINGS.daysLeftSuffix}`
                          : undefined
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold shrink-0"
                    >
                      <FiAlertTriangle className="size-3 text-amber-400" />
                      <span>
                        {STRINGS.overPaceWarning}
                        {pct > 100 ? ` (${pct}%)` : ""}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold shrink-0">
                      <FiCheckCircle className="size-3" />
                      <span>{STRINGS.normalPaceLabel}</span>
                    </span>
                  )}
                </div>

                {/* Progress bar against daily allowance */}
                <div className="space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-theme-border/30">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        item.isOverDailyBudget
                          ? "bg-gradient-to-r from-amber-500 to-rose-500"
                          : "bg-theme-accent"
                      }`}
                    />
                  </div>
                  {daysLeft !== null && (
                    <div className="flex items-center justify-end text-[10px] text-theme-text/50 font-mono">
                      <span
                        className={
                          item.isOverDailyBudget ? "text-amber-300 font-semibold" : ""
                        }
                      >
                        {STRINGS.daysLeftPrefix}
                        {daysLeft} {STRINGS.daysLeftSuffix}
                      </span>
                    </div>
                  )}
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-theme-border/20 text-[11px]">
                  <div>
                    <span className="text-[10px] text-theme-text/45 block">
                      {STRINGS.usedTodayLabel}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        item.isOverDailyBudget
                          ? "text-amber-300"
                          : "text-theme-text"
                      }`}
                    >
                      {formatWithAutoUnit(item.usedToday, item.unit)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-theme-text/45 block">
                      {STRINGS.dailyAllowanceLabel}
                    </span>
                    <span className="font-mono font-semibold text-theme-text/80">
                      {item.recommendedDailyLimit > 0
                        ? `${formatWithAutoUnit(
                            Number(item.recommendedDailyLimit.toFixed(2)),
                            item.unit
                          )} ${STRINGS.perDay}`
                        : STRINGS.noTargetYet}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-theme-text/45 block">
                      {STRINGS.remainingStockLabel}
                    </span>
                    <span className="font-mono font-semibold text-theme-accent">
                      {formatWithAutoUnit(item.currentStock, item.unit)}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-3 py-4 px-4 rounded-2xl border border-theme-border/30 bg-theme-background/30 text-xs text-theme-text/55">
          <FiCheckCircle className="size-4 text-theme-accent shrink-0" />
          <span>{STRINGS.emptyText}</span>
        </div>
      )}
    </motion.div>
  );
}
