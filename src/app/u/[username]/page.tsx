import { getDbUser } from "@/lib/auth";
import { getUserGamificationProfile } from "@/services/gamificationService";
import { getStudentEnrollments } from "@/services/courseService";
import { getUserAttempts, getUserAnalytics } from "@/services/quizService";
import { getActivityHeatmap } from "@/services/calendarService";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import React from "react";
import StudentProfileClient from "./StudentProfileClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function UsernameProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const normalizedUsername = username.trim().toLowerCase();

  // Find User by username
  const profileUser = await db.user.findUnique({
    where: { username: normalizedUsername },
    select: {
      id: true,
      email: true,
      role: true,
      rollNumber: true,
      degreeTrack: true,
      isOfficialIITM: true,
      profileVisibility: true,
      onboardingCompleted: true,
    }
  });

  if (!profileUser) {
    notFound();
  }

  // Fetch Viewer details to compare shared subjects
  const viewer = await getDbUser();
  const isOwnProfile = viewer?.id === profileUser.id;

  // Security Gate: Enforce public visibility controls
  if (!profileUser.profileVisibility && !isOwnProfile) {
    return (
      <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-[#040406] flex items-center justify-center">
        <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-white/5 text-center space-y-4">
          <span className="text-4xl">🔒</span>
          <h2 className="text-xl font-bold text-white">Private Profile</h2>
          <p className="text-xs text-gray-500 leading-normal">
            This student has set their academic profile visibility to private. You cannot view their metrics or achievements at this time.
          </p>
          <a href="/students" className="mt-4 inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all">
            Back to Search Discovery
          </a>
        </div>
      </div>
    );
  }

  // Fetch all academic, gamification, and analytics records in parallel
  const [
    gamificationData,
    attempts,
    analytics,
    enrolledCourses,
    heatmap,
    profileSelectedSubjects,
    viewerSelectedSubjects,
  ] = await Promise.all([
    getUserGamificationProfile(profileUser.id),
    getUserAttempts(profileUser.id),
    getUserAnalytics(profileUser.id),
    getStudentEnrollments(profileUser.id),
    getActivityHeatmap(profileUser.id),
    db.userSelectedSubject.findMany({
      where: { userId: profileUser.id },
      include: { subject: true }
    }),
    viewer
      ? db.userSelectedSubject.findMany({
          where: { userId: viewer.id },
          select: { subjectId: true }
        })
      : []
  ]);

  if (!gamificationData) {
    notFound();
  }

  // Compute shared subjects overlap
  const viewerSubjectIds = new Set(viewerSelectedSubjects.map((vs) => vs.subjectId));
  const sharedSubjects = profileSelectedSubjects
    .filter((ps) => viewerSubjectIds.has(ps.subjectId))
    .map((ps) => ({
      code: ps.subject.code,
      name: ps.subject.name,
    }));

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-[#040406]">
      <div className="max-w-6xl mx-auto">
        <StudentProfileClient
          profileUser={{
            id: profileUser.id,
            username: normalizedUsername,
            email: profileUser.email,
            role: profileUser.role,
            name: gamificationData.profile?.name || "Student",
            avatarUrl: gamificationData.profile?.avatarUrl || null,
            streak: gamificationData.profile?.streak || 0,
            xp: gamificationData.profile?.xp || 0,
            rollNumber: profileUser.rollNumber || "Not Set",
            degreeTrack: profileUser.degreeTrack || "BS_DATA_SCIENCE",
            isOfficialIITM: profileUser.isOfficialIITM,
            createdAt: gamificationData.profile?.createdAt.toLocaleDateString() || "",
            bio: gamificationData.profile?.bio || "",
          }}
          levelInfo={gamificationData.levelInfo}
          rank={gamificationData.rank}
          userAchievements={gamificationData.userAchievements.map((ua) => ({
            id: ua.id,
            achievement: {
              title: ua.achievement.title,
              description: ua.achievement.description,
              icon: ua.achievement.icon,
              xpReward: ua.achievement.xpReward,
              rarity: ua.achievement.rarity,
            },
          }))}
          userBadges={gamificationData.userBadges.map((ub) => ({
            id: ub.id,
            badge: {
              name: ub.badge.name,
              description: ub.badge.description,
              icon: ub.badge.icon,
            },
          }))}
          certificates={gamificationData.certificates.map((c) => ({
            id: c.id,
            certificateCode: c.certificateCode,
            issuedAt: c.issuedAt.toLocaleDateString(),
            course: { title: c.course.title },
          }))}
          xpLogs={gamificationData.xpLogs.map((l) => ({
            id: l.id,
            amount: l.amount,
            reason: l.reason,
            createdAt: l.createdAt.toLocaleDateString(),
          }))}
          selectedSubjects={profileSelectedSubjects.map((ps) => ({
            code: ps.subject.code,
            name: ps.subject.name,
            icon: ps.subject.icon,
          }))}
          attempts={attempts.map((a) => ({
            id: a.id,
            score: a.score,
            totalQuestions: a.totalQuestions,
            timeSpent: a.timeSpent,
            completedAt: a.completedAt.toLocaleDateString(),
            quiz: a.quiz ? { title: a.quiz.title } : undefined,
          }))}
          analytics={
            analytics
              ? {
                  weakTopics: analytics.weakTopics,
                  overallAccuracy: Math.round(analytics.overallAccuracy),
                  totalQuizzesTaken: analytics.totalQuizzesTaken,
                }
              : null
          }
          enrolledCourses={enrolledCourses}
          heatmap={heatmap}
          sharedSubjects={sharedSubjects}
          isOwnProfile={isOwnProfile}
          viewerId={viewer?.id || null}
        />
      </div>
    </div>
  );
}
