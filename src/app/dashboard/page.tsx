import { ensureDbUser } from "@/lib/auth";
import {
  getSubjects,
  getQuizzes,
  getUserAttempts,
  getUserAnalytics,
} from "@/services/quizService";
import { getStudentEnrollments } from "@/services/courseService";
import { 
  getDailyMissions, 
  getUserGamificationProfile, 
  getLeaderboardStandings 
} from "@/services/gamificationService";
import { 
  getAcademicCalendar, 
  getTodayClasses, 
  getActivityHeatmap 
} from "@/services/calendarService";
import { redirect } from "next/navigation";
import CopilotDashboardClient from "./CopilotDashboardClient";
import React from "react";

export const dynamic = "force-dynamic"; // Always server-render
export const revalidate = 0; // Live updates — no caching

export default async function DashboardPage() {
  // ensureDbUser() = auth() via Clerk + create Prisma record if first login
  const user = await ensureDbUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Enforce onboarding gate redirect
  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  // Fetch all Student Copilot Operating System data in parallel
  const [
    subjects, 
    quizzes, 
    attempts, 
    analytics, 
    enrolledCourses, 
    dailyMissions,
    academicCalendar,
    todayClasses,
    activityHeatmap,
    gamificationProfile,
    leaderboardStandings
  ] = await Promise.all([
    getSubjects(),
    getQuizzes(),
    getUserAttempts(user.id),
    getUserAnalytics(user.id),
    getStudentEnrollments(user.id),
    getDailyMissions(user.id),
    getAcademicCalendar(user.id),
    getTodayClasses(user.id),
    getActivityHeatmap(user.id),
    getUserGamificationProfile(user.id),
    getLeaderboardStandings("xp")
  ]);

  return (
    <div className="min-h-screen py-8 bg-[#040406]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Personalized Copilot Dashboard client */}
        <CopilotDashboardClient
          user={{
            id: user.id,
            email: user.email,
            role: user.role,
            name: (user as any).profile?.name || "Student",
            avatarUrl: (user as any).profile?.avatarUrl || null,
            streak: (user as any).profile?.streak || 0,
            xp: (user as any).profile?.xp || 0,
            rollNumber: user.rollNumber || "Manual Setup",
            degreeTrack: user.degreeTrack || "BS_DATA_SCIENCE"
          }}
          subjects={subjects.map((s) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            description: s.description,
            icon: s.icon,
            code: s.code
          }))}
          quizzes={quizzes.map((q) => ({
            id: q.id,
            title: q.title,
            description: q.description,
            subjectId: q.subjectId,
            timeLimit: q.timeLimit,
            totalQuestions: q.totalQuestions,
            difficulty: q.difficulty as any,
            subject: q.subject ? { name: q.subject.name } : undefined,
          }))}
          attempts={attempts.map((a) => ({
            id: a.id,
            userId: a.userId,
            quizId: a.quizId,
            quiz: a.quiz
              ? {
                  title: a.quiz.title,
                  subject: a.quiz.subject
                    ? { name: a.quiz.subject.name }
                    : undefined,
                }
              : undefined,
            score: a.score,
            totalQuestions: a.totalQuestions,
            timeSpent: a.timeSpent,
            answers: JSON.parse(a.answers),
            completedAt: a.completedAt.toLocaleDateString(),
          }))}
          analytics={
            analytics
              ? {
                  id: analytics.id,
                  userId: analytics.userId,
                  weakTopics: analytics.weakTopics,
                  overallAccuracy: Math.round(analytics.overallAccuracy),
                  totalQuizzesTaken: analytics.totalQuizzesTaken,
                  updatedAt: analytics.updatedAt.toLocaleDateString(),
                }
              : null
          }
          enrolledCourses={enrolledCourses}
          dailyMissions={dailyMissions}
          academicCalendar={academicCalendar.map((e) => ({
            id: e.id,
            title: e.title,
            description: e.description,
            subjectId: e.subjectId,
            startTime: e.startTime.toISOString(),
            endTime: e.endTime.toISOString(),
            eventType: e.eventType,
            priority: e.priority,
            subject: e.subject
          }))}
          todayClasses={todayClasses.map((e) => ({
            id: e.id,
            title: e.title,
            description: e.description,
            subjectId: e.subjectId,
            startTime: e.startTime.toISOString(),
            endTime: e.endTime.toISOString(),
            eventType: e.eventType,
            priority: e.priority,
            subject: e.subject
          }))}
          activityHeatmap={activityHeatmap}
          gamificationProfile={gamificationProfile}
          leaderboardStandings={leaderboardStandings}
        />
      </div>
    </div>
  );
}