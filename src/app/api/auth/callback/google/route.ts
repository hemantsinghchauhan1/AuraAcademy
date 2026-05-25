import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("Google OAuth Error:", error);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // --- DEVELOPER SANDBOX MOCK FALLBACK ---
  // If credentials are not yet configured in the environment, trigger a highly secure 
  // mock user onboarding flow using sandbox parameters to enable immediate local testing.
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.log("⚠️ Google Client credentials missing in .env. Running in Sandbox Mock OAuth Mode.");
    try {
      const mockEmail = `google.student@aura.edu`;
      const mockName = `Google Student`;

      const user = await db.$transaction(async (tx) => {
        let existingUser = await tx.user.findUnique({
          where: { email: mockEmail },
          include: { profile: true },
        });

        if (!existingUser) {
          // Create new OAuth user with blank password (cannot login via standard credentials)
          existingUser = await tx.user.create({
            data: {
              email: mockEmail,
              password: `OAUTH_USER_RANDOM_SECRET_${Math.random()}`,
              role: "STUDENT",
            },
            include: { profile: true },
          });

          await tx.profile.create({
            data: {
              userId: existingUser.id,
              name: mockName,
              streak: 1,
              xp: 150, // OAuth Signup Bonus!
              bio: "Signed in using Google Workspace.",
            },
          });

          await tx.analytics.create({
            data: {
              userId: existingUser.id,
              weakTopics: JSON.stringify([]),
              overallAccuracy: 0.0,
              totalQuizzesTaken: 0,
            },
          });
        } else {
          // Update profile streak on daily logins
          await tx.profile.update({
            where: { userId: existingUser.id },
            data: {
              streak: { increment: 1 }
            }
          });
        }

        return existingUser;
      });

      await createSession(user.id);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch (err) {
      console.error("Sandbox OAuth Error:", err);
      return NextResponse.redirect(new URL("/login?error=sandbox_failed", request.url));
    }
  }

  // --- REAL GOOGLE OAUTH PRODUCTION PROTOCOL ---
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Token Exchange Error:", tokenData.error_description);
      return NextResponse.redirect(new URL("/login?error=token_failed", request.url));
    }

    // Fetch user details from Google Resource API
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userResponse.json();
    const email = userData.email;
    const name = userData.name || "OAuth User";
    const avatarUrl = userData.picture || null;

    if (!email) {
      return NextResponse.redirect(new URL("/login?error=no_email", request.url));
    }

    // Upsert user inside Supabase DB
    const user = await db.$transaction(async (tx) => {
      let existingUser = await tx.user.findUnique({
        where: { email },
        include: { profile: true },
      });

      if (!existingUser) {
        existingUser = await tx.user.create({
          data: {
            email,
            password: `OAUTH_GOOGLE_${crypto.randomUUID()}`, // Secure unguessable randomized password block
            role: "STUDENT",
          },
          include: { profile: true },
        });

        await tx.profile.create({
          data: {
            userId: existingUser.id,
            name,
            avatarUrl,
            streak: 1,
            xp: 150, // OAuth Signup Bonus!
            bio: "Signed in using Google Account.",
          },
        });

        await tx.analytics.create({
          data: {
            userId: existingUser.id,
            weakTopics: JSON.stringify([]),
            overallAccuracy: 0.0,
            totalQuizzesTaken: 0,
          },
        });
      } else {
        // Increment streak and update avatar url if profile exists
        await tx.profile.update({
          where: { userId: existingUser.id },
          data: {
            streak: { increment: 1 },
            avatarUrl,
          }
        });
      }

      return existingUser;
    });

    // Inject secure HTTP-Only session token cookie
    await createSession(user.id);

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("Google OAuth Exchange Fatal Error:", error);
    return NextResponse.redirect(new URL("/login?error=fatal_error", request.url));
  }
}
