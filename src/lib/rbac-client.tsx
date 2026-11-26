"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useUser } from "@clerk/nextjs";
import { getMyPermissionsAction } from "@/actions/auth";
import {
  getPermissions,
  resolveClientRole,
  type UserPermissions,
  type UserRole,
} from "@/lib/rbac-shared";

interface RbacContextValue {
  role: UserRole | null;
  permissions: UserPermissions;
  isLoading: boolean;
  isSignedIn: boolean;
  userId: string | null;
}

const defaultPermissions = getPermissions(null);

const RbacContext = createContext<RbacContextValue>({
  role: null,
  permissions: defaultPermissions,
  isLoading: true,
  isSignedIn: false,
  userId: null,
});

/**
 * Provides resolved RBAC role and permission flags to all client components.
 * Immediately inspects Clerk `user.publicMetadata.role`, and verifies against the server
 * via `getMyPermissionsAction` so `SUPER_ADMIN_CLERK_ID` in `.env` always takes effect.
 */
export function RbacProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const [serverPerms, setServerPerms] = useState<{
    userId: string;
    permissions: UserPermissions;
  } | null>(null);
  const [fetchingServer, setFetchingServer] = useState(false);

  const clientRole = useMemo(() => {
    if (!isLoaded || !isSignedIn || !user) return null;
    return resolveClientRole(
      user.publicMetadata as Record<string, unknown> | undefined,
      user.id
    );
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    let cancelled = false;

    if (!isLoaded) return;

    if (!isSignedIn || !user?.id) {
      setServerPerms(null);
      setFetchingServer(false);
      return;
    }

    setFetchingServer(true);
    getMyPermissionsAction()
      .then((res) => {
        if (!cancelled && res.success && res.data) {
          setServerPerms({
            userId: user.id,
            permissions: res.data,
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFetchingServer(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user?.id]);

  const value = useMemo<RbacContextValue>(() => {
    if (!isLoaded) {
      return {
        role: null,
        permissions: defaultPermissions,
        isLoading: true,
        isSignedIn: false,
        userId: null,
      };
    }

    if (!isSignedIn || !user) {
      return {
        role: null,
        permissions: defaultPermissions,
        isLoading: false,
        isSignedIn: false,
        userId: null,
      };
    }

    const activeServerPerms =
      serverPerms?.userId === user.id ? serverPerms.permissions : null;

    // Prefer server-verified permissions (catches SUPER_ADMIN_CLERK_ID from .env).
    // Fall back to optimistic client publicMetadata role while server verification completes.
    const resolvedPermissions =
      activeServerPerms ?? getPermissions(clientRole);

    // Stay in loading state while server confirmation is pending and no client role was resolved yet,
    // preventing premature redirects for SuperAdmin whose clerkId lives only in server `.env`.
    const stillResolving =
      fetchingServer && !activeServerPerms && clientRole === null;

    return {
      role: resolvedPermissions.role,
      permissions: resolvedPermissions,
      isLoading: stillResolving,
      isSignedIn: true,
      userId: user.id,
    };
  }, [isLoaded, isSignedIn, user, serverPerms, clientRole, fetchingServer]);

  return <RbacContext.Provider value={value}>{children}</RbacContext.Provider>;
}

/**
 * Client hook to access the current user's resolved role and permissions.
 */
export function usePermissions(): RbacContextValue {
  return useContext(RbacContext);
}
