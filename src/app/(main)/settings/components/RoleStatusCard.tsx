"use client";

import { usePermissions } from "@/lib/rbac-client";
import type { UserRole } from "@/lib/rbac-shared";
import { FiShield, FiUserCheck, FiAlertCircle } from "react-icons/fi";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  sectionTitle: "Account & Role Access",
  sectionSubtitle: "Role permissions resolved from Clerk session and environment configuration",
  signedOutText: "Sign in using the top bar to activate role-based inventory and operations access.",
  userIdLabel: "Clerk User ID:",
  assignedRoleLabel: "Active Role:",
  noRoleBadge: "No Role Assigned",
  noRoleHint: "Assign publicMetadata.role in Clerk Dashboard (admin, sale, producer, staff) or configure SUPER_ADMIN_CLERK_ID in .env.",
  roleDescriptions: {
    super_admin: "SuperAdmin — Full system access across all dashboards, inventory, catalogue, sales, production, purchases, reports, and system logs.",
    admin: "Admin — Full dashboard, inventory, catalogue, activity reports, and raw material purchasing; system logs, sales, and production actions are hidden.",
    sale: "Sale — Customer sales operations only; limited to Inventory (Products) and Settings.",
    producer: "Producer / Chef — Product manufacturing batches and stock view; limited to Inventory and Settings without catalogue or sales.",
    staff: "Staff — Combined Sale & Producer access; limited to Inventory and Settings without catalogue.",
  } satisfies Record<UserRole, string>,
  roleTitles: {
    super_admin: "SuperAdmin",
    admin: "Admin",
    sale: "Sale",
    producer: "Producer / Chef",
    staff: "Staff",
  } satisfies Record<UserRole, string>,
};

export default function RoleStatusCard() {
  const { role, isSignedIn, isLoading, userId } = usePermissions();

  return (
    <div className="rounded-3xl border border-theme-border/40 bg-theme-card/75 p-6 backdrop-blur-xl shadow-xl">
      <div className="flex items-center gap-2 pb-4 border-b border-theme-border/40">
        <FiShield className="size-5 text-theme-accent" />
        <div>
          <h2 className="text-base font-bold text-theme-text">
            {STRINGS.sectionTitle}
          </h2>
          <p className="text-xs text-theme-text/50">
            {STRINGS.sectionSubtitle}
          </p>
        </div>
      </div>

      <div className="mt-4 text-xs">
        {!isSignedIn ? (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-theme-background/40 border border-theme-border/30 text-theme-text/70">
            <FiAlertCircle className="size-4 text-theme-accent shrink-0" />
            <span>{STRINGS.signedOutText}</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-theme-background/40 border border-theme-border/30 gap-1">
              <span className="text-theme-text/60 font-semibold">
                {STRINGS.assignedRoleLabel}
              </span>
              {isLoading ? (
                <span className="text-theme-text/50 font-mono">...</span>
              ) : role ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-theme-accent/20 text-theme-accent border border-theme-accent/40 font-bold">
                  <FiUserCheck className="size-3.5" />
                  {STRINGS.roleTitles[role]}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
                  <FiAlertCircle className="size-3.5" />
                  {STRINGS.noRoleBadge}
                </span>
              )}
            </div>

            {userId && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-theme-background/40 border border-theme-border/30 gap-1">
                <span className="text-theme-text/60 font-semibold">
                  {STRINGS.userIdLabel}
                </span>
                <span className="font-mono text-[11px] text-theme-text/85 break-all">
                  {userId}
                </span>
              </div>
            )}

	    {/* <p className="p-3 rounded-xl bg-theme-background/40 border border-theme-border/30 text-theme-text/75 leading-relaxed">
              {role ? STRINGS.roleDescriptions[role] : STRINGS.noRoleHint}
            </p> */}
          </div>
        )}
      </div>
    </div>
  );
}
