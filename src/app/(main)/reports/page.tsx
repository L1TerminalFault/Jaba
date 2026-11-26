"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getSimpleActivityReportsAction } from "@/actions";
import { usePermissions } from "@/lib/rbac-client";
import type { SimpleReportEventDTO, SimpleReportType } from "@/types";
import ReportHeader from "./components/ReportHeader";
import ReportFilters from "./components/ReportFilters";
import ReportList from "./components/ReportList";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  loadingReports: "Loading activity reports...",
  verifyingAccess: "Verifying access permissions...",
};

export default function ReportsPage() {
  const router = useRouter();
  const { permissions, isLoading: rbacLoading } = usePermissions();

  const [allItems, setAllItems] = useState<SimpleReportEventDTO[]>([]);
  const [counts, setCounts] = useState({
    all: 0,
    purchases: 0,
    sales: 0,
    productions: 0,
  });
  const [typeFilter, setTypeFilter] = useState<SimpleReportType | undefined>(
    undefined
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    if (rbacLoading || !permissions.canViewReports) return;

    setLoading(true);
    const res = await getSimpleActivityReportsAction({ limit: 100 });
    if (res.success && res.data) {
      setAllItems(res.data.items);
      setCounts(res.data.counts);
    }
    setLoading(false);
  }, [rbacLoading, permissions.canViewReports]);

  useEffect(() => {
    if (rbacLoading) return;

    if (!permissions.canViewReports) {
      router.replace(permissions.canViewInventory ? "/inventory" : "/settings");
    }
  }, [
    rbacLoading,
    permissions.canViewReports,
    permissions.canViewInventory,
    router,
  ]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (typeFilter && item.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          item.headline.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          (item.note && item.note.toLowerCase().includes(q)) ||
          (item.actorName && item.actorName.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [allItems, typeFilter, search]);

  if (rbacLoading || !permissions.canViewReports) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-8 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-theme-text/60">{STRINGS.verifyingAccess}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <ReportHeader
        counts={counts}
        onRefresh={fetchReports}
        loading={loading}
      />

      <ReportFilters
        type={typeFilter}
        onTypeChange={setTypeFilter}
        search={search}
        onSearchChange={setSearch}
      />

      {loading && allItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-8 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-3" />
          <p className="text-xs text-theme-text/60">{STRINGS.loadingReports}</p>
        </div>
      ) : (
        <ReportList items={filteredItems} />
      )}
    </div>
  );
}
