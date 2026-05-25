import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";

// ─────────────────────────────────────────────────────────────
// getDbUser()
// Gets the currently authenticated Prisma user by Clerk session.
// Returns null if not authenticated or user not found in DB.
// NOTE: Does NOT throw — safe to call from any server component.
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
        rollNumber: true,
        degreeTrack: true,
        isOfficialIITM: true,
        onboardingCompleted: true,
      },
    });

    return user;
  } catch (e: any) {
    // Don't swallow Next.js redirect/notFound errors — re-throw them
    if (e?.digest?.startsWith("NEXT_REDIRECT") || e?.digest?.startsWith("NEXT_NOT_FOUND")) {
      throw e;
    }
    // For dynamic server usage errors during static generation — return null gracefully
    console.error("getDbUser error:", e?.message || e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// ensureDbUser()
// Called on first sign-in to sync Clerk user → Prisma.
// Creates User + Profile + Analytics if they don't exist.
// IMPORTANT: Uses auth() which requires a valid Clerk session.
// ─────────────────────────────────────────────────────────────
export async function ensureDbUser() {
  // Let auth() throw naturally — Clerk middleware handles the redirect
  const { userId } = await auth();
  if (!userId) return null;

  try {
    // Check if already synced
    const existing = await db.user.findUnique({
      where: { clerkId: userId },
      include: { profile: true },
    });
    if (existing) return existing;

    // Fetch Clerk user details for profile creation
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email =
      clerkUser.emailAddresses[0]?.emailAddress || `${userId}@clerk.user`;
    const name =
      `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
      "Student";
    const avatarUrl = clerkUser.imageUrl || null;

    // Create User + Profile + Analytics in a single transaction
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

    console.log(`✅ Prisma user auto-provisioned via ensureDbUser: ${userId}`);

    // Trigger welcome email dynamically
    try {
      const { sendWelcomeEmail } = await import("@/services/emailService");
      await sendWelcomeEmail(newUser.email, name);
    } catch (emailErr) {
      console.error("Non-blocking welcome email warning:", emailErr);
    }

    return newUser;
  } catch (e: any) {
    // Re-throw Next.js control flow errors
    if (e?.digest?.startsWith("NEXT_REDIRECT") || e?.digest?.startsWith("NEXT_NOT_FOUND")) {
      throw e;
    }
    console.error("ensureDbUser error:", e?.message || e);
    return null;
  }
}

// Legacy compatibility stubs — kept for any server actions that import from this module
export async function getSessionUser() {
  return getDbUser();
}

export async function clearSession() {
  // No-op — Clerk handles sign-out via UserButton or clerk.signOut()
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
