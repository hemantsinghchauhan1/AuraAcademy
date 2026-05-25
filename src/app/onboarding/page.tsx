import { getDbUser } from "@/lib/auth";
import { getSubjectsByTrack } from "@/services/onboardingService";
import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";
import React from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OnboardingPage() {
  const user = await getDbUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Self-healing: if already completed onboarding, send to dashboard directly
  if (user.onboardingCompleted) {
    redirect("/dashboard");
  }

  const email = user.email || "";
  let isOfficial = false;
  let detectedTrack: "BS_DATA_SCIENCE" | "BS_ELECTRONIC_SYSTEMS" | null = null;
  let extractedRollNumber = "";

  if (email.endsWith("@ds.study.iitm.ac.in")) {
    isOfficial = true;
    detectedTrack = "BS_DATA_SCIENCE";
    extractedRollNumber = email.split("@")[0] || "";
  } else if (email.endsWith("@es.study.iitm.ac.in")) {
    isOfficial = true;
    detectedTrack = "BS_ELECTRONIC_SYSTEMS";
    extractedRollNumber = email.split("@")[0] || "";
  }

  // Pre-fetch clustered subjects for both tracks
  const dsSubjectsGroup = await getSubjectsByTrack("BS_DATA_SCIENCE");
  const esSubjectsGroup = await getSubjectsByTrack("BS_ELECTRONIC_SYSTEMS");

  return (
    <div className="min-h-screen bg-[#040406] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <OnboardingClient
          user={{
            id: user.id,
            email: user.email,
            name: (user as any).profile?.name || "Student",
            avatarUrl: (user as any).profile?.avatarUrl || null,
          }}
          autoDetected={{
            isOfficial,
            degreeTrack: detectedTrack,
            rollNumber: extractedRollNumber,
          }}
          subjectsList={{
            BS_DATA_SCIENCE: dsSubjectsGroup,
            BS_ELECTRONIC_SYSTEMS: esSubjectsGroup,
          }}
        />
      </div>
    </div>
  );
}
