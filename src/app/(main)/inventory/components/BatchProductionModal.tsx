"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { OutputProductDTO, RawMaterialUnit } from "@/types";
import { createProductionEntryAction } from "@/actions";
import { formatWithAutoUnit } from "@/lib/units";
import { FiPlus, FiTrash2, FiX } from "react-icons/fi";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  modalTitle: "Batch Manufacturing Run",
  modalSubtitle: "Produce multiple output products in one atomic batch",
  addRowBtn: "Add Product",
  productLabel: "Output Product",
  qtyLabel: "Units to Produce",
  ingredientsSummaryLabel: "Total Raw Materials Required",
  notesLabel: "Batch / Operator Notes (Optional)",
  notesPlaceholder: "e.g., Afternoon multi-product batch",
  submitBtn: "Run Batch Production",
  submitting: "Processing Batch...",
  cancelBtn: "Cancel",
  noProductsText: "No active products available for production.",
  invalidQtyError: "All batch quantities must be at least 1 unit.",
  failedError: "Failed to record batch production.",
};

interface ProductionRow {
  productId: string;
  qty: string;
}

interface BatchProductionModalProps {
  isOpen: boolean;
  products: OutputProductDTO[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BatchProductionModal({
  isOpen,
  products,
  onClose,
  onSuccess,
}: BatchProductionModalProps) {
  const activeProducts = products.filter((p) => p.isActive);
  const [rows, setRows] = useState<ProductionRow[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setNotes("");
      setRows(
        activeProducts.length > 0
          ? [{ productId: activeProducts[0]._id, qty: "10" }]
          : []
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleAddRow = () => {
    const usedIds = new Set(rows.map((r) => r.productId));
    const nextProd = activeProducts.find((p) => !usedIds.has(p._id));
    if (!nextProd) return;
    setRows((prev) => [...prev, { productId: nextProd._id, qty: "10" }]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (
    index: number,
    field: "productId" | "qty",
    value: string
  ) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const aggregatedMaterials = useMemo(() => {
    const map = new Map<
      string,
      { name: string; unit: RawMaterialUnit; totalQty: number }
    >();

    for (const row of rows) {
      const prod = activeProducts.find((p) => p._id === row.productId);
      const q = parseInt(row.qty, 10) || 0;
      if (!prod || q <= 0) continue;

      for (const ing of prod.recipe || []) {
        const matObj = ing.rawMaterial as
          | { _id?: string; name?: string; unit?: RawMaterialUnit }
          | string;
        const matId =
          typeof matObj === "object" && matObj?._id
            ? matObj._id
            : String(matObj);
        const name =
          typeof matObj === "object" && matObj?.name
            ? matObj.name
            : "Material";
        const unit: RawMaterialUnit =
          typeof matObj === "object" && matObj?.unit ? matObj.unit : "g";

        const prev = map.get(matId) || { name, unit, totalQty: 0 };
        prev.totalQty += ing.quantity * q;
        map.set(matId, prev);
      }
    }

    return Array.from(map.values());
  }, [rows, activeProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rows.length === 0) return;

    const payloadProducts: Array<{ product: string; quantityProduced: number }> =
      [];

    for (const row of rows) {
      const numQty = parseInt(row.qty, 10) || 0;
      if (numQty <= 0) {
        setError(STRINGS.invalidQtyError);
        return;
      }
      payloadProducts.push({
        product: row.productId,
        quantityProduced: numQty,
      });
    }

    setLoading(true);
    setError(null);

    const res = await createProductionEntryAction({
      products: payloadProducts,
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
            className="w-full max-w-xl rounded-3xl border border-theme-border/60 bg-theme-background/95 p-6 shadow-2xl backdrop-blur-2xl max-h-[90vh] overflow-y-auto"
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

            {activeProducts.length === 0 ? (
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
                    disabled={rows.length >= activeProducts.length}
                    className="flex items-center gap-1 text-xs font-semibold text-theme-accent hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                  >
                    <FiPlus className="size-3.5" />
                    <span>{STRINGS.addRowBtn}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {rows.map((row, idx) => {
                    const otherSelectedIds = new Set(
                      rows.filter((_, i) => i !== idx).map((r) => r.productId)
                    );
                    const availableProducts = activeProducts.filter(
                      (p) =>
                        p._id === row.productId || !otherSelectedIds.has(p._id)
                    );

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-2xl border border-theme-border/40 bg-theme-card/45"
                      >
                        <select
                          value={row.productId}
                          onChange={(e) =>
                            handleRowChange(idx, "productId", e.target.value)
                          }
                          className="flex-1 rounded-xl border border-theme-border/50 bg-theme-background/70 p-2 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
                        >
                          {availableProducts.map((p) => (
                            <option
                              key={p._id}
                              value={p._id}
                              className="bg-gray-900 text-white"
                            >
                              {p.name}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min="1"
                          required
                          value={row.qty}
                          onChange={(e) =>
                            handleRowChange(idx, "qty", e.target.value)
                          }
                          placeholder={STRINGS.qtyLabel}
                          className="w-28 rounded-xl border border-theme-border/50 bg-theme-background/70 p-2 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          disabled={rows.length <= 1}
                          className="p-2 text-rose-400 hover:text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <FiTrash2 className="size-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Aggregated Raw Material Requirements */}
                {aggregatedMaterials.length > 0 && (
                  <div>
                    <label className="text-[11px] font-semibold text-theme-text/70 block mb-1.5">
                      {STRINGS.ingredientsSummaryLabel}
                    </label>
                    <div className="max-h-36 overflow-y-auto space-y-1 rounded-2xl border border-theme-border/40 bg-theme-card/40 p-2.5 text-xs">
                      {aggregatedMaterials.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1 px-2 rounded-lg bg-theme-background/40"
                        >
                          <span className="text-theme-text/85">{item.name}</span>
                          <span className="font-mono font-bold text-theme-accent">
                            {formatWithAutoUnit(item.totalQty, item.unit)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                    className="flex-1 py-2.5 rounded-xl bg-blue-500 text-xs font-bold text-black hover:opacity-90 active:scale-95 cursor-pointer transition-opacity shadow-md disabled:opacity-50"
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
