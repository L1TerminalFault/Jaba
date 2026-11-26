"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { OutputProductDTO } from "@/types";
import { createProductionEntryAction } from "@/actions";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  modalTitle: "Record Manufacturing Batch",
  qtyLabel: "Units to Produce",
  recipeTitle: "Raw Materials Required per Batch",
  notesLabel: "Batch / Operator Notes",
  notesPlaceholder: "e.g., Morning Shift Batch #A12",
  submitBtn: "Run Production",
  cancelBtn: "Cancel",
  submitting: "Processing Batch...",
  recipeEmpty: "No recipe configured for this product.",
};

interface QuickProductionModalProps {
  product: OutputProductDTO | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickProductionModal({
  product,
  onClose,
  onSuccess,
}: QuickProductionModalProps) {
  if (!product) return null;

  const [qty, setQty] = useState<string>("10");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numQty = parseInt(qty, 10) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numQty <= 0) {
      setError("Please enter a valid batch quantity of at least 1 unit.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await createProductionEntryAction({
      products: [
        {
          product: product._id,
          quantityProduced: numQty,
        },
      ],
      note: notes.trim() || undefined,
    });

    setLoading(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Failed to record production.");
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
              {product.name}
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

          {/* Batch Quantity */}
          <div>
            <label className="text-[11px] font-semibold text-theme-text/70 block mb-1">
              {STRINGS.qtyLabel}
            </label>
            <input
              type="number"
              min="1"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full rounded-xl border border-theme-border/50 bg-theme-card/60 p-2.5 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
            />
          </div>

          {/* Recipe Breakdown Preview */}
          <div>
            <label className="text-[11px] font-semibold text-theme-text/70 block mb-1">
              {STRINGS.recipeTitle}
            </label>
            {product.recipe && product.recipe.length > 0 ? (
              <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-theme-border/40 bg-theme-card/40 p-2 text-xs">
                {product.recipe.map((ing, idx) => {
                  const mat = ing.rawMaterial as { name?: string; unit?: string } | string;
                  const name = typeof mat === "object" && mat.name ? mat.name : "Material";
                  const unit = typeof mat === "object" && mat.unit ? mat.unit : "";
                  const totalUsed = ing.quantity * numQty;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1 px-2 rounded-lg bg-theme-background/40"
                    >
                      <span className="text-theme-text/80">{name}</span>
                      <span className="font-mono text-theme-accent font-semibold">
                        {totalUsed.toLocaleString()} {unit} ({ing.quantity} × {numQty})
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl border border-theme-border/30 text-xs text-theme-text/45 text-center">
                {STRINGS.recipeEmpty}
              </div>
            )}
          </div>

          {/* Batch Notes */}
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
              className="flex-1 py-2.5 rounded-xl bg-blue-500 text-xs font-bold text-black hover:opacity-90 active:scale-95 cursor-pointer transition-all shadow-md disabled:opacity-50"
            >
              {loading ? STRINGS.submitting : STRINGS.submitBtn}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
