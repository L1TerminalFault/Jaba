"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { listOutputProductsAction } from "@/actions";
import { usePermissions } from "@/lib/rbac-client";
import type { OutputProductDTO } from "@/types";
import InventoryHeader from "../inventory/components/InventoryHeader";
import ProductStockList from "../inventory/components/ProductStockList";
import QuickSaleModal from "../inventory/components/QuickSaleModal";
import QuickProductionModal from "../inventory/components/QuickProductionModal";
import BatchSaleModal from "../inventory/components/BatchSaleModal";
import BatchProductionModal from "../inventory/components/BatchProductionModal";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  loadingProducts: "Loading product stock balances...",
  verifyingAccess: "Verifying access permissions...",
};

export default function ProductsInventoryPage() {
  const router = useRouter();
  const { permissions, isLoading: rbacLoading } = usePermissions();

  const [products, setProducts] = useState<OutputProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saleProduct, setSaleProduct] = useState<OutputProductDTO | null>(null);
  const [produceProduct, setProduceProduct] = useState<OutputProductDTO | null>(null);
  const [showBatchSale, setShowBatchSale] = useState(false);
  const [showBatchProduction, setShowBatchProduction] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (rbacLoading || !permissions.canViewInventory) return;

    setLoading(true);
    const res = await listOutputProductsAction({ limit: 100 });
    if (res.success && res.data) {
      setProducts(res.data.items);
    }
    setLoading(false);
  }, [rbacLoading, permissions.canViewInventory]);

  useEffect(() => {
    if (!rbacLoading && !permissions.canViewInventory) {
      router.replace("/settings");
    }
  }, [rbacLoading, permissions.canViewInventory, router]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (rbacLoading || !permissions.canViewInventory) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-8 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-theme-text/60">{STRINGS.verifyingAccess}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <InventoryHeader
        activeTab="products"
        onOpenBatchProduction={() => setShowBatchProduction(true)}
        onOpenBatchSale={() => setShowBatchSale(true)}
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-8 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-3" />
          <p className="text-xs text-theme-text/60">{STRINGS.loadingProducts}</p>
        </div>
      ) : (
        <ProductStockList
          products={products}
          onRecordSale={(prod) => {
            if (permissions.canSell) setSaleProduct(prod);
          }}
          onRecordProduction={(prod) => {
            if (permissions.canProduce) setProduceProduct(prod);
          }}
        />
      )}

      {permissions.canSell && (
        <>
          <QuickSaleModal
            product={saleProduct}
            onClose={() => setSaleProduct(null)}
            onSuccess={fetchProducts}
          />
          <BatchSaleModal
            isOpen={showBatchSale}
            products={products}
            onClose={() => setShowBatchSale(false)}
            onSuccess={fetchProducts}
          />
        </>
      )}
      {permissions.canProduce && (
        <>
          <QuickProductionModal
            product={produceProduct}
            onClose={() => setProduceProduct(null)}
            onSuccess={fetchProducts}
          />
          <BatchProductionModal
            isOpen={showBatchProduction}
            products={products}
            onClose={() => setShowBatchProduction(false)}
            onSuccess={fetchProducts}
          />
        </>
      )}
    </div>
  );
}
