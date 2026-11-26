"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { OutputProductDTO } from "@/types";
import { createSaleTransactionAction } from "@/actions";
import { FiPlus, FiTrash2, FiX } from "react-icons/fi";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  modalTitle: "Batch Customer Sale",
  modalSubtitle: "Sell multiple finished products in a single invoice",
  addRowBtn: "Add Product",
  productLabel: "Output Product",
  qtyLabel: "Quantity",
  unitPriceLabel: "Unit Price",
  notesLabel: "Sale Notes / Customer Name (Optional)",
  notesPlaceholder: "e.g., Wholesale counter order #42",
  totalRevenueLabel: "Total Sale Revenue",
  submitBtn: "Complete Batch Sale",
  submitting: "Processing Sale...",
  cancelBtn: "Cancel",
  currency: "ETB",
  inStockSuffix: "in stock",
  noProductsText: "No in-stock products available for sale.",
  invalidQtyError: "All quantities must be at least 1 unit.",
  insufficientStockError: "Insufficient stock for",
  failedError: "Failed to complete batch sale.",
};

interface SaleRow {
  productId: string;
  qty: string;
  unitPrice: string;
}

interface BatchSaleModalProps {
  isOpen: boolean;
  products: OutputProductDTO[];
  onClose: () => void;
  onSuccess: () => void;
}

function createInitialRow(prod: OutputProductDTO): SaleRow {
  return {
    productId: prod._id,
    qty: "1",
    unitPrice: prod.currentPrice ? prod.currentPrice.toString() : "0",
  };
}

