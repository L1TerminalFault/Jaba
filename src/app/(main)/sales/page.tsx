"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  listOutputProductsAction,
  createSaleTransactionAction,
  listSaleTransactionsAction,
  voidSaleTransactionAction,
} from "@/actions";
import { usePermissions } from "@/lib/rbac-client";
import type {
  OutputProductDTO,
  SaleTransactionDTO,
} from "@/types";
import {
  MdPointOfSale,
  MdOutlineCheckCircle,
  MdOutlineHistory,
  MdOutlineWarningAmber,
  MdOutlineSync,
} from "react-icons/md";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  pageTitle: "Sales & POS Operations",
  pageSubtitle: "Record customer sales, snapshot selling prices & COGS, and track real net profits",
  newSaleTitle: "Record New Sale Transaction",
  productLabel: "Output Product",
  quantityLabel: "Quantity Sold (Pcs)",
  unitPriceLabel: "Unit Price (ETB)",
  unitPriceHint: "Auto-filled from Product Price catalogue. Can be adjusted.",
  noteLabel: "Sale / Invoice Notes",
  notePlaceholder: "e.g., Table 4 or Customer receipt #108",
  submitSaleBtn: "Complete Sale Transaction",
  submittingSaleBtn: "Recording Sale & Updating Stock...",
  summaryRevenue: "Total Revenue",
  summaryCost: "Total Cost (COGS)",
  summaryProfit: "Net Margin",
  historyTitle: "Sales Transactions Register",
  colInvoiceId: "Invoice #",
  colItems: "Items & Quantity",
  colRevenue: "Total Revenue",
  colProfit: "Gross Profit",
  colDate: "Date / Sold By",
  colStatus: "Status",
  colActions: "Actions",
  voidBtn: "Void",
  voidConfirm: "Are you sure you want to void this sale? Products will be returned to inventory stock.",
  emptyHistory: "No sales records found.",
  currency: "ETB",
  successSale: "Sale transaction completed and product stock deducted!",
  verifyingAccess: "Verifying access permissions...",
};

