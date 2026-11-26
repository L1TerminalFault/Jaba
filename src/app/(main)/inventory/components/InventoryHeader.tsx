"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FiBox,
  FiLayers,
  FiPlusCircle,
  FiPlay,
  FiShoppingBag,
} from "react-icons/fi";
import { usePermissions } from "@/lib/rbac-client";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  title: "Live Inventory & Stock Balances",
  subtitle: "Real-time tracking of finished manufactured goods and warehouse raw materials",
  tabProducts: "Products",
  tabMaterials: "Raw Materials",
  batchPurchaseBtn: "Batch Purchase",
  batchProductionBtn: "Batch Production",
  batchSaleBtn: "Batch Sale",
};

interface InventoryHeaderProps {
  activeTab: "products" | "materials";
  onTabChange?: (tab: "products" | "materials") => void;
  onOpenBatchPurchase?: () => void;
  onOpenBatchProduction?: () => void;
  onOpenBatchSale?: () => void;
}

export default function InventoryHeader({
  activeTab,
  onTabChange,
  onOpenBatchPurchase,
  onOpenBatchProduction,
  onOpenBatchSale,
}: InventoryHeaderProps) {
  const router = useRouter();
  const { permissions } = usePermissions();

  const handleTabClick = (tab: "products" | "materials") => {
    if (tab === "materials" && !permissions.canViewRawMaterials) {
      return;
    }
    if (onTabChange) {
      onTabChange(tab);
    } else {
      router.push(tab === "products" ? "/products" : "/materials");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Title & Batch Operation Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-theme-text">
            {STRINGS.title}
          </h1>
          <p className="text-xs sm:text-sm text-theme-text/60 mt-1">
            {STRINGS.subtitle}
          </p>
        </div>

        {/* Batch Action Buttons (Role-restricted) */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {permissions.canPurchaseRawMaterials && onOpenBatchPurchase && (
            <button
              type="button"
              onClick={onOpenBatchPurchase}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-300 text-xs font-bold hover:bg-amber-500/25 active:scale-95 cursor-pointer shadow-sm"
            >
              <FiPlusCircle className="size-3.5" />
              <span>{STRINGS.batchPurchaseBtn}</span>
            </button>
          )}

          {permissions.canProduce && onOpenBatchProduction && (
            <button
              type="button"
              onClick={onOpenBatchProduction}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-blue-500/40 bg-blue-500/15 text-blue-300 text-xs font-bold hover:bg-blue-500/25 active:scale-95 cursor-pointer shadow-sm"
            >
              <FiPlay className="size-3.5" />
              <span>{STRINGS.batchProductionBtn}</span>
            </button>
          )}

          {permissions.canSell && onOpenBatchSale && (
            <button
              type="button"
              onClick={onOpenBatchSale}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 active:scale-95 cursor-pointer shadow-sm"
            >
              <FiShoppingBag className="size-3.5" />
              <span>{STRINGS.batchSaleBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2 Tabs: Products and Raw Materials (Raw Materials switcher hidden when unauthorized) */}
      {permissions.canViewRawMaterials && (
        <div className="flex items-center gap-2 p-1.5 rounded-2xl border border-theme-border/40 bg-theme-card/60 backdrop-blur-xl max-w-md">
          <button
            type="button"
            onClick={() => handleTabClick("products")}
            className={`relative flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeTab === "products"
                ? "text-black shadow-md font-black"
                : "text-theme-text/60 hover:text-theme-text hover:bg-theme-text/[0.04]"
            }`}
          >
            {activeTab === "products" && (
              <motion.span
                layoutId="inventoryTab"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute inset-0 rounded-xl bg-theme-accent shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <FiBox className="size-4" />
              <span>{STRINGS.tabProducts}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick("materials")}
            className={`relative flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeTab === "materials"
                ? "text-black shadow-md font-black"
                : "text-theme-text/60 hover:text-theme-text hover:bg-theme-text/[0.04]"
            }`}
          >
            {activeTab === "materials" && (
              <motion.span
                layoutId="inventoryTab"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute inset-0 rounded-xl bg-theme-accent shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <FiLayers className="size-4" />
              <span>{STRINGS.tabMaterials}</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
