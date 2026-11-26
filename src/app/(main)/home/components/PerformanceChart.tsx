"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { DashboardSummaryDTO } from "@/types";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  chartTitle: "7-Day Financial Performance & Trends",
  chartSubtitle: "Daily comparison of revenue, material production costs, and net profit",
  chartRevenue: "Revenue",
  chartCost: "Material Cost",
  chartNet: "Net Profit",
  currency: "ETB",
};

interface PerformanceChartProps {
  data: DashboardSummaryDTO;
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const chartData = data.dailyChart || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-3xl border border-theme-border/40 bg-theme-card/75 p-6 backdrop-blur-xl shadow-xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base font-bold text-theme-text">
            {STRINGS.chartTitle}
          </h3>
          <p className="text-xs text-theme-text/50 mt-0.5">
            {STRINGS.chartSubtitle}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            <span className="text-theme-text/70">{STRINGS.chartRevenue}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]" />
            <span className="text-theme-text/70">{STRINGS.chartCost}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span className="text-theme-text/70">{STRINGS.chartNet}</span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.3)"
                fontSize={11}
                tickFormatter={(val: string) => {
                  try {
                    const parts = val.split("-");
                    return `${parts[1]}/${parts[2]}`;
                  } catch {
                    return val;
                  }
                }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.3)"
                fontSize={11}
                tickFormatter={(val: number) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(17, 24, 39, 0.95)",
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "1rem",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#ffffff" }}
                formatter={(val: unknown) => [
                  `${STRINGS.currency} ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name={STRINGS.chartRevenue}
                stroke="#f59e0b"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#revenueGrad)"
              />
              <Area
                type="monotone"
                dataKey="net"
                name={STRINGS.chartNet}
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#profitGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-theme-text/40">
            No transaction data recorded for this week.
          </div>
        )}
      </div>
    </motion.div>
  );
}
