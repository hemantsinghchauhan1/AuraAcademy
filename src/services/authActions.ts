"use server";

import { db } from "@/lib/db";
import { hashPassword, verifyPassword, createSession, clearSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function loginUser(fields: Record<string, string>) {
  const { email, password } = fields;

  if (!email || !password) {
    return { success: false, error: "Please fill in all fields" };
  }

  try {
    const user = await db.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      return { success: false, error: "Invalid email or password" };
    }

    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      return { success: false, error: "Invalid email or password" };
    }

    // Set cookie session
    await createSession(user.id);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.profile?.name || "Student",
        avatarUrl: user.profile?.avatarUrl || null,
        streak: user.profile?.streak || 0,
        xp: user.profile?.xp || 0,
      },
    };
  } catch (error: any) {
    console.error("Login Error:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function registerUser(fields: Record<string, string>) {
  const { name, email, password } = fields;

  if (!name || !email || !password) {
    return { success: false, error: "All fields are required" };
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }

  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: "An account with this email already exists" };
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    // Create User and default Profile together in a transaction
    const newUser = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "STUDENT",
        },
      });

      const profile = await tx.profile.create({
        data: {
          userId: user.id,
          name,
          streak: 1, // Start with a 1-day streak
          xp: 100, // Initial signup bonus XP!
          bio: "Just joined the Student Ecosystem!",
        },
      });

      // Initialize default Analytics for user
      await tx.analytics.create({
        data: {
          userId: user.id,
          weakTopics: JSON.stringify([]),
          overallAccuracy: 0.0,
          totalQuizzesTaken: 0,
        },
      });

      return { ...user, profile };
    });

    // Generate session
    await createSession(newUser.id);

    return {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.profile.name,
        avatarUrl: newUser.profile.avatarUrl,
        streak: newUser.profile.streak,
        xp: newUser.profile.xp,
      },
    };
  } catch (error: any) {
    console.error("Registration Error:", error);
    return { success: false, error: "Failed to create account. Please try again." };
  }
}

export async function logoutUser(formData?: FormData) {
  await clearSession();
  revalidatePath("/");
}
