"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FiArrowLeft, FiBox, FiLayers } from "react-icons/fi";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  title: "Master Catalogue",
  subtitle: "Define product specifications, recipe compositions, measurement units, and standard prices",
  inventoryTooltip: "Return to live stock balances and quick transactions",
  tabProducts: "Products Catalogue",
  tabMaterials: "Raw Materials Catalogue",
};

interface CatalogueHeaderProps {
  activeTab: "products" | "materials";
  onTabChange: (tab: "products" | "materials") => void;
}

export default function CatalogueHeader({
  activeTab,
  onTabChange,
}: CatalogueHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Top Bar: Title & Back to Inventory Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-theme-text">
            {STRINGS.title}
          </h1>
          <p className="text-xs sm:text-sm text-theme-text/60 mt-1">
            {STRINGS.subtitle}
          </p>
        </div>
      </div>

      {/* 2 Tabs: Products and Raw Materials */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl border border-theme-border/40 bg-theme-card/60 backdrop-blur-xl max-w-md">
        <button
          type="button"
          onClick={() => onTabChange("products")}
          className={`relative flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
            activeTab === "products"
              ? "text-black shadow-md font-black"
              : "text-theme-text/60 hover:text-theme-text hover:bg-theme-text/[0.04]"
          }`}
        >
          {activeTab === "products" && (
            <motion.span
              layoutId="catalogueTab"
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
          onClick={() => onTabChange("materials")}
          className={`relative flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
            activeTab === "materials"
              ? "text-black shadow-md font-black"
              : "text-theme-text/60 hover:text-theme-text hover:bg-theme-text/[0.04]"
          }`}
        >
          {activeTab === "materials" && (
            <motion.span
              layoutId="catalogueTab"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute inset-0 rounded-xl bg-theme-accent shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            />
          )}
          <span className="relative text-nowrap z-10 flex items-center gap-2">
            <FiLayers className="size-4" />
            <span>{STRINGS.tabMaterials}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
