"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { usePermissions } from "@/lib/rbac-client";
import type { OutputProductDTO } from "@/types";
import {
  FiSearch,
  FiShoppingBag,
  FiPlay,
  FiAlertTriangle,
  FiCheckCircle,
} from "react-icons/fi";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  searchPlaceholder: "Search products in inventory...",
  productCol: "Product",
  stockCol: "Live Stock",
  valuationCol: "Asset Valuation",
  actionsCol: "Quick Actions",
  sellBtn: "Sell",
  produceBtn: "Produce",
  emptyText: "No manufactured products found in inventory.",
  currency: "ETB",
  units: "units",
  ingredientsSuffix: "ingredients",
  inStockBadge: "In Stock",
  outOfStockBadge: "Out of Stock",
};

interface ProductStockListProps {
  products: OutputProductDTO[];
  onRecordSale: (product: OutputProductDTO) => void;
  onRecordProduction: (product: OutputProductDTO) => void;
}

export default function ProductStockList({
  products,
  onRecordSale,
  onRecordProduction,
}: ProductStockListProps) {
  const [search, setSearch] = useState("");
  const { permissions } = usePermissions();

  const showActions = permissions.canSell || permissions.canProduce;

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex items-center gap-2.5 max-w-md rounded-2xl border border-theme-border/50 bg-theme-card/60 px-3.5 py-2.5 backdrop-blur-md focus-within:border-theme-accent transition-colors">
        <FiSearch className="size-4 text-theme-text/50 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={STRINGS.searchPlaceholder}
          className="w-full bg-transparent text-xs sm:text-sm text-theme-text placeholder:text-theme-text/40 focus:outline-none"
        />
      </div>

      {/* Products Table */}
      {filtered.length > 0 ? (
        <div className="overflow-hidden rounded-3xl border border-theme-border/40 bg-theme-card/75 backdrop-blur-xl shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-theme-border/30 text-theme-text/50 uppercase tracking-wider text-[10px] sm:text-[11px] bg-theme-background/30">
                  <th className="py-3 px-4">{STRINGS.productCol}</th>
                  <th className="py-3 px-4 text-right">{STRINGS.stockCol}</th>
                  <th className="py-3 px-4 text-right">{STRINGS.valuationCol}</th>
                  {showActions && (
                    <th className="py-3 px-4 text-center">{STRINGS.actionsCol}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border/10">
                {filtered.map((prod, idx) => {
                  const stock = prod.currentStock ?? 0;
                  const price = prod.currentPrice ?? 0;
                  const valuation = stock * price;
                  const hasStock = stock > 0;

                  return (
                    <motion.tr
                      key={prod._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.03 }}
                      className="hover:bg-theme-text/[0.04]"
                    >
                      {/* Product Name & Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl border border-theme-border/40 bg-theme-background/60 flex items-center justify-center font-black text-theme-accent text-sm shrink-0">
                            {prod.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-theme-text block">
                              {prod.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {hasStock ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                                  <FiCheckCircle className="size-2.5" />
                                  {STRINGS.inStockBadge}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-semibold">
                                  <FiAlertTriangle className="size-2.5" />
                                  {STRINGS.outOfStockBadge}
                                </span>
                              )}
                              <span className="text-theme-border/60 text-[10px]">•</span>
                              <span className="text-[10px] text-theme-text/45">
                                {prod.recipe.length} {STRINGS.ingredientsSuffix}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Live Stock Balance */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black ${
                            hasStock
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {stock.toLocaleString()} {STRINGS.units}
                        </span>
                      </td>

                      {/* Stock Valuation */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-theme-accent">
                        {STRINGS.currency}{" "}
                        {valuation.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Actions: Sell & Produce (Role-restricted) */}
                      {showActions && (
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {permissions.canSell && (
                              <button
                                type="button"
                                onClick={() => onRecordSale(prod)}
                                disabled={!hasStock}
                                title="Record Customer Sale"
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <FiShoppingBag className="size-3" />
                                <span>{STRINGS.sellBtn}</span>
                              </button>
                            )}

                            {permissions.canProduce && (
                              <button
                                type="button"
                                onClick={() => onRecordProduction(prod)}
                                title="Record Production Batch"
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-bold hover:bg-blue-500/20 active:scale-95 cursor-pointer"
                              >
                                <FiPlay className="size-3" />
                                <span>{STRINGS.produceBtn}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-theme-border/40 bg-theme-card/60 p-12 text-center text-xs sm:text-sm text-theme-text/45">
          {STRINGS.emptyText}
        </div>
      )}
    </div>
  );
}
