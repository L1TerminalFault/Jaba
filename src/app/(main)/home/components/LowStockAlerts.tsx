"use client";

import { motion } from "framer-motion";
import type { LowStockAlert } from "@/types";
import { MdOutlineWarningAmber, MdCheckCircleOutline } from "react-icons/md";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  title: "Low Stock Inventory Alerts",
  safeText: "All material and product stocks are currently above safety thresholds.",
  materialTag: "Raw Material",
  productTag: "Product",
  thresholdLabel: "Min threshold",
};

interface LowStockAlertsProps {
  alerts: LowStockAlert[];
}

export default function LowStockAlerts({ alerts }: LowStockAlertsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="rounded-3xl border border-theme-border/40 bg-theme-card/75 p-6 backdrop-blur-xl shadow-xl"
    >
      <div className="flex items-center gap-2 mb-4">
        <MdOutlineWarningAmber className="size-5 text-amber-400" />
        <h3 className="text-base font-bold text-theme-text">{STRINGS.title}</h3>
        {alerts.length > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
            {alerts.length} Warnings
          </span>
        )}
      </div>

      {alerts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-md"
            >
              <div>
                <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider block">
                  {alert.type === "raw_material" ? STRINGS.materialTag : STRINGS.productTag}
                </span>
                <h4 className="text-sm font-bold text-theme-text mt-0.5">
                  {alert.name}
                </h4>
                <p className="text-[11px] text-theme-text/50 font-mono mt-0.5">
                  {STRINGS.thresholdLabel}: {alert.threshold} {alert.unit}
                </p>
              </div>

              <div className="text-right">
                <span className="text-base font-black text-rose-400 font-mono block">
                  {alert.currentStock.toLocaleString()}
                </span>
                <span className="text-[10px] text-theme-text/45 font-medium">
                  {alert.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 py-4 px-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-300">
          <MdCheckCircleOutline className="size-5 text-emerald-400 shrink-0" />
          <span>{STRINGS.safeText}</span>
        </div>
      )}
    </motion.div>
  );
}
