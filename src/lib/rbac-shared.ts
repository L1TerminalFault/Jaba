/**
 * ============================================================================
 * RBAC Shared Types, Role Normalization & Permission Matrix
 * ============================================================================
 *
 * Pure isomorphic module (safe to import from both Client Components and
 * Server Actions/Components — zero Node or server-only imports).
 */

/** All recognized user roles in the system */
export type UserRole =
  | "super_admin"
  | "admin"
  | "sale"
  | "producer"
  | "staff";

/** Complete permission set derived from a user's role */
export interface UserPermissions {
  role: UserRole | null;

  // Navigation visibility
  canViewHome: boolean;
  canViewInventory: boolean;
  canViewCatalogue: boolean;
  canViewReports: boolean;
  canViewLogs: boolean;
  canViewSettings: boolean;

  // Inventory sub-features
  canViewRawMaterials: boolean;

  // Operational actions
  canSell: boolean;
  canProduce: boolean;
  canPurchaseRawMaterials: boolean;

  // Administrative actions
  canVoidTransactions: boolean;
  canManageUsers: boolean;
}

const VALID_ROLES: ReadonlySet<string> = new Set([
  "super_admin",
  "admin",
  "sale",
  "producer",
  "staff",
]);

const ROLE_ALIASES: Record<string, UserRole> = {
  super_admin: "super_admin",
  superadmin: "super_admin",
  "super-admin": "super_admin",
  "super admin": "super_admin",
  admin: "admin",
  sale: "sale",
  sales: "sale",
  producer: "producer",
  producers: "producer",
  chef: "producer",
  chefs: "producer",
  "producers/chefs": "producer",
  staff: "staff",
};

/**
 * Normalizes a raw role string from Clerk publicMetadata (handles casing and common aliases).
 */
export function normalizeRole(rawRole: unknown): UserRole | null {
  if (typeof rawRole !== "string") {
    return null;
  }

  const trimmed = rawRole.trim().toLowerCase();
  if (VALID_ROLES.has(trimmed)) {
    return trimmed as UserRole;
  }

  return ROLE_ALIASES[trimmed] ?? null;
}

/**
 * Derives the full permission set for a given role.
 * Returns a restrictive set (Settings only) if the role is null/unrecognized.
 */
export function getPermissions(role: UserRole | null): UserPermissions {
  switch (role) {
    case "super_admin":
      return {
        role,
        canViewHome: true,
        canViewInventory: true,
        canViewCatalogue: true,
        canViewReports: true,
        canViewLogs: true,
        canViewSettings: true,
        canViewRawMaterials: true,
        canSell: true,
        canProduce: true,
        canPurchaseRawMaterials: true,
        canVoidTransactions: true,
        canManageUsers: true,
      };

    case "admin":
      return {
        role,
        canViewHome: true,
        canViewInventory: true,
        canViewCatalogue: true,
        canViewReports: true,
        canViewLogs: false,
        canViewSettings: true,
        canViewRawMaterials: true,
        canSell: false,
        canProduce: false,
        canPurchaseRawMaterials: true,
        canVoidTransactions: true,
        canManageUsers: false,
      };

    case "sale":
      return {
        role,
        canViewHome: false,
        canViewInventory: true,
        canViewCatalogue: false,
        canViewReports: false,
        canViewLogs: false,
        canViewSettings: true,
        canViewRawMaterials: false,
        canSell: true,
        canProduce: false,
        canPurchaseRawMaterials: false,
        canVoidTransactions: false,
        canManageUsers: false,
      };

    case "producer":
      return {
        role,
        canViewHome: false,
        canViewInventory: true,
        canViewCatalogue: false,
        canViewReports: false,
        canViewLogs: false,
        canViewSettings: true,
        canViewRawMaterials: true,
        canSell: false,
        canProduce: true,
        canPurchaseRawMaterials: false,
        canVoidTransactions: false,
        canManageUsers: false,
      };

    case "staff":
      // Merged roles of Sale + Producers/Chefs
      return {
        role,
        canViewHome: false,
        canViewInventory: true,
        canViewCatalogue: false,
        canViewReports: false,
        canViewLogs: false,
        canViewSettings: true,
        canViewRawMaterials: true,
        canSell: true,
        canProduce: true,
        canPurchaseRawMaterials: false,
        canVoidTransactions: false,
        canManageUsers: false,
      };

    default:
      // Unknown or null role -> locked out of operational areas except settings
      return {
        role: null,
        canViewHome: false,
        canViewInventory: false,
        canViewCatalogue: false,
        canViewReports: false,
        canViewLogs: false,
        canViewSettings: true,
        canViewRawMaterials: false,
        canSell: false,
        canProduce: false,
        canPurchaseRawMaterials: false,
        canVoidTransactions: false,
        canManageUsers: false,
      };
  }
}

/**
 * Extracts the user role on the client from Clerk user's publicMetadata and optional public SuperAdmin ID.
 */
export function resolveClientRole(
  publicMetadata: Record<string, unknown> | undefined | null,
  clerkId: string | undefined | null
): UserRole | null {
  const superAdminId = process.env.NEXT_PUBLIC_SUPER_ADMIN_CLERK_ID;
  if (superAdminId && clerkId && clerkId === superAdminId) {
    return "super_admin";
  }

  if (!publicMetadata) {
    return null;
  }

  return normalizeRole(publicMetadata.role);
}
