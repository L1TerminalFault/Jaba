"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FiHome,
  FiBox,
  FiBookOpen,
  FiFileText,
  FiActivity,
  FiSettings,
} from "react-icons/fi";
import { usePermissions } from "@/lib/rbac-client";
import type { UserPermissions } from "@/lib/rbac-shared";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  home: "Home",
  inventory: "Inventory",
  catalogue: "Catalogue",
  reports: "Reports",
  logs: "Logs",
  settings: "Settings",
};

interface NavRoute {
  name: string;
  href: string;
  icon: typeof FiHome;
  permissionKey: keyof Omit<UserPermissions, "role">;
  activeMatch: (pathname: string) => boolean;
}

const routes: NavRoute[] = [
  {
    name: STRINGS.home,
    href: "/home",
    icon: FiHome,
    permissionKey: "canViewHome",
    activeMatch: (path) => path === "/home" || path === "/",
  },
  {
    name: STRINGS.inventory,
    href: "/inventory",
    icon: FiBox,
    permissionKey: "canViewInventory",
    activeMatch: (path) =>
      path.startsWith("/inventory") ||
      path.startsWith("/products") ||
      path.startsWith("/materials"),
  },
  {
    name: STRINGS.catalogue,
    href: "/catalogue",
    icon: FiBookOpen,
    permissionKey: "canViewCatalogue",
    activeMatch: (path) => path.startsWith("/catalogue"),
  },
  {
    name: STRINGS.reports,
    href: "/reports",
    icon: FiFileText,
    permissionKey: "canViewReports",
    activeMatch: (path) => path.startsWith("/reports"),
  },
  {
    name: STRINGS.logs,
    href: "/logs",
    icon: FiActivity,
    permissionKey: "canViewLogs",
    activeMatch: (path) => path.startsWith("/logs"),
  },
  {
    name: STRINGS.settings,
    href: "/settings",
    icon: FiSettings,
    permissionKey: "canViewSettings",
    activeMatch: (path) => path.startsWith("/settings"),
  },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { permissions } = usePermissions();

  const visibleRoutes = routes.filter(
    (route) => permissions[route.permissionKey]
  );

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 z-40 w-full"
    >
      <div className="flex w-full items-stretch border-t border-theme-border/40 bg-theme-card/85 backdrop-blur-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.35)] max-w-7xl mx-auto md:rounded-t-2xl md:border-x overflow-x-auto scrollbar-hidden">
        {visibleRoutes.map((route) => {
          const active = route.activeMatch(pathname);
          const Icon = route.icon;

          return (
            <button
              key={route.href}
              type="button"
              onClick={() => router.push(route.href)}
              className={`relative flex flex-1 min-w-[60px] flex-col items-center justify-center gap-1 py-3 px-1.5 sm:px-2 transition-colors duration-200 cursor-pointer ${
                active
                  ? "text-theme-accent bg-theme-accent/10"
                  : "text-theme-text/45 hover:text-theme-text/80 hover:bg-theme-text/[0.04]"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="navTab"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-10 sm:w-12 rounded-full bg-theme-accent shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                />
              )}
              <Icon className="size-4.5 sm:size-5" />
              <span className="text-[10px] sm:text-xs font-semibold tracking-wide mt-0.5 truncate max-w-full">
                {route.name}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
