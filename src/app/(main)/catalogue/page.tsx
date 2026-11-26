"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listOutputProductsAction, listRawMaterialsAction } from "@/actions";
import { usePermissions } from "@/lib/rbac-client";
import type { OutputProductDTO, RawMaterialDTO } from "@/types";
import CatalogueHeader from "./components/CatalogueHeader";
import ProductCatalogueList from "./components/ProductCatalogueList";
import MaterialCatalogueList from "./components/MaterialCatalogueList";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  loadingCatalogue: "Loading catalogue definitions...",
  loadingPage: "Loading catalogue...",
  verifyingAccess: "Verifying access permissions...",
};

function CatalogueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { permissions, isLoading: rbacLoading } = usePermissions();

  const initialTab = (searchParams.get("tab") as "products" | "materials") || "products";
  const [activeTab, setActiveTab] = useState<"products" | "materials">(initialTab);

  const [products, setProducts] = useState<OutputProductDTO[]>([]);
  const [materials, setMaterials] = useState<RawMaterialDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (rbacLoading || !permissions.canViewCatalogue) return;

    setLoading(true);
    const [prodRes, matRes] = await Promise.all([
      listOutputProductsAction({ limit: 100 }),
      listRawMaterialsAction({ limit: 100 }),
    ]);

    if (prodRes.success && prodRes.data) {
      setProducts(prodRes.data.items);
    }
    if (matRes.success && matRes.data) {
      setMaterials(matRes.data.items);
    }
    setLoading(false);
  }, [rbacLoading, permissions.canViewCatalogue]);

  useEffect(() => {
    if (rbacLoading) return;

    if (!permissions.canViewCatalogue) {
      router.replace(permissions.canViewInventory ? "/inventory" : "/settings");
    }
  }, [
    rbacLoading,
    permissions.canViewCatalogue,
    permissions.canViewInventory,
    router,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (rbacLoading || !permissions.canViewCatalogue) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-8 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-theme-text/60">{STRINGS.verifyingAccess}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <CatalogueHeader
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-8 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-3" />
          <p className="text-xs text-theme-text/60">{STRINGS.loadingCatalogue}</p>
        </div>
      ) : activeTab === "products" ? (
        <ProductCatalogueList
          products={products}
          rawMaterials={materials}
          onRefresh={fetchData}
        />
      ) : (
        <MaterialCatalogueList
          materials={materials}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}

export default function CataloguePage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-xs text-theme-text/50">
          {STRINGS.loadingPage}
        </div>
      }
    >
      <CatalogueContent />
    </Suspense>
  );
}
