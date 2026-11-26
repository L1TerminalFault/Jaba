"use client";

import { motion } from "framer-motion";
import type { SimpleReportEventDTO } from "@/types";
import {
  FiPackage,
  FiPlay,
  FiShoppingBag,
  FiUser,
  FiClock,
} from "react-icons/fi";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  emptyText: "No buys, production batches, or sales found matching your search.",
  buyLabel: "Buy",
  productionLabel: "Production",
  saleLabel: "Sale",
  voidedLabel: "Voided",
  teamMemberFallback: "Team Member",
};

interface ReportListProps {
  items: SimpleReportEventDTO[];
}

export default function ReportList({ items }: ReportListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-theme-border/40 bg-theme-card/60 p-12 text-center text-xs sm:text-sm text-theme-text/45">
        {STRINGS.emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => {
        const isBuy = item.type === "PURCHASE";
        const isSale = item.type === "SALE";
        const isVoided = item.status === "VOIDED";
        const actorName = item.actorName || STRINGS.teamMemberFallback;
        const created = new Date(item.timestamp);

        const TypeIcon = isBuy
          ? FiPackage
          : isSale
          ? FiShoppingBag
          : FiPlay;

        const badgeClass = isBuy
          ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
          : isSale
          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
          : "bg-blue-500/20 text-blue-300 border-blue-500/30";

        const iconColor = isBuy
          ? "text-amber-400"
          : isSale
          ? "text-emerald-400"
          : "text-blue-400";

        const typeLabel = isBuy
          ? STRINGS.buyLabel
          : isSale
          ? STRINGS.saleLabel
          : STRINGS.productionLabel;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(idx * 0.02, 0.3) }}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-theme-border/40 bg-theme-card/70 hover:bg-theme-text/[0.04] hover:border-theme-accent/40 ${
              isVoided ? "opacity-60" : ""
            }`}
          >
            {/* Left side: Human-readable action & summary */}
            <div className="flex items-start gap-3 min-w-0">
              <div className={`mt-0.5 flex size-8 items-center justify-center rounded-xl bg-theme-background/60 border border-theme-border/40 shrink-0 ${iconColor}`}>
                <TypeIcon className="size-4" />
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}
                  >
                    {typeLabel}
                  </span>

                  {isVoided && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {STRINGS.voidedLabel}
                    </span>
                  )}

                  <span className="flex items-center gap-1 text-[11px] text-theme-text/50 font-mono">
                    <FiClock className="size-3" />
                    {created.toLocaleDateString()} {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <p className={`text-xs sm:text-sm font-bold text-theme-text ${isVoided ? "line-through" : ""}`}>
                  {item.headline}
                </p>

                <p className="text-xs text-theme-text/65 font-medium">
                  {item.summary}
                  {item.note ? ` • "${item.note}"` : ""}
                </p>
              </div>
            </div>

            {/* Right edge of palette: Clerk Full Name & User Icon */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pl-2">
              {item.actorImageUrl ? (
                <img
                  src={item.actorImageUrl}
                  alt={actorName}
                  className="size-6 rounded-full object-cover border border-theme-border/50"
                />
              ) : (
                <span className="flex size-6 items-center justify-center rounded-full bg-theme-background/70 border border-theme-border/50 text-theme-accent">
                  <FiUser className="size-3.5" />
                </span>
              )}
              <span className="text-xs font-semibold text-theme-text/85 truncate max-w-[160px]">
                {actorName}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