export default function SalesPage() {
  const router = useRouter();
  const { permissions, isLoading: rbacLoading } = usePermissions();

  const [products, setProducts] = useState<OutputProductDTO[]>([]);
  const [sales, setSales] = useState<SaleTransactionDTO[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<number | undefined>(undefined);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    if (rbacLoading || !permissions.canSell) return;

    setLoading(true);
    const [prodRes, saleRes] = await Promise.all([
      listOutputProductsAction({ isActive: true, limit: 100 }),
      listSaleTransactionsAction({ limit: 50 }),
    ]);

    if (prodRes.success && prodRes.data) {
      setProducts(prodRes.data.items);
      if (prodRes.data.items.length > 0) {
        const firstProd = prodRes.data.items[0];
        setSelectedProductId((prev) => {
          if (!prev) {
            setCustomPrice(firstProd.currentPrice ?? 0);
            return firstProd._id;
          }
          return prev;
        });
      }
    }
    if (saleRes.success && saleRes.data) {
      setSales(saleRes.data.items);
    }
    setLoading(false);
  }, [rbacLoading, permissions.canSell]);

  useEffect(() => {
    if (!rbacLoading && !permissions.canSell) {
      router.replace(permissions.canViewInventory ? "/inventory" : "/settings");
    }
  }, [rbacLoading, permissions.canSell, permissions.canViewInventory, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (rbacLoading || !permissions.canSell) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-8 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-theme-text/60">{STRINGS.verifyingAccess}</p>
      </div>
    );
  }

  const selectedProduct = products.find((p) => p._id === selectedProductId);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p._id === prodId);
    if (prod && prod.currentPrice !== undefined) {
      setCustomPrice(prod.currentPrice);
    }
  };

  const handleCompleteSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity < 1) return;

    startTransition(async () => {
      setMessage(null);
      const res = await createSaleTransactionAction({
        items: [
          {
            product: selectedProductId,
            quantity: Number(quantity),
            unitPrice: customPrice !== undefined && customPrice >= 0 ? customPrice : undefined,
          },
        ],
        note: note.trim() || undefined,
      });

      if (res.success) {
        setMessage({ type: "success", text: STRINGS.successSale });
        setNote("");
        setQuantity(1);
        loadData();
      } else {
        setMessage({ type: "error", text: res.error });
      }
    });
  };

  const handleVoidSale = (id: string) => {
    if (!window.confirm(STRINGS.voidConfirm)) return;

    startTransition(async () => {
      setMessage(null);
      const res = await voidSaleTransactionAction({
        id,
        reason: "Voided by user from sales register",
      });

      if (res.success) {
        setMessage({ type: "success", text: "Sale voided and products returned to inventory stock." });
        loadData();
      } else {
        setMessage({ type: "error", text: res.error });
      }
    });
  };

  const estimatedTotal = (customPrice ?? 0) * quantity;

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

      {/* Message alert */}
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

      {/* POS Quick Sale Form */}
      <div className="rounded-2xl border border-theme-border bg-theme-card/70 p-5 md:p-6 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 pb-4 border-b border-theme-border/50">
          <MdPointOfSale className="size-5 text-emerald-400" />
          <h2 className="text-base font-bold text-theme-text">{STRINGS.newSaleTitle}</h2>
        </div>

        <form onSubmit={handleCompleteSale} className="mt-5 flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Product Selector */}
            <div className="flex flex-col gap-1.5 sm:col-span-1">
              <label className="text-xs font-semibold text-theme-text/70">
                {STRINGS.productLabel}
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full rounded-xl border border-theme-border bg-theme-background px-3.5 py-2 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
              >
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (Stock: {p.currentStock ?? 0} pcs)
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
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

            {/* Selling Price */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-text/70">
                {STRINGS.unitPriceLabel}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={customPrice ?? 0}
                onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-theme-border bg-theme-background px-3.5 py-2 text-xs text-theme-text focus:border-theme-accent focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Subtotal Preview Bar */}
          <div className="flex items-center justify-between rounded-xl border border-theme-border/60 bg-theme-background/60 p-4">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-theme-text/60">Estimated Total Bill</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {STRINGS.currency} {estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-xs text-theme-text/50">
              In Stock: <span className="font-bold text-theme-accent font-mono">{selectedProduct?.currentStock ?? 0} pcs</span>
            </div>
          </div>

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
            className="self-start rounded-full bg-emerald-500 px-6 py-2.5 text-xs font-bold text-black hover:opacity-90 transition-opacity cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            {isPending ? STRINGS.submittingSaleBtn : STRINGS.submitSaleBtn}
          </button>
        </form>
      </div>

      {/* Sales Transactions History */}
      <div className="overflow-hidden rounded-2xl border border-theme-border bg-theme-card/60 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 p-5 border-b border-theme-border">
          <MdOutlineHistory className="size-5 text-theme-text/70" />
          <h2 className="text-sm font-bold text-theme-text">{STRINGS.historyTitle}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-theme-border bg-theme-card/80 text-theme-text/50">
                <th className="py-3 px-4 font-semibold">{STRINGS.colInvoiceId}</th>
                <th className="py-3 px-4 font-semibold">{STRINGS.colItems}</th>
                <th className="py-3 px-4 font-semibold text-right">{STRINGS.colRevenue}</th>
                <th className="py-3 px-4 font-semibold text-right">{STRINGS.colProfit}</th>
                <th className="py-3 px-4 font-semibold">{STRINGS.colDate}</th>
                <th className="py-3 px-4 font-semibold text-center">{STRINGS.colStatus}</th>
                {permissions.canVoidTransactions && (
                  <th className="py-3 px-4 font-semibold text-center">{STRINGS.colActions}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/40">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-theme-text/40">
                    {STRINGS.emptyHistory}
                  </td>
                </tr>
              ) : (
                sales.map((s) => {
                  const isVoided = s.status === "VOIDED";
                  const itemsStr = s.items
                    .map((i) => {
                      const prodDoc = i.product as unknown as { name?: string };
                      return `${i.quantity}x ${prodDoc?.name || "Product"}`;
                    })
                    .join(", ");

                  return (
                    <tr
                      key={s._id}
                      className={`hover:bg-theme-text/[0.04] ${
                        isVoided ? "opacity-50 line-through" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono text-theme-text/60">
                        {s._id.slice(-6)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-theme-text">
                        {itemsStr}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        {STRINGS.currency} {s.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-theme-accent">
                        {STRINGS.currency} {(s.netProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-theme-text/70">
                        <div>{new Date(s.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-theme-text/40">By: {s.signedBy}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isVoided
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      {permissions.canVoidTransactions && (
                        <td className="py-3.5 px-4 text-center">
                          {!isVoided && (
                            <button
                              onClick={() => handleVoidSale(s._id)}
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