export default function BatchSaleModal({
  isOpen,
  products,
  onClose,
  onSuccess,
}: BatchSaleModalProps) {
  const inStockProducts = products.filter(
    (p) => p.isActive && (p.currentStock ?? 0) > 0
  );

  const [rows, setRows] = useState<SaleRow[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setNotes("");
      setRows(
        inStockProducts.length > 0 ? [createInitialRow(inStockProducts[0])] : []
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleAddRow = () => {
    const usedIds = new Set(rows.map((r) => r.productId));
    const nextProd = inStockProducts.find((p) => !usedIds.has(p._id));
    if (!nextProd) return;
    setRows((prev) => [...prev, createInitialRow(nextProd)]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, newProdId: string) => {
    const prod = inStockProducts.find((p) => p._id === newProdId);
    if (!prod) return;
    setRows((prev) => {
      const next = [...prev];
      next[index] = createInitialRow(prod);
      return next;
    });
  };

  const handleFieldChange = (
    index: number,
    field: "qty" | "unitPrice",
    val: string
  ) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const totalRevenue = rows.reduce((acc, row) => {
    const q = parseInt(row.qty, 10) || 0;
    const p = parseFloat(row.unitPrice) || 0;
    return acc + q * p;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rows.length === 0) return;

    const payloadItems: Array<{
      product: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const row of rows) {
      const prod = inStockProducts.find((p) => p._id === row.productId);
      if (!prod) continue;
      const numQty = parseInt(row.qty, 10) || 0;
      const numPrice = parseFloat(row.unitPrice) || 0;
      const stock = prod.currentStock ?? 0;

      if (numQty <= 0) {
        setError(STRINGS.invalidQtyError);
        return;
      }
      if (numQty > stock) {
        setError(`${STRINGS.insufficientStockError} "${prod.name}".`);
        return;
      }
      if (numPrice < 0) {
        setError(STRINGS.failedError);
        return;
      }

      payloadItems.push({
        product: prod._id,
        quantity: numQty,
        unitPrice: numPrice,
      });
    }

    setLoading(true);
    setError(null);

    const res = await createSaleTransactionAction({
      items: payloadItems,
      note: notes.trim() || undefined,
    });

    setLoading(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || STRINGS.failedError);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-2xl rounded-3xl border border-theme-border/60 bg-theme-background/95 p-6 shadow-2xl backdrop-blur-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-theme-border/40">
              <div>
                <h3 className="text-base font-bold text-theme-text">
                  {STRINGS.modalTitle}
                </h3>
                <p className="text-xs text-theme-text/55 mt-0.5">
                  {STRINGS.modalSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-theme-text/50 hover:text-theme-text cursor-pointer p-1"
              >
                <FiX className="size-4" />
              </button>
            </div>

            {inStockProducts.length === 0 ? (
              <div className="py-10 text-center text-xs text-theme-text/55">
                {STRINGS.noProductsText}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-theme-text">
                    {STRINGS.productLabel} ({rows.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    disabled={rows.length >= inStockProducts.length}
                    className="flex items-center gap-1 text-xs font-semibold text-theme-accent hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                  >
                    <FiPlus className="size-3.5" />
                    <span>{STRINGS.addRowBtn}</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {rows.map((row, idx) => {
                    const prod = inStockProducts.find(
                      (p) => p._id === row.productId
                    );
                    const stock = prod?.currentStock ?? 0;
                    const otherSelectedIds = new Set(
                      rows.filter((_, i) => i !== idx).map((r) => r.productId)
                    );
                    const availableProducts = inStockProducts.filter(
                      (p) =>
                        p._id === row.productId || !otherSelectedIds.has(p._id)
                    );

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-theme-border/40 bg-theme-card/45 p-3 space-y-2"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                          <div className="sm:col-span-6">
                            <label className="text-[10px] font-semibold text-theme-text/60 block mb-1">
                              {STRINGS.productLabel}
                            </label>
                            <select
                              value={row.productId}
                              onChange={(e) =>
                                handleProductChange(idx, e.target.value)
                              }
                              className="w-full rounded-xl border border-theme-border/50 bg-theme-background/70 p-2 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
                            >
                              {availableProducts.map((p) => (
                                <option
                                  key={p._id}
                                  value={p._id}
                                  className="bg-gray-900 text-white"
                                >
                                  {p.name} ({p.currentStock ?? 0}{" "}
                                  {STRINGS.inStockSuffix})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-semibold text-theme-text/60 block mb-1">
                              {STRINGS.qtyLabel}
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={stock}
                              required
                              value={row.qty}
                              onChange={(e) =>
                                handleFieldChange(idx, "qty", e.target.value)
                              }
                              className="w-full rounded-xl border border-theme-border/50 bg-theme-background/70 p-2 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="text-[10px] font-semibold text-theme-text/60 block mb-1">
                              {STRINGS.unitPriceLabel} ({STRINGS.currency})
                            </label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              required
                              value={row.unitPrice}
                              onChange={(e) =>
                                handleFieldChange(
                                  idx,
                                  "unitPrice",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-theme-border/50 bg-theme-background/70 p-2 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
                            />
                          </div>

                          <div className="sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              disabled={rows.length <= 1}
                              className="p-2 text-rose-400 hover:text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <FiTrash2 className="size-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-theme-text/50 px-1">
                          <span>
                            {stock.toLocaleString()} {STRINGS.inStockSuffix}
                          </span>
                          <span className="text-emerald-400 font-semibold">
                            {STRINGS.currency}{" "}
                            {(
                              (parseInt(row.qty, 10) || 0) *
                              (parseFloat(row.unitPrice) || 0)
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Grand Revenue Preview */}
                <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-300">
                    {STRINGS.totalRevenueLabel}:
                  </span>
                  <span className="font-mono font-black text-emerald-400">
                    {STRINGS.currency}{" "}
                    {totalRevenue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] font-semibold text-theme-text/70 block mb-1">
                    {STRINGS.notesLabel}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={STRINGS.notesPlaceholder}
                    className="w-full rounded-xl border border-theme-border/50 bg-theme-card/60 p-2.5 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl border border-theme-border/50 text-xs font-semibold text-theme-text/70 hover:text-theme-text cursor-pointer transition-colors"
                  >
                    {STRINGS.cancelBtn}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-xs font-bold text-black hover:opacity-90 active:scale-95 cursor-pointer transition-opacity shadow-md disabled:opacity-50"
                  >
                    {loading ? STRINGS.submitting : STRINGS.submitBtn}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
