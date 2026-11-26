"use client";

import { motion } from "framer-motion";
import type { DashboardSummaryDTO } from "@/types";
import {
  MdOutlineTrendingUp,
  MdOutlineAttachMoney,
  MdOutlineSoupKitchen,
  MdOutlineInventory2,
} from "react-icons/md";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  viewDaily: "Daily",
  viewWeekly: "Weekly",
  viewMonthly: "Monthly",
  kpiRevenueTitle: "Sales Revenue",
  kpiProfitTitle: "Net Gross Profit",
  kpiProductionTitle: "Units Produced",
  kpiInventoryTitle: "Stock Asset Valuation",
  todayLabel: "Today",
  weekLabel: "Last 7 Days",
  monthLabel: "Last 30 Days",
  currency: "ETB",
};

interface SummaryCardsProps {
  data: DashboardSummaryDTO;
  viewMode: "daily" | "weekly" | "monthly";
  onViewModeChange: (mode: "daily" | "weekly" | "monthly") => void;
}

export default function SummaryCards({
  data,
  viewMode,
  onViewModeChange,
}: SummaryCardsProps) {
  const activeRevenue =
    viewMode === "daily"
      ? data.todaySalesRevenue
      : viewMode === "weekly"
      ? data.weeklySalesRevenue
      : data.monthlySalesRevenue;

  const activeProfit =
    viewMode === "daily"
      ? data.todayProfit
      : viewMode === "weekly"
      ? data.weeklyProfit
      : data.monthlyProfit;

  const totalStockValuation =
    data.totalRawMaterialStockValue + data.totalProductStockValue;

  const cards = [
    {
      title: STRINGS.kpiRevenueTitle,
      value: `${STRINGS.currency} ${activeRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${viewMode === "daily" ? STRINGS.todayLabel : viewMode === "weekly" ? STRINGS.weekLabel : STRINGS.monthLabel} (${data.todaySalesCount} sales)`,
      icon: MdOutlineAttachMoney,
      color: "from-amber-500/20 to-amber-500/5",
      iconColor: "text-amber-400",
      borderColor: "border-amber-500/30",
    },
    {
      title: STRINGS.kpiProfitTitle,
      value: `${STRINGS.currency} ${activeProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: "Gross profit after material COGS",
      icon: MdOutlineTrendingUp,
      color: activeProfit >= 0 ? "from-emerald-500/20 to-emerald-500/5" : "from-rose-500/20 to-rose-500/5",
      iconColor: activeProfit >= 0 ? "text-emerald-400" : "text-rose-400",
      borderColor: activeProfit >= 0 ? "border-emerald-500/30" : "border-rose-500/30",
    },
    {
      title: STRINGS.kpiProductionTitle,
      value: `${data.todayUnitsProduced.toLocaleString()} units`,
      subtitle: `${data.todayProductionCount} production batches today`,
      icon: MdOutlineSoupKitchen,
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/30",
    },
    {
      title: STRINGS.kpiInventoryTitle,
      value: `${STRINGS.currency} ${totalStockValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${data.totalRawMaterialsCount} materials, ${data.totalProductsCount} products`,
      icon: MdOutlineInventory2,
      color: "from-purple-500/20 to-purple-500/5",
      iconColor: "text-purple-400",
      borderColor: "border-purple-500/30",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Timeframe View Mode Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-theme-text/70 uppercase tracking-wider">
          Performance Overview
        </h2>
        <div className="flex items-center gap-1 p-1 rounded-2xl border border-theme-border/40 bg-theme-card/60 backdrop-blur-md">
          {(["daily", "weekly", "monthly"] as const).map((mode) => {
            const active = viewMode === mode;

            return (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={`relative px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? "text-black font-black shadow-sm"
                    : "text-theme-text/60 hover:text-theme-text hover:bg-theme-text/[0.04]"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="homeViewModeTab"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute inset-0 rounded-xl bg-theme-accent shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                  />
                )}
                <span className="relative z-10">
                  {mode === "daily"
                    ? STRINGS.viewDaily
                    : mode === "weekly"
                    ? STRINGS.viewWeekly
                    : STRINGS.viewMonthly}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards Grid with Stagger Animation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className={`relative overflow-hidden rounded-2xl border ${card.borderColor} bg-gradient-to-br ${card.color} p-5 backdrop-blur-xl shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-theme-text/60 uppercase tracking-wider">
                    {card.title}
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-theme-text">
                    {card.value}
                  </h3>
                  <p className="mt-1.5 text-xs text-theme-text/50 font-medium">
                    {card.subtitle}
                  </p>
                </div>
                <div
                  className={`flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-theme-background/60 ${card.iconColor} shadow-inner`}
                >
                  <Icon className="size-6" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
