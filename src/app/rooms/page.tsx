import { ensureDbUser } from "@/lib/auth";
import { getRoomsWorkspace } from "@/services/roomService";
import { redirect } from "next/navigation";
import RoomsClient from "./RoomsClient";
import React from "react";

export const dynamic = "force-dynamic"; // Always server-render
export const revalidate = 0; // Live updates — no caching

export default async function RoomsPage() {
  // Ensure Clerk auth & Prisma record
  const user = await ensureDbUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Enforce onboarding gate redirect
  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  // Fetch all categories of rooms (joined, recommended, discoverable)
  const roomsRes = await getRoomsWorkspace(user.id);
  
  const joinedRooms = roomsRes.success && roomsRes.joined ? roomsRes.joined : [];
  const recommendedRooms = roomsRes.success && roomsRes.recommended ? roomsRes.recommended : [];
  const discoverableRooms = roomsRes.success && roomsRes.discoverable ? roomsRes.discoverable : [];

  return (
    <div className="min-h-screen bg-[#040406]">
      <RoomsClient
        currentUser={{
          id: user.id,
          email: user.email,
          role: user.role,
          name: (user as any).profile?.name || "Student",
          avatarUrl: (user as any).profile?.avatarUrl || null,
          isOfficialIITM: user.isOfficialIITM,
        }}
        initialJoined={joinedRooms}
        initialRecommended={recommendedRooms}
        initialDiscoverable={discoverableRooms}
      />
    </div>
  );
}
