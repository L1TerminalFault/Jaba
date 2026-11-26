"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { RawMaterialDTO } from "@/types";
import { getUnitsForCanonical, convertToCanonical } from "@/lib/units";
import { createRawMaterialTransactionAction } from "@/actions";
import { FiPlus, FiTrash2, FiX } from "react-icons/fi";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  modalTitle: "Batch Raw Material Purchase",
  modalSubtitle: "Purchase multiple raw materials together in one transaction",
  addRowBtn: "Add Material",
  materialLabel: "Raw Material",
  qtyLabel: "Quantity",
  unitLabel: "Unit",
  pricePerUnitLabel: "Price / Unit",
  notesLabel: "Supplier / Invoice Notes (Optional)",
  notesPlaceholder: "e.g., Monthly bulk delivery #208",
  totalCostLabel: "Total Purchase Cost",
  submitBtn: "Complete Batch Purchase",
  submitting: "Recording Purchase...",
  cancelBtn: "Cancel",
  currency: "ETB",
  noMaterialsText: "No active raw materials available for purchase.",
  invalidQtyError: "All quantities must be greater than zero.",
  failedError: "Failed to complete batch purchase.",
};

interface PurchaseRow {
  materialId: string;
  qty: string;
  unitValue: string;
  pricePerSelectedUnit: string;
}

interface BatchPurchaseModalProps {
  isOpen: boolean;
  materials: RawMaterialDTO[];
  onClose: () => void;
  onSuccess: () => void;
}

function createInitialRow(mat: RawMaterialDTO): PurchaseRow {
  const unitOptions = getUnitsForCanonical(mat.unit);
  const firstOpt = unitOptions[0] || { value: mat.unit, factor: 1 };
  const defaultPrice = mat.currentPrice
    ? (mat.currentPrice * firstOpt.factor).toFixed(2)
    : "0";
  return {
    materialId: mat._id,
    qty: "1",
    unitValue: firstOpt.value,
    pricePerSelectedUnit: defaultPrice,
  };
}

