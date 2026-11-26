"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSystemLogsAction, getSystemLogStatsAction } from "@/actions";
import { usePermissions } from "@/lib/rbac-client";
import type { SystemLogDTO } from "@/db/log-methods";
import { LogLevel } from "@/db/log-model";
import LogHeader from "./components/LogHeader";
import LogFilters from "./components/LogFilters";
import LogList from "./components/LogList";
import LogDetailsModal from "./components/LogDetailsModal";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  loadingLogs: "Loading system activity logs...",
  verifyingAccess: "Verifying access permissions...",
};

export default function LogsPage() {
  const router = useRouter();
  const { permissions, isLoading: rbacLoading } = usePermissions();

  const [logs, setLogs] = useState<SystemLogDTO[]>([]);
  const [stats, setStats] = useState({ total: 0, info: 0, warn: 0, error: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [level, setLevel] = useState<LogLevel | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<SystemLogDTO | null>(null);

  const fetchLogs = useCallback(async () => {
    if (rbacLoading || !permissions.canViewLogs) return;

    setLoading(true);
    const [logsRes, statsRes] = await Promise.all([
      getSystemLogsAction({
        page,
        limit: 25,
        level,
        search: search.trim() || undefined,
      }),
      getSystemLogStatsAction(),
    ]);

    if (logsRes.success && logsRes.data) {
      setLogs(logsRes.data.items);
      setTotalPages(logsRes.data.totalPages);
    }
    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }
    setLoading(false);
  }, [rbacLoading, permissions.canViewLogs, page, level, search]);

  useEffect(() => {
    if (rbacLoading) return;

    if (!permissions.canViewLogs) {
      router.replace(
        permissions.canViewReports
          ? "/reports"
          : permissions.canViewInventory
          ? "/inventory"
          : "/settings"
      );
    }
  }, [
    rbacLoading,
    permissions.canViewLogs,
    permissions.canViewReports,
    permissions.canViewInventory,
    router,
  ]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleLevelChange = (newLevel?: LogLevel) => {
    setLevel(newLevel);
    setPage(1);
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(1);
  };

  if (rbacLoading || !permissions.canViewLogs) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-8 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-theme-text/60">{STRINGS.verifyingAccess}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header with Stats Summary and Refresh */}
      <LogHeader
        stats={stats}
        onRefresh={fetchLogs}
        loading={loading}
      />

      {/* Filters: Search and Level Tabs */}
      <LogFilters
        level={level}
        onLevelChange={handleLevelChange}
        search={search}
        onSearchChange={handleSearchChange}
      />

      {/* Logs Table / Cards with Pagination */}
      {loading && logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-8 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-3" />
          <p className="text-xs text-theme-text/60">{STRINGS.loadingLogs}</p>
        </div>
      ) : (
        <LogList
          logs={logs}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onSelectLog={setSelectedLog}
        />
      )}

      {/* Log Details Inspector Modal */}
      <LogDetailsModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
