"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listOutputProductsAction, listRawMaterialsAction } from "@/actions";
import { usePermissions } from "@/lib/rbac-client";
import type { OutputProductDTO, RawMaterialDTO } from "@/types";
import InventoryHeader from "./components/InventoryHeader";
import ProductStockList from "./components/ProductStockList";
import MaterialStockList from "./components/MaterialStockList";
import QuickPurchaseModal from "./components/QuickPurchaseModal";
import QuickSaleModal from "./components/QuickSaleModal";
import QuickProductionModal from "./components/QuickProductionModal";
import BatchPurchaseModal from "./components/BatchPurchaseModal";
import BatchProductionModal from "./components/BatchProductionModal";
import BatchSaleModal from "./components/BatchSaleModal";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  loadingInventory: "Loading inventory stock balances...",
  loadingPage: "Loading inventory...",
  verifyingAccess: "Verifying access permissions...",
};

function InventoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { permissions, isLoading: rbacLoading } = usePermissions();

  const initialTab = (searchParams.get("tab") as "products" | "materials") || "products";
  const [activeTab, setActiveTab] = useState<"products" | "materials">(initialTab);

  const [products, setProducts] = useState<OutputProductDTO[]>([]);
  const [materials, setMaterials] = useState<RawMaterialDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Action Modal states
  const [saleProduct, setSaleProduct] = useState<OutputProductDTO | null>(null);
  const [produceProduct, setProduceProduct] = useState<OutputProductDTO | null>(null);
  const [purchaseMaterial, setPurchaseMaterial] = useState<RawMaterialDTO | null>(null);

  // Batch Modal states
  const [showBatchPurchase, setShowBatchPurchase] = useState(false);
  const [showBatchProduction, setShowBatchProduction] = useState(false);
  const [showBatchSale, setShowBatchSale] = useState(false);

  const effectiveTab =
    !permissions.canViewRawMaterials && activeTab === "materials"
      ? "products"
      : activeTab;

  const fetchData = useCallback(async () => {
    if (rbacLoading || !permissions.canViewInventory) return;

    setLoading(true);
    const prodPromise = listOutputProductsAction({ limit: 100 });
    const matPromise = permissions.canViewRawMaterials
      ? listRawMaterialsAction({ limit: 100 })
      : Promise.resolve(null);

    const [prodRes, matRes] = await Promise.all([prodPromise, matPromise]);

    if (prodRes.success && prodRes.data) {
      setProducts(prodRes.data.items);
    }
    if (matRes && matRes.success && matRes.data) {
      setMaterials(matRes.data.items);
    }
    setLoading(false);
  }, [rbacLoading, permissions.canViewInventory, permissions.canViewRawMaterials]);

  useEffect(() => {
    if (rbacLoading) return;

    if (!permissions.canViewInventory) {
      router.replace("/settings");
      return;
    }

    if (!permissions.canViewRawMaterials && activeTab === "materials") {
      setActiveTab("products");
    }
  }, [
    rbacLoading,
    permissions.canViewInventory,
    permissions.canViewRawMaterials,
    activeTab,
    router,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      {/* Inventory Header with Batch Actions and Tabs */}
      <InventoryHeader
        activeTab={effectiveTab}
        onTabChange={(tab) => {
          if (tab === "materials" && !permissions.canViewRawMaterials) return;
          setActiveTab(tab);
        }}
        onOpenBatchPurchase={() => setShowBatchPurchase(true)}
        onOpenBatchProduction={() => setShowBatchProduction(true)}
        onOpenBatchSale={() => setShowBatchSale(true)}
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-8 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-3" />
          <p className="text-xs text-theme-text/60">{STRINGS.loadingInventory}</p>
        </div>
      ) : effectiveTab === "products" ? (
        <ProductStockList
          products={products}
          onRecordSale={(prod) => {
            if (permissions.canSell) setSaleProduct(prod);
          }}
          onRecordProduction={(prod) => {
            if (permissions.canProduce) setProduceProduct(prod);
          }}
        />
      ) : (
        <MaterialStockList
          materials={materials}
          onRecordPurchase={(mat) => {
            if (permissions.canPurchaseRawMaterials) setPurchaseMaterial(mat);
          }}
        />
      )}

      {/* Quick Modals */}
      {permissions.canPurchaseRawMaterials && (
        <>
          <QuickPurchaseModal
            material={purchaseMaterial}
            onClose={() => setPurchaseMaterial(null)}
            onSuccess={fetchData}
          />
          <BatchPurchaseModal
            isOpen={showBatchPurchase}
            materials={materials}
            onClose={() => setShowBatchPurchase(false)}
            onSuccess={fetchData}
          />
        </>
      )}
      {permissions.canSell && (
        <>
          <QuickSaleModal
            product={saleProduct}
            onClose={() => setSaleProduct(null)}
            onSuccess={fetchData}
          />
          <BatchSaleModal
            isOpen={showBatchSale}
            products={products}
            onClose={() => setShowBatchSale(false)}
            onSuccess={fetchData}
          />
        </>
      )}
      {permissions.canProduce && (
        <>
          <QuickProductionModal
            product={produceProduct}
            onClose={() => setProduceProduct(null)}
            onSuccess={fetchData}
          />
          <BatchProductionModal
            isOpen={showBatchProduction}
            products={products}
            onClose={() => setShowBatchProduction(false)}
            onSuccess={fetchData}
          />
        </>
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-xs text-theme-text/50">
          {STRINGS.loadingPage}
        </div>
      }
    >
      <InventoryContent />
    </Suspense>
  );
}
