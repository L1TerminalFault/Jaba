"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  listOutputProductsAction,
  createProductionEntryAction,
  listProductionEntriesAction,
  voidProductionEntryAction,
} from "@/actions";
import { usePermissions } from "@/lib/rbac-client";
import { getUnitsForCanonical, convertToCanonical } from "@/lib/units";
import type {
  OutputProductDTO,
  ProductionEntryDTO,
  RawMaterialUnit,
} from "@/types";
import {
  MdOutlineSoupKitchen,
  MdOutlineAdd,
  MdOutlineHistory,
  MdOutlineCheckCircle,
  MdOutlineCancel,
  MdOutlineWarningAmber,
  MdOutlineSync,
} from "react-icons/md";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  pageTitle: "Kitchen & Production Batches",
  pageSubtitle: "Execute recipe batches with automatic raw material stock deduction & product increments",
  newBatchTitle: "Record New Production Batch",
  productSelectLabel: "Output Product to Produce",
  productSelectPlaceholder: "Select a product...",
  quantityLabel: "Batch Quantity to Produce (Units)",
  recipeBreakdownTitle: "Recipe Ingredients Deduction Breakdown",
  ingredientCol: "Raw Material",
  requiredCol: "Per Unit",
  totalNeededCol: "Total Deduction",
  unitLabel: "Unit",
  noteLabel: "Batch Notes (Optional)",
  notePlaceholder: "e.g., Morning roasting batch #4",
  submitBtn: "Commit Production Batch",
  submittingBtn: "Committing Batch & Updating Stock...",
  historyTitle: "Production Batch History",
  colBatchId: "Batch ID",
  colProducts: "Products & Quantity",
  colMaterialCost: "Material Cost",
  colDate: "Date / Signed By",
  colStatus: "Status",
  colActions: "Actions",
  voidBtn: "Void",
  voidConfirm: "Are you sure you want to void this production batch? This will deduct the produced products and return raw materials to stock.",
  emptyHistory: "No production batch records found.",
  currency: "ETB",
  successBatch: "Production batch committed successfully!",
  verifyingAccess: "Verifying access permissions...",
};