export default function BatchPurchaseModal({
  isOpen,
  materials,
  onClose,
  onSuccess,
}: BatchPurchaseModalProps) {
  const activeMaterials = materials.filter((m) => m.isActive);
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setNotes("");
      setRows(
        activeMaterials.length > 0 ? [createInitialRow(activeMaterials[0])] : []
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleAddRow = () => {
    const usedIds = new Set(rows.map((r) => r.materialId));
    const nextMat = activeMaterials.find((m) => !usedIds.has(m._id));
    if (!nextMat) return;
    setRows((prev) => [...prev, createInitialRow(nextMat)]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, newMatId: string) => {
    const mat = activeMaterials.find((m) => m._id === newMatId);
    if (!mat) return;
    setRows((prev) => {
      const next = [...prev];
      next[index] = createInitialRow(mat);
      return next;
    });
  };

  const handleUnitChange = (index: number, newUnitValue: string) => {
    setRows((prev) => {
      const next = [...prev];
      const row = next[index];
      const mat = activeMaterials.find((m) => m._id === row.materialId);
      if (mat) {
        const opts = getUnitsForCanonical(mat.unit);
        const opt = opts.find((o) => o.value === newUnitValue);
        const newPrice =
          mat.currentPrice && opt
            ? (mat.currentPrice * opt.factor).toFixed(2)
            : row.pricePerSelectedUnit;
        next[index] = {
          ...row,
          unitValue: newUnitValue,
          pricePerSelectedUnit: newPrice,
        };
      }
      return next;
    });
  };

  const handleFieldChange = (
    index: number,
    field: "qty" | "pricePerSelectedUnit",
    val: string
  ) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const totalCost = rows.reduce((acc, row) => {
    const q = parseFloat(row.qty) || 0;
    const p = parseFloat(row.pricePerSelectedUnit) || 0;
    return acc + q * p;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rows.length === 0) return;

    const payloadItems: Array<{
      material: string;
      quantityBought: number;
      unitPrice: number;
    }> = [];

    for (const row of rows) {
      const mat = activeMaterials.find((m) => m._id === row.materialId);
      if (!mat) continue;
      const numQty = parseFloat(row.qty) || 0;
      const numPrice = parseFloat(row.pricePerSelectedUnit) || 0;
      const canonicalQty = convertToCanonical(numQty, row.unitValue, mat.unit);
      if (canonicalQty <= 0 || numPrice < 0) {
        setError(STRINGS.invalidQtyError);
        return;
      }
      const rowTotal = numQty * numPrice;
      payloadItems.push({
        material: mat._id,
        quantityBought: canonicalQty,
        unitPrice: rowTotal / canonicalQty,
      });
    }

    setLoading(true);
    setError(null);

    const res = await createRawMaterialTransactionAction({
      materials: payloadItems,
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

            {activeMaterials.length === 0 ? (
              <div className="py-10 text-center text-xs text-theme-text/55">
                {STRINGS.noMaterialsText}
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
                    {STRINGS.materialLabel} ({rows.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    disabled={rows.length >= activeMaterials.length}
                    className="flex items-center gap-1 text-xs font-semibold text-theme-accent hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                  >
                    <FiPlus className="size-3.5" />
                    <span>{STRINGS.addRowBtn}</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {rows.map((row, idx) => {
                    const mat = activeMaterials.find(
                      (m) => m._id === row.materialId
                    );
                    const unitOpts = mat ? getUnitsForCanonical(mat.unit) : [];
                    const otherSelectedIds = new Set(
                      rows
                        .filter((_, i) => i !== idx)
                        .map((r) => r.materialId)
                    );
                    const availableMaterials = activeMaterials.filter(
                      (m) =>
                        m._id === row.materialId || !otherSelectedIds.has(m._id)
                    );
                    const canonicalQty = mat
                      ? convertToCanonical(
                          parseFloat(row.qty) || 0,
                          row.unitValue,
                          mat.unit
                        )
                      : 0;

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-theme-border/40 bg-theme-card/45 p-3 space-y-2"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                          <div className="sm:col-span-4">
                            <label className="text-[10px] font-semibold text-theme-text/60 block mb-1">
                              {STRINGS.materialLabel}
                            </label>
                            <select
                              value={row.materialId}
                              onChange={(e) =>
                                handleMaterialChange(idx, e.target.value)
                              }
                              className="w-full rounded-xl border border-theme-border/50 bg-theme-background/70 p-2 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
                            >
                              {availableMaterials.map((m) => (
                                <option
                                  key={m._id}
                                  value={m._id}
                                  className="bg-gray-900 text-white"
                                >
                                  {m.name}
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
                              step="any"
                              min="0.0001"
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
                              {STRINGS.unitLabel}
                            </label>
                            <select
                              value={row.unitValue}
                              onChange={(e) =>
                                handleUnitChange(idx, e.target.value)
                              }
                              className="w-full rounded-xl border border-theme-border/50 bg-theme-background/70 p-2 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
                            >
                              {unitOpts.map((opt) => (
                                <option
                                  key={opt.value}
                                  value={opt.value}
                                  className="bg-gray-900 text-white"
                                >
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-semibold text-theme-text/60 block mb-1">
                              {STRINGS.pricePerUnitLabel}
                            </label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              required
                              value={row.pricePerSelectedUnit}
                              onChange={(e) =>
                                handleFieldChange(
                                  idx,
                                  "pricePerSelectedUnit",
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

                        {mat && (
                          <div className="flex items-center justify-between text-[10px] font-mono text-theme-text/50 px-1">
                            <span>
                              → {canonicalQty.toLocaleString()} {mat.unit}
                            </span>
                            <span className="text-theme-accent font-semibold">
                              {STRINGS.currency}{" "}
                              {(
                                (parseFloat(row.qty) || 0) *
                                (parseFloat(row.pricePerSelectedUnit) || 0)
                              ).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Grand Total */}
                <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-300">
                    {STRINGS.totalCostLabel}:
                  </span>
                  <span className="font-mono font-black text-amber-400">
                    {STRINGS.currency}{" "}
                    {totalCost.toLocaleString(undefined, {
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
                    className="flex-1 py-2.5 rounded-xl bg-theme-accent text-xs font-bold text-black hover:opacity-90 active:scale-95 cursor-pointer transition-opacity shadow-md disabled:opacity-50"
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
