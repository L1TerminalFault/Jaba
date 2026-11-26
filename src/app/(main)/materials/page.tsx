"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { listRawMaterialsAction } from "@/actions";
import { usePermissions } from "@/lib/rbac-client";
import type { RawMaterialDTO } from "@/types";
import InventoryHeader from "../inventory/components/InventoryHeader";
import MaterialStockList from "../inventory/components/MaterialStockList";
import QuickPurchaseModal from "../inventory/components/QuickPurchaseModal";
import BatchPurchaseModal from "../inventory/components/BatchPurchaseModal";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  loadingMaterials: "Loading raw material stock balances...",
  verifyingAccess: "Verifying access permissions...",
};

export default function MaterialsInventoryPage() {
  const router = useRouter();
  const { permissions, isLoading: rbacLoading } = usePermissions();

  const [materials, setMaterials] = useState<RawMaterialDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseMaterial, setPurchaseMaterial] = useState<RawMaterialDTO | null>(null);
  const [showBatchPurchase, setShowBatchPurchase] = useState(false);

  const fetchMaterials = useCallback(async () => {
    if (rbacLoading || !permissions.canViewRawMaterials) return;

    setLoading(true);
    const res = await listRawMaterialsAction({ limit: 100 });
    if (res.success && res.data) {
      setMaterials(res.data.items);
    }
    setLoading(false);
  }, [rbacLoading, permissions.canViewRawMaterials]);

  useEffect(() => {
    if (rbacLoading) return;

    if (!permissions.canViewInventory) {
      router.replace("/settings");
      return;
    }

    if (!permissions.canViewRawMaterials) {
      router.replace("/products");
    }
  }, [
    rbacLoading,
    permissions.canViewInventory,
    permissions.canViewRawMaterials,
    router,
  ]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  if (rbacLoading || !permissions.canViewRawMaterials) {
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
        activeTab="materials"
        onOpenBatchPurchase={() => setShowBatchPurchase(true)}
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-8 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-3" />
          <p className="text-xs text-theme-text/60">{STRINGS.loadingMaterials}</p>
        </div>
      ) : (
        <MaterialStockList
          materials={materials}
          onRecordPurchase={(mat) => {
            if (permissions.canPurchaseRawMaterials) setPurchaseMaterial(mat);
          }}
        />
      )}

      {permissions.canPurchaseRawMaterials && (
        <>
          <QuickPurchaseModal
            material={purchaseMaterial}
            onClose={() => setPurchaseMaterial(null)}
            onSuccess={fetchMaterials}
          />
          <BatchPurchaseModal
            isOpen={showBatchPurchase}
            materials={materials}
            onClose={() => setShowBatchPurchase(false)}
            onSuccess={fetchMaterials}
          />
        </>
      )}
    </div>
  );
}
