import { db } from "@/lib/db";
import { getDbUser } from "@/lib/auth";
import { getSubjects } from "@/services/quizService";
import StudentDiscoveryClient from "./StudentDiscoveryClient";
import React from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentsPage() {
  const currentUser = await getDbUser();

  // Query all scholars who completed onboarding
  const students = await db.user.findMany({
    where: {
      onboardingCompleted: true,
      profileVisibility: true, // Only show public profiles
    },
    select: {
      id: true,
      username: true,
      role: true,
      rollNumber: true,
      degreeTrack: true,
      isOfficialIITM: true,
      profile: {
        select: {
          name: true,
          avatarUrl: true,
          xp: true,
          streak: true,
        }
      },
      selectedSubjects: {
        include: {
          subject: {
            select: {
              id: true,
              code: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      profile: {
        xp: "desc"
      }
    }
  });

  // Query subjects to populate the filter dropdown
  const subjects = await getSubjects();

  return (
    <div className="min-h-screen py-10 bg-[#040406]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Title */}
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Scholar Network Directory</span>
          <h1 className="text-3xl font-extrabold text-white mt-1">Student Discovery Portal</h1>
          <p className="text-xs text-gray-400 mt-1">Discover, compare progression metrics, and connect with other IITM scholars.</p>
        </div>

        <StudentDiscoveryClient 
          initialStudents={students.map((s) => ({
            id: s.id,
            username: s.username || "",
            role: s.role,
            rollNumber: s.rollNumber || "Not Set",
            degreeTrack: s.degreeTrack || "BS_DATA_SCIENCE",
            isOfficialIITM: s.isOfficialIITM,
            name: s.profile?.name || "Scholar",
            avatarUrl: s.profile?.avatarUrl || null,
            xp: s.profile?.xp || 0,
            streak: s.profile?.streak || 0,
            selectedSubjectIds: s.selectedSubjects.map((ss) => ss.subject.id),
            selectedSubjectCodes: s.selectedSubjects.map((ss) => ss.subject.code || "IITM"),
          }))}
          subjects={subjects.map((sub) => ({
            id: sub.id,
            code: sub.code,
            name: sub.name,
          }))}
          currentUserId={currentUser?.id || null}
        />

      </div>
    </div>
  );
}
