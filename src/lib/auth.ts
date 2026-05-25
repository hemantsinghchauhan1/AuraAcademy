import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";

// ─────────────────────────────────────────────────────────────
// getDbUser()
// Gets the currently authenticated Prisma user by Clerk session.
// Returns null if not authenticated or user not found in DB.
// ─────────────────────────────────────────────────────────────
export async function getDbUser() {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        role: true,
        profile: true,
      },
    });

    return user;
  } catch (e) {
    console.error("getDbUser error:", e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// ensureDbUser()
// Called on first sign-in to sync Clerk user → Prisma.
// Creates User + Profile + Analytics if they don't exist.
// Used as a fallback if webhook hasn't fired yet.
// ─────────────────────────────────────────────────────────────
export async function ensureDbUser() {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    // Check if already synced
    const existing = await db.user.findUnique({
      where: { clerkId: userId },
      include: { profile: true },
    });
    if (existing) return existing;

    // Fetch Clerk user details
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email =
      clerkUser.emailAddresses[0]?.emailAddress || `${userId}@clerk.user`;
    const name =
      `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
      "Student";
    const avatarUrl = clerkUser.imageUrl || null;

    // Create in a transaction
    const newUser = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          clerkId: userId,
          email,
          role: "STUDENT",
        },
      });

      await tx.profile.create({
        data: {
          userId: user.id,
          name,
          avatarUrl,
          streak: 1,
          xp: 100, // Welcome XP bonus
          bio: "Just joined AuraAcademy!",
        },
      });

      await tx.analytics.create({
        data: {
          userId: user.id,
          weakTopics: JSON.stringify([]),
          overallAccuracy: 0.0,
          totalQuizzesTaken: 0,
        },
      });

      return user;
    });

    return newUser;
  } catch (e) {
    console.error("ensureDbUser error:", e);
    return null;
  }
}

// Legacy stubs — kept for graceful backwards compatibility
// These are no-ops in the Clerk world; Clerk handles all session management
export async function getSessionUser() {
  return getDbUser();
}

export async function clearSession() {
  // Clerk handles sign-out via <SignOutButton> or clerk.signOut()
}

export async function createSession(_userId: string) {
  // No-op — Clerk manages sessions automatically
}

export function hashPassword(_password: string): string {
  return "";
}

export function verifyPassword(_password: string, _hash: string): boolean {
  return false;
}
