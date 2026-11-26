"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getDashboardSummaryAction } from "@/actions";
import { usePermissions } from "@/lib/rbac-client";
import { formatWithAutoUnit } from "@/lib/units";
import type { DailyRawMaterialUsageItem, LowStockAlert } from "@/types";
import {
  MdOutlineWarningAmber,
  MdOutlineCheckCircle,
  MdOutlineSync,
} from "react-icons/md";
import { FiLayers, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  pageTitle: "Notifications & System Alerts",
  pageSubtitle: "Real-time alerts for inventory thresholds and daily raw material usage pace",
  refreshBtn: "Refresh Alerts",
  materialUsageHeading: "Daily Raw Material Usage",
  lowStockHeading: "Low Stock Inventory Alerts",
  emptyText: "No unread alerts. Inventory thresholds and operations are operating normally.",
  noUsageText: "No raw materials consumed in production today yet.",
  alertTypeLowStock: "Low Stock Warning",
  minThreshold: "Safety Threshold:",
  overPaceBadge: "High Daily Usage",
  normalPaceBadge: "Normal Pace",
  usedTodayLabel: "Used today:",
  daysLeftPrefix: "~",
  daysLeftSuffix: "days left",
  verifyingAccess: "Verifying access permissions...",
};

export default function NotificationsPage() {
  const router = useRouter();
  const { permissions, isLoading: rbacLoading } = usePermissions();

  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [usage, setUsage] = useState<DailyRawMaterialUsageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    if (rbacLoading || !permissions.canViewHome) return;

    setLoading(true);
    const res = await getDashboardSummaryAction();
    if (res.success && res.data) {
      setAlerts(res.data.lowStockAlerts || []);
      setUsage((res.data.dailyRawMaterialUsage || []).filter((m) => m.usedToday > 0));
    }
    setLoading(false);
  }, [rbacLoading, permissions.canViewHome]);

  useEffect(() => {
    if (!rbacLoading && !permissions.canViewHome) {
      router.replace(permissions.canViewInventory ? "/inventory" : "/settings");
    }
  }, [rbacLoading, permissions.canViewHome, permissions.canViewInventory, router]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  if (rbacLoading || !permissions.canViewHome) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-8 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-theme-text/60">{STRINGS.verifyingAccess}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="flex flex-col gap-6"
    >
      {/* Title Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-theme-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-theme-text md:text-3xl">
            {STRINGS.pageTitle}
          </h1>
          <p className="text-xs text-theme-text/60 mt-1">
            {STRINGS.pageSubtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={loadAlerts}
          disabled={loading}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-theme-border bg-theme-card px-4 py-2 text-xs font-semibold text-theme-text hover:border-theme-accent transition-colors cursor-pointer shadow-sm"
        >
          <MdOutlineSync className={`size-4 ${loading ? "animate-spin" : ""}`} />
          <span>{STRINGS.refreshBtn}</span>
        </button>
      </div>

      {/* Daily Raw Material Usage Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FiLayers className="size-4 text-theme-accent" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-theme-text/70">
            {STRINGS.materialUsageHeading}
          </h2>
        </div>

        {usage.length === 0 ? (
          <div className="flex items-center gap-2.5 p-4 rounded-2xl border border-theme-border/40 bg-theme-card/50 text-xs text-theme-text/55">
            <FiCheckCircle className="size-4 text-theme-accent shrink-0" />
            <span>{STRINGS.noUsageText}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {usage.map((item) => (
              <div
                key={item.rawMaterialId}
                className={`p-4 rounded-2xl border space-y-2 ${
                  item.isOverDailyBudget
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-theme-border/40 bg-theme-card/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-theme-text">
                    {item.name}
                  </span>
                  {item.isOverDailyBudget ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                      <FiAlertTriangle className="size-3" />
                      <span>{STRINGS.overPaceBadge}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                      <FiCheckCircle className="size-3" />
                      <span>{STRINGS.normalPaceBadge}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-theme-text/75">
                  <span>
                    {STRINGS.usedTodayLabel}{" "}
                    <strong className={item.isOverDailyBudget ? "text-amber-300" : "text-theme-text"}>
                      {formatWithAutoUnit(item.usedToday, item.unit)}
                    </strong>
                  </span>
                  {item.estimatedDaysLeftAtTodayPace !== null && (
                    <span className="text-theme-text/50">
                      {STRINGS.daysLeftPrefix}
                      {Math.max(0, Math.round(item.estimatedDaysLeftAtTodayPace * 10) / 10)}{" "}
                      {STRINGS.daysLeftSuffix}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Low Stock Alerts Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <MdOutlineWarningAmber className="size-4 text-rose-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-theme-text/70">
            {STRINGS.lowStockHeading}
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-theme-border bg-theme-card/50">
              <MdOutlineCheckCircle className="size-10 text-emerald-400 mb-2 opacity-70" />
              <p className="text-xs text-theme-text/50">{STRINGS.emptyText}</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                    <MdOutlineWarningAmber className="size-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                      {STRINGS.alertTypeLowStock}
                    </span>
                    <span className="text-sm font-semibold text-theme-text">
                      {alert.name}
                    </span>
                  </div>
                </div>

                <div className="text-right text-xs font-mono">
                  <div className="text-theme-text font-bold">
                    {alert.currentStock} {alert.unit || "pcs"}
                  </div>
                  <div className="text-[10px] text-theme-text/50">
                    {STRINGS.minThreshold} {alert.threshold}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </motion.div>
  );
}
