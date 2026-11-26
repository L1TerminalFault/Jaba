"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getDashboardSummaryAction, calculateDailyCarryOverAction } from "@/actions";
import { usePermissions } from "@/lib/rbac-client";
import type { DashboardSummaryDTO } from "@/types";
import SummaryCards from "./components/SummaryCards";
import PerformanceChart from "./components/PerformanceChart";
import RawMaterialUsageCard from "./components/RawMaterialUsageCard";
import CarryOverCard from "./components/CarryOverCard";
import LowStockAlerts from "./components/LowStockAlerts";
import NotificationsDrawer from "./components/NotificationsDrawer";
import { MdOutlineSync, MdOutlineNotifications } from "react-icons/md";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  pageTitle: "Operations Dashboard",
  pageSubtitle: "Live tracking of production, inventory carryover, and sales profitability",
  refreshBtn: "Refresh",
  notificationsBtn: "Notifications",
  loadingText: "Loading dashboard metrics...",
  verifyingAccess: "Verifying access permissions...",
};

/**
 * Determines which carryover snapshot to display based on local time:
 * - Show today's carryover when day is ended: 10:00 PM (22:00) through next morning 6:00 AM (06:00).
 * - Show yesterday's carryover at all other times (6:00 AM – 9:59 PM).
 */
function getCarryOverWindow(now: Date = new Date()): {
  period: "today" | "yesterday";
  targetDateStr: string;
} {
  const hour = now.getHours();
  const isDayEndedWindow = hour >= 22 || hour < 6;
  const target = new Date(now);
  if (!isDayEndedWindow) {
    target.setDate(target.getDate() - 1);
  }
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, "0");
  const d = String(target.getDate()).padStart(2, "0");
  return {
    period: isDayEndedWindow ? "today" : "yesterday",
    targetDateStr: `${y}-${m}-${d}`,
  };
}

export default function HomePage() {
  const router = useRouter();
  const { permissions, isLoading: rbacLoading } = usePermissions();

  const [data, setData] = useState<DashboardSummaryDTO | null>(null);
  const [carryOverPeriod, setCarryOverPeriod] = useState<"today" | "yesterday">(
    "today" // () => getCarryOverWindow().period
  );
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">("daily");
  const [showNotifications, setShowNotifications] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchDashboard = useCallback(async () => {
    if (rbacLoading || !permissions.canViewHome) return;

    const windowInfo = getCarryOverWindow();
    setCarryOverPeriod(windowInfo.period);

    setLoading(true);
    const res = await getDashboardSummaryAction(windowInfo.targetDateStr);
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  }, [rbacLoading, permissions.canViewHome]);

  const handleRecalculateCarryOver = () => {
    startTransition(async () => {
      const windowInfo = getCarryOverWindow();
      setCarryOverPeriod(windowInfo.period);

      const res = await calculateDailyCarryOverAction(windowInfo.targetDateStr);
      if (res.success && res.data && data) {
        setData({
          ...data,
          dailyCarryOver: res.data,
        });
      }
    });
  };

  useEffect(() => {
    if (rbacLoading) return;

    if (!permissions.canViewHome) {
      router.replace(permissions.canViewInventory ? "/inventory" : "/settings");
    }
  }, [rbacLoading, permissions.canViewHome, permissions.canViewInventory, router]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (rbacLoading || !permissions.canViewHome) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="size-10 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-4" />
        <p className="text-xs text-theme-text/60 font-medium">
          {STRINGS.verifyingAccess}
        </p>
      </div>
    );
  }

  const notificationWarningCount =
    (data?.lowStockAlerts?.length || 0) +
    (data?.dailyRawMaterialUsage?.filter((m) => m.isOverDailyBudget).length ||
      0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-theme-text">
            {STRINGS.pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-theme-text/60 mt-1">
            {STRINGS.pageSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchDashboard}
            disabled={loading || isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-theme-border/50 bg-theme-card/80 text-xs font-semibold text-theme-text/80 hover:text-theme-text hover:border-theme-accent/50 cursor-pointer transition-colors shadow-md active:scale-95 disabled:opacity-50"
          >
            <MdOutlineSync className={`size-4 ${loading ? "animate-spin text-theme-accent" : ""}`} />
            <span>{STRINGS.refreshBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-2xl border border-theme-border/50 bg-theme-card/80 text-xs font-semibold text-theme-text/80 hover:text-theme-accent hover:border-theme-accent/50 cursor-pointer transition-colors shadow-md active:scale-95"
          >
            <MdOutlineNotifications className="size-4 text-theme-accent" />
            <span>{STRINGS.notificationsBtn}</span>
            {notificationWarningCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black font-mono">
                {notificationWarningCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="size-10 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-4" />
          <p className="text-xs text-theme-text/60 font-medium">
            {STRINGS.loadingText}
          </p>
        </div>
      ) : data ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          {/* 1. KPI Summary Cards */}
          <SummaryCards
            data={data}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* 2. 7-Day Performance Trends Chart */}
          <PerformanceChart data={data} />

          {/* 3. Daily Raw Material Usage vs Monthly Purchase Pace */}
          <RawMaterialUsageCard items={data.dailyRawMaterialUsage || []} />

          {/* 4. Serverless Dynamic Carryover Breakdown (Today 10PM-6AM / Yesterday otherwise) */}
          <CarryOverCard
            carryOver={data.dailyCarryOver}
            period={carryOverPeriod}
            onRefresh={handleRecalculateCarryOver}
            isPending={isPending}
          />

          {/* 5. Low Stock Safety Alerts */}
          <LowStockAlerts alerts={data.lowStockAlerts || []} />
        </motion.div>
      ) : null}

      {/* Right-Side Notifications & Daily Material Usage Slider */}
      <NotificationsDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        alerts={data?.lowStockAlerts || []}
        materialUsage={data?.dailyRawMaterialUsage || []}
      />
    </div>
  );
}
