"use client";

import { motion } from "framer-motion";
import type { DailyCarryOverDTO } from "@/types";
import { MdOutlineSync, MdOutlineInventory2, MdOutlineSchedule } from "react-icons/md";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  todayTitle: "Today's End-of-Day Product Carryover",
  todayBadge: "Today (10:00 PM – 6:00 AM)",
  todaySubtitle:
    "Day ended — showing today's unsold goods rolling into tomorrow's opening balances",
  todayEmpty:
    "No unsold products remaining from today. All produced inventory has cleared.",
  yesterdayTitle: "Yesterday's Product Carryover",
  yesterdayBadge: "Yesterday's Close",
  yesterdaySubtitle:
    "Business day active — showing yesterday's remaining carryover (today's opens at 10:00 PM)",
  yesterdayEmpty: "No unsold products carried over from yesterday.",
  totalValuationLabel: "Total Carried Valuation",
  productCol: "Product",
  stockLeftCol: "Remaining",
  valuationCol: "Value",
  unitsLabel: "units",
  currency: "ETB",
  recalcBtn: "Recalculate",
  fallbackProductName: "Product",
};

interface CarryOverCardProps {
  carryOver?: DailyCarryOverDTO;
  period: "today" | "yesterday";
  onRefresh: () => void;
  isPending?: boolean;
}

export default function CarryOverCard({
  carryOver,
  period,
  onRefresh,
  isPending,
}: CarryOverCardProps) {
  const items = carryOver?.items || [];
  const totalValuation = carryOver?.totalValuation || 0;

  const isTodayWindow = period === "today";
  const title = isTodayWindow ? STRINGS.todayTitle : STRINGS.yesterdayTitle;
  const badge = isTodayWindow ? STRINGS.todayBadge : STRINGS.yesterdayBadge;
  const subtitle = isTodayWindow
    ? STRINGS.todaySubtitle
    : STRINGS.yesterdaySubtitle;
  const emptyText = isTodayWindow ? STRINGS.todayEmpty : STRINGS.yesterdayEmpty;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-3xl border border-theme-border/40 bg-theme-card/75 p-6 backdrop-blur-xl shadow-xl space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-theme-border/30">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <MdOutlineInventory2 className="size-5 text-theme-accent" />
            <h3 className="text-base font-bold text-theme-text">{title}</h3>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-semibold ${
                isTodayWindow
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-theme-accent/20 text-theme-accent border-theme-accent/30"
              }`}
            >
              <MdOutlineSchedule className="size-3" />
              <span>{badge}</span>
            </span>
          </div>
          <p className="text-xs text-theme-text/55 mt-1">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-theme-text/50 uppercase font-semibold block">
              {STRINGS.totalValuationLabel}
            </span>
            <span className="text-sm font-black text-theme-accent">
              {STRINGS.currency}{" "}
              {totalValuation.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

	  {/* <button
            type="button"
            onClick={onRefresh}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-theme-border/50 bg-theme-background/60 text-xs font-semibold text-theme-text/80 hover:text-theme-text hover:border-theme-accent/50 cursor-pointer transition-colors active:scale-95 disabled:opacity-50"
          >
            <MdOutlineSync
              className={`size-3.5 ${isPending ? "animate-spin text-theme-accent" : ""}`}
            />
            <span>{STRINGS.recalcBtn}</span>
          </button> */}
        </div>
      </div>

      {/* Condensed 3-Column Items Table (No Total Footer Row) */}
      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-theme-border/20 text-theme-text/50 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">{STRINGS.productCol}</th>
                <th className="py-2.5 px-3 text-right">{STRINGS.stockLeftCol}</th>
                <th className="py-2.5 px-3 text-right">{STRINGS.valuationCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/10">
              {items.map((item, idx) => {
                const prodName =
                  typeof item.product === "object" &&
                  item.product &&
                  "name" in item.product
                    ? item.product.name
                    : STRINGS.fallbackProductName;

                return (
                  <tr
                    key={idx}
                    className="hover:bg-theme-text/[0.04] font-medium text-theme-text/85"
                  >
                    <td className="py-2.5 px-3 font-semibold text-theme-text">
                      {prodName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-theme-text">
                      {item.quantityRemaining.toLocaleString()} {STRINGS.unitsLabel}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-theme-accent">
                      {STRINGS.currency}{" "}
                      {item.valuation.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-theme-text/45">
          {emptyText}
        </div>
      )}
    </motion.div>
  );
}
