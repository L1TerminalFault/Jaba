import { auth, clerkClient } from "@clerk/nextjs/server";

export interface AuthContext {
  userId: string;
  isAuthenticated: boolean;
}

export interface ClerkUserProfile {
  fullName: string;
  imageUrl?: string;
}

/**
 * Resolves current user for server actions and backend methods.
 * Safely handles Clerk authentication with fallback for tests or service actions.
 */
export async function resolveSignedBy(fallbackSignedBy?: string): Promise<string> {
  try {
    const session = await auth();
    if (session?.userId) {
      return session.userId;
    }
  } catch {
    // If Clerk is not configured or in a non-request environment, fall back gracefully
  }

  if (fallbackSignedBy && fallbackSignedBy.trim()) {
    return fallbackSignedBy.trim();
  }

  return "system-admin";
}

/**
 * Ensures the caller is authenticated via Clerk or throws an unauthorized error.
 */
export async function requireAuth(): Promise<AuthContext> {
  try {
    const session = await auth();
    if (session?.userId) {
      return {
        userId: session.userId,
        isAuthenticated: true,
      };
    }
  } catch (error) {
    throw new Error(`Authentication check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  throw new Error("Unauthorized: You must be signed in to perform this operation.");
}

/**
 * Batch-resolves Clerk user IDs to human-readable full names and avatar URLs.
 */
export async function resolveClerkUserProfiles(
  userIds: string[]
): Promise<Record<string, ClerkUserProfile>> {
  const result: Record<string, ClerkUserProfile> = {};

  const clerkIds = Array.from(
    new Set(
      userIds
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter((id) => id.startsWith("user_"))
    )
  );

  if (clerkIds.length === 0) {
    return result;
  }

  try {
    const client = await clerkClient();
    const response = await client.users.getUserList({
      userId: clerkIds,
      limit: Math.min(100, clerkIds.length),
    });

    for (const user of response.data) {
      const fullName =
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        user.username ||
        user.emailAddresses?.[0]?.emailAddress ||
        "Staff Member";

      result[user.id] = {
        fullName,
        imageUrl: user.hasImage ? user.imageUrl : undefined,
      };
    }
  } catch {
    // Gracefully fall back if Clerk user lookup is unavailable
  }

  return result;
}

/**
 * Converts a raw `signedBy` identifier into a friendly display name using a pre-fetched Clerk profile map.
 */
export function formatActorDisplayName(
  signedBy: string | undefined,
  profiles: Record<string, ClerkUserProfile>
): ClerkUserProfile {
  if (!signedBy || !signedBy.trim()) {
    return { fullName: "System" };
  }

  const trimmed = signedBy.trim();
  if (profiles[trimmed]) {
    return profiles[trimmed];
  }

  if (trimmed === "system" || trimmed === "system-admin") {
    return { fullName: "System" };
  }

  if (trimmed.startsWith("user_")) {
    return { fullName: "Team Member" };
  }

  return { fullName: trimmed };
}
