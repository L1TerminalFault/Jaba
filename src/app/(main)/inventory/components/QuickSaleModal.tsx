"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { OutputProductDTO } from "@/types";
import { createSaleTransactionAction } from "@/actions";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  modalTitle: "Record Customer Sale",
  qtyLabel: "Quantity Sold",
  availableLabel: "Available in stock",
  unitPriceLabel: "Sale Price per Unit",
  notesLabel: "Sale Notes / Customer Name",
  notesPlaceholder: "e.g., Counter walk-in sale #104",
  submitBtn: "Complete Sale",
  cancelBtn: "Cancel",
  currency: "ETB",
  submitting: "Processing...",
  revenueLabel: "Total Sale Revenue",
};

interface QuickSaleModalProps {
  product: OutputProductDTO | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickSaleModal({
  product,
  onClose,
  onSuccess,
}: QuickSaleModalProps) {
  if (!product) return null;

  const currentStock = product.currentStock ?? 0;
  const [qty, setQty] = useState<string>("1");
  const [unitPrice, setUnitPrice] = useState<string>(
    product.currentPrice ? product.currentPrice.toString() : "0"
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numQty = parseInt(qty, 10) || 0;
  const numPrice = parseFloat(unitPrice) || 0;
  const totalRevenue = numQty * numPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numQty <= 0) {
      setError("Please enter a valid quantity of at least 1 unit.");
      return;
    }
    if (numQty > currentStock) {
      setError(`Insufficient inventory! Only ${currentStock} units are available.`);
      return;
    }
    if (numPrice < 0) {
      setError("Unit price cannot be negative.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await createSaleTransactionAction({
      items: [
        {
          product: product._id,
          quantity: numQty,
          unitPrice: numPrice,
        },
      ],
      note: notes.trim() || undefined,
    });

    setLoading(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Failed to record sale.");
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

          {/* Stock availability banner */}
          <div className="px-3 py-2 rounded-xl bg-theme-card/60 border border-theme-border/40 text-xs text-theme-text/70 flex items-center justify-between">
            <span>{STRINGS.availableLabel}:</span>
            <span className="font-mono font-bold text-emerald-400">
              {currentStock.toLocaleString()} units
            </span>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-[11px] font-semibold text-theme-text/70 block mb-1">
              {STRINGS.qtyLabel}
            </label>
            <input
              type="number"
              min="1"
              max={currentStock}
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full rounded-xl border border-theme-border/50 bg-theme-card/60 p-2.5 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
            />
          </div>

          {/* Unit Price */}
          <div>
            <label className="text-[11px] font-semibold text-theme-text/70 block mb-1">
              {STRINGS.unitPriceLabel} ({STRINGS.currency})
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="w-full rounded-xl border border-theme-border/50 bg-theme-card/60 p-2.5 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
            />
          </div>

          {/* Revenue Total Preview */}
          <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
            <span>{STRINGS.revenueLabel}:</span>
            <span className="font-mono font-black text-emerald-400">
              {STRINGS.currency} {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              disabled={loading || currentStock <= 0}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-xs font-bold text-black hover:opacity-90 active:scale-95 cursor-pointer transition-all shadow-md disabled:opacity-40"
            >
              {loading ? STRINGS.submitting : STRINGS.submitBtn}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
