"use server";

// ─────────────────────────────────────────────────────────────────────────────
// authActions.ts — Clerk Edition
//
// loginUser and registerUser are now handled entirely by Clerk.
// This file is kept minimal for any server action helpers still needed.
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";

// Legacy stub — Clerk handles login via /sign-in route
export async function loginUser(_fields: Record<string, string>) {
  redirect("/sign-in");
}

// Legacy stub — Clerk handles registration via /sign-up route
export async function registerUser(_fields: Record<string, string>) {
  redirect("/sign-up");
}

// Logout — Clerk handles actual session invalidation via UserButton
// This is a server-side redirect helper for form-based sign-out
export async function logoutUser(_formData?: FormData) {
  redirect("/");
}
