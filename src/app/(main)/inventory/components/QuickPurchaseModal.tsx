"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { RawMaterialDTO } from "@/types";
import { getUnitsForCanonical, convertToCanonical } from "@/lib/units";
import { createRawMaterialTransactionAction } from "@/actions";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  modalTitle: "Record Material Purchase",
  qtyLabel: "Quantity Purchased",
  unitLabel: "Unit",
  priceLabel: "Total Cost or Price / Unit",
  notesLabel: "Supplier / Invoice Notes",
  notesPlaceholder: "e.g., Lot #412 from Central Wholesale",
  submitBtn: "Record Purchase",
  cancelBtn: "Cancel",
  currency: "ETB",
  submitting: "Recording...",
  conversionNote: "Will be stored as",
};

interface QuickPurchaseModalProps {
  material: RawMaterialDTO | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickPurchaseModal({
  material,
  onClose,
  onSuccess,
}: QuickPurchaseModalProps) {
  if (!material) return null;

  const unitOptions = getUnitsForCanonical(material.unit);
  const [selectedUnit, setSelectedUnit] = useState(unitOptions[0]?.value || material.unit);
  const [qty, setQty] = useState<string>("1");
  const [pricePerUnit, setPricePerUnit] = useState<string>(
    material.currentPrice ? (material.currentPrice * (unitOptions[0]?.factor || 1)).toString() : "10"
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numQty = parseFloat(qty) || 0;
  const numPrice = parseFloat(pricePerUnit) || 0;
  const canonicalQty = convertToCanonical(numQty, selectedUnit, material.unit);
  const totalCost = numQty * numPrice;
  const canonicalUnitPrice = canonicalQty > 0 ? totalCost / canonicalQty : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (canonicalQty <= 0) {
      setError("Please enter a valid quantity greater than zero.");
      return;
    }
    if (numPrice < 0) {
      setError("Price cannot be negative.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await createRawMaterialTransactionAction({
      materials: [
        {
          material: material._id,
          quantityBought: canonicalQty,
          unitPrice: canonicalUnitPrice,
        },
      ],
      note: notes.trim() || undefined,
    });

    setLoading(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Failed to record purchase.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-3xl border border-theme-border/60 bg-theme-background/95 p-6 shadow-2xl backdrop-blur-2xl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-theme-border/40">
          <div>
            <h3 className="text-base font-bold text-theme-text">
              {STRINGS.modalTitle}
            </h3>
            <p className="text-xs text-theme-accent font-semibold mt-0.5">
              {material.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-theme-text/50 hover:text-theme-text cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Quantity & Unit Dropdown */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-theme-text/70 block mb-1">
                {STRINGS.qtyLabel}
              </label>
              <input
                type="number"
                step="any"
                min="0.0001"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-xl border border-theme-border/50 bg-theme-card/60 p-2.5 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-theme-text/70 block mb-1">
                {STRINGS.unitLabel}
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full rounded-xl border border-theme-border/50 bg-theme-card/60 p-2.5 text-xs text-theme-text focus:border-theme-accent focus:outline-none cursor-pointer"
              >
                {unitOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit Conversion Preview */}
          <div className="px-3 py-2 rounded-xl bg-theme-accent/10 border border-theme-accent/20 text-[11px] text-theme-accent flex items-center justify-between">
            <span>{STRINGS.conversionNote}:</span>
            <span className="font-mono font-bold">
              {canonicalQty.toLocaleString()} {material.unit}
            </span>
          </div>

          {/* Price per Selected Unit */}
          <div>
            <label className="text-[11px] font-semibold text-theme-text/70 block mb-1">
              Price per {unitOptions.find((u) => u.value === selectedUnit)?.label || selectedUnit} ({STRINGS.currency})
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
              className="w-full rounded-xl border border-theme-border/50 bg-theme-card/60 p-2.5 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
            />
            <span className="text-[10px] text-theme-text/45 block mt-1">
              Total transaction cost: {STRINGS.currency} {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

          {/* Submit & Cancel */}
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
              className="flex-1 py-2.5 rounded-xl bg-theme-accent text-xs font-bold text-black hover:opacity-90 active:scale-95 cursor-pointer transition-all shadow-md disabled:opacity-50"
            >
              {loading ? STRINGS.submitting : STRINGS.submitBtn}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
