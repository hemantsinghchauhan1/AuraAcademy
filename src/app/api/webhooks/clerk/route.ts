import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not set.");
    return new NextResponse("Webhook secret missing", { status: 500 });
  }

  // Verify the webhook signature using Svix
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new NextResponse("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let event: any;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const eventType = event.type;
  console.log(`Clerk webhook received: ${eventType}`);

  // ── user.created → provision full Prisma user record ────────
  if (eventType === "user.created") {
    const { id: clerkId, email_addresses, first_name, last_name, image_url } = event.data;

    const email = email_addresses?.[0]?.email_address;
    if (!email) {
      return new NextResponse("No email address", { status: 400 });
    }

    const name = `${first_name || ""} ${last_name || ""}`.trim() || "Student";
    const avatarUrl = image_url || null;

    try {
      // Idempotent — skip if already exists (race condition guard)
      const existing = await db.user.findUnique({ where: { clerkId } });
      if (existing) {
        return NextResponse.json({ message: "User already exists" });
      }

      await db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            clerkId,
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
            xp: 100, // Welcome XP bonus on registration
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
      });

      console.log(`✅ Prisma user provisioned for Clerk ID: ${clerkId}`);
      return NextResponse.json({ message: "User created successfully" });
    } catch (err) {
      console.error("Failed to provision user in Prisma:", err);
      return new NextResponse("Database error", { status: 500 });
    }
  }

  // ── user.updated → sync email / avatar changes ───────────────
  if (eventType === "user.updated") {
    const { id: clerkId, email_addresses, first_name, last_name, image_url } = event.data;

    const email = email_addresses?.[0]?.email_address;
    const name = `${first_name || ""} ${last_name || ""}`.trim();
    const avatarUrl = image_url || null;

    try {
      const user = await db.user.findUnique({ where: { clerkId } });
      if (!user) {
        // User doesn't exist in DB yet — create them
        return NextResponse.json({ message: "User not found, skipping update" });
      }

      await db.$transaction(async (tx) => {
        if (email) {
          await tx.user.update({
            where: { clerkId },
            data: { email },
          });
        }
        await tx.profile.update({
          where: { userId: user.id },
          data: {
            ...(name && { name }),
            ...(avatarUrl && { avatarUrl }),
          },
        });
      });

      console.log(`✅ Prisma user updated for Clerk ID: ${clerkId}`);
      return NextResponse.json({ message: "User updated successfully" });
    } catch (err) {
      console.error("Failed to update user in Prisma:", err);
      return new NextResponse("Database error", { status: 500 });
    }
  }

  // Unhandled event types — return 200 to prevent Clerk retries
  return NextResponse.json({ message: `Unhandled event: ${eventType}` });
}