export default function ProductionPage() {
  const router = useRouter();
  const { permissions, isLoading: rbacLoading } = usePermissions();

  const [products, setProducts] = useState<OutputProductDTO[]>([]);
  const [entries, setEntries] = useState<ProductionEntryDTO[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    if (rbacLoading || !permissions.canProduce) return;

    setLoading(true);
    const [prodRes, entryRes] = await Promise.all([
      listOutputProductsAction({ isActive: true, limit: 100 }),
      listProductionEntriesAction({ limit: 50 }),
    ]);

    if (prodRes.success && prodRes.data) {
      setProducts(prodRes.data.items);
      if (prodRes.data.items.length > 0) {
        const firstId = prodRes.data.items[0]._id;
        setSelectedProductId((prev) => prev || firstId);
      }
    }
    if (entryRes.success && entryRes.data) {
      setEntries(entryRes.data.items);
    }
    setLoading(false);
  }, [rbacLoading, permissions.canProduce]);

  useEffect(() => {
    if (!rbacLoading && !permissions.canProduce) {
      router.replace(permissions.canViewInventory ? "/inventory" : "/settings");
    }
  }, [rbacLoading, permissions.canProduce, permissions.canViewInventory, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (rbacLoading || !permissions.canProduce) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-8 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-theme-text/60">{STRINGS.verifyingAccess}</p>
      </div>
    );
  }

  const selectedProduct = products.find((p) => p._id === selectedProductId);

  const handleSubmitBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity < 1) return;

    startTransition(async () => {
      setMessage(null);
      const res = await createProductionEntryAction({
        products: [
          {
            product: selectedProductId,
            quantityProduced: Number(quantity),
          },
        ],
        note: note.trim() || undefined,
      });

      if (res.success) {
        setMessage({ type: "success", text: STRINGS.successBatch });
        setNote("");
        setQuantity(1);
        loadData();
      } else {
        setMessage({ type: "error", text: res.error });
      }
    });
  };

  const handleVoidEntry = (id: string) => {
    if (!window.confirm(STRINGS.voidConfirm)) return;

    startTransition(async () => {
      setMessage(null);
      const res = await voidProductionEntryAction({
        id,
        reason: "Voided by user from production page",
      });

      if (res.success) {
        setMessage({ type: "success", text: "Production batch voided and stock restored." });
        loadData();
      } else {
        setMessage({ type: "error", text: res.error });
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-theme-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-theme-text md:text-3xl">
            {STRINGS.pageTitle}
          </h1>
          <p className="text-xs text-theme-text/60 mt-1">
            {STRINGS.pageSubtitle}
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-theme-border bg-theme-card px-4 py-2 text-xs font-semibold text-theme-text hover:border-theme-accent transition-colors cursor-pointer shadow-sm"
        >
          <MdOutlineSync className={`size-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Status Message Alert */}
      {message && (
        <div
          className={`flex items-center gap-2 rounded-2xl border p-4 text-xs font-semibold backdrop-blur-md ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <MdOutlineCheckCircle className="size-4 shrink-0" />
          ) : (
            <MdOutlineWarningAmber className="size-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Production Form Card */}
      <div className="rounded-2xl border border-theme-border bg-theme-card/70 p-5 md:p-6 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 pb-4 border-b border-theme-border/50">
          <MdOutlineSoupKitchen className="size-5 text-theme-accent" />
          <h2 className="text-base font-bold text-theme-text">{STRINGS.newBatchTitle}</h2>
        </div>

        <form onSubmit={handleSubmitBatch} className="mt-5 flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Product Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-text/70">
                {STRINGS.productSelectLabel}
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-xl border border-theme-border bg-theme-background px-3.5 py-2 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
              >
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Produced */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-text/70">
                {STRINGS.quantityLabel}
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-xl border border-theme-border bg-theme-background px-3.5 py-2 text-xs text-theme-text focus:border-theme-accent focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Recipe Ingredients Preview */}
          {selectedProduct && selectedProduct.recipe && selectedProduct.recipe.length > 0 && (
            <div className="rounded-xl border border-theme-border/60 bg-theme-background/60 p-4">
              <span className="text-xs font-bold text-theme-accent block mb-2">
                {STRINGS.recipeBreakdownTitle}
              </span>
              <div className="divide-y divide-theme-border/30 text-xs">
                {selectedProduct.recipe.map((ing, idx) => {
                  const raw = ing.rawMaterial as unknown as { name?: string; unit?: string };
                  const name = raw?.name || "Ingredient";
                  const unit = raw?.unit || "g";
                  const totalUsed = ing.quantity * quantity;

                  return (
                    <div key={idx} className="flex items-center justify-between py-2">
                      <span className="text-theme-text font-medium">{name}</span>
                      <div className="flex items-center gap-4 font-mono text-[11px]">
                        <span className="text-theme-text/50">
                          {ing.quantity} {unit} / unit
                        </span>
                        <span className="font-bold text-theme-accent">
                          Total: {totalUsed} {unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-theme-text/70">
              {STRINGS.noteLabel}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={STRINGS.notePlaceholder}
              className="w-full rounded-xl border border-theme-border bg-theme-background px-3.5 py-2 text-xs text-theme-text placeholder-theme-text/40 focus:border-theme-accent focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !selectedProductId}
            className="self-start rounded-full bg-theme-accent px-6 py-2.5 text-xs font-bold text-black hover:opacity-90 transition-opacity cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50"
          >
            {isPending ? STRINGS.submittingBtn : STRINGS.submitBtn}
          </button>
        </form>
      </div>

      {/* Production History Table */}
      <div className="overflow-hidden rounded-2xl border border-theme-border bg-theme-card/60 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 p-5 border-b border-theme-border">
          <MdOutlineHistory className="size-5 text-theme-text/70" />
          <h2 className="text-sm font-bold text-theme-text">{STRINGS.historyTitle}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-theme-border bg-theme-card/80 text-theme-text/50">
                <th className="py-3 px-4 font-semibold">{STRINGS.colBatchId}</th>
                <th className="py-3 px-4 font-semibold">{STRINGS.colProducts}</th>
                <th className="py-3 px-4 font-semibold text-right">{STRINGS.colMaterialCost}</th>
                <th className="py-3 px-4 font-semibold">{STRINGS.colDate}</th>
                <th className="py-3 px-4 font-semibold text-center">{STRINGS.colStatus}</th>
                {permissions.canVoidTransactions && (
                  <th className="py-3 px-4 font-semibold text-center">{STRINGS.colActions}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/40">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-theme-text/40">
                    {STRINGS.emptyHistory}
                  </td>
                </tr>
              ) : (
                entries.map((e) => {
                  const isVoided = e.status === "VOIDED";
                  const prodsStr = e.products
                    .map((p) => {
                      const prodDoc = p.product as unknown as { name?: string };
                      return `${p.quantityProduced}x ${prodDoc?.name || "Product"}`;
                    })
                    .join(", ");

                  return (
                    <tr
                      key={e._id}
                      className={`hover:bg-theme-text/[0.04] ${
                        isVoided ? "opacity-50 line-through" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono text-theme-text/60">
                        {e._id.slice(-6)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-theme-text">
                        {prodsStr}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-theme-accent">
                        {STRINGS.currency} {e.totalProductionCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-theme-text/70">
                        <div>{new Date(e.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-theme-text/40">By: {e.signedBy}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isVoided
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                      {permissions.canVoidTransactions && (
                        <td className="py-3.5 px-4 text-center">
                          {!isVoided && (
                            <button
                              onClick={() => handleVoidEntry(e._id)}
                              disabled={isPending}
                              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                            >
                              {STRINGS.voidBtn}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
