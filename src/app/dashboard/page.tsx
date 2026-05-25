import { ensureDbUser } from "@/lib/auth";
import {
  getSubjects,
  getQuizzes,
  getUserAttempts,
  getUserAnalytics,
} from "@/services/quizService";
import { getStudentEnrollments } from "@/services/courseService";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import React from "react";

export const dynamic = "force-dynamic"; // Always server-render (never statically generate)
export const revalidate = 0; // Live updates — no caching

export default async function DashboardPage() {
  // ensureDbUser() = auth() via Clerk + create Prisma record if first login
  const user = await ensureDbUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch all dashboard data in parallel
  const [subjects, quizzes, attempts, analytics, enrolledCourses] = await Promise.all([
    getSubjects(),
    getQuizzes(),
    getUserAttempts(user.id),
    getUserAnalytics(user.id),
    getStudentEnrollments(user.id),
  ]);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Dashboard Title Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Student Workspace
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Select a category, practice timed quizzes, diagnose your strengths, and study structured syllabi.
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-xs font-semibold">
            <span className="text-gray-400">Current Role:</span>
            <span className="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-md uppercase">
              {user.role}
            </span>
          </div>
        </div>

        {/* Structured Courses Learning Dashboard Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>📚 Structured Syllabus Tracks</span>
                <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-semibold font-mono">
                  {enrolledCourses.length} Enrolled
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Explore full classrooms, lecture notes, video timelines, and files.</p>
            </div>
            <a
              href="/courses"
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-md shadow-indigo-900/10"
            >
              Explore Course Catalog →
            </a>
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-500 italic bg-white/[0.01] rounded-xl border border-white/5">
              You are not enrolled in any syllabus courses yet. Head to the catalog to register!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              {enrolledCourses.slice(0, 3).map((course) => (
                <div key={course.id} className="border border-white/5 bg-[#09090b]/40 p-4 rounded-xl space-y-3 flex flex-col justify-between hover:border-white/10 transition-colors">
                  <div>
                    <div className="flex justify-between items-start text-[10px]">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase ${course.isPremium ? "bg-purple-500/10 text-purple-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                        {course.isPremium ? "Premium" : "Free"}
                      </span>
                      <span className="text-gray-500">{course.completedLessons} / {course.totalLessons} Lessons</span>
                    </div>
                    <h4 className="font-bold text-white text-sm mt-2 line-clamp-1">{course.title}</h4>
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">{course.description}</p>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${course.progressPercentage}%` }}></div>
                    </div>
                    <a
                      href={`/courses/${course.slug}`}
                      className="flex justify-center items-center w-full py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/10 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Continue Study ({course.progressPercentage}%)
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client-side interactive layout */}
        <DashboardClient
          user={{
            id: user.id,
            email: user.email,
            role: user.role,
            name: (user as any).profile?.name || "Student",
            avatarUrl: (user as any).profile?.avatarUrl || null,
            streak: (user as any).profile?.streak || 0,
            xp: (user as any).profile?.xp || 0,
          }}
          subjects={subjects.map((s) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            description: s.description,
            icon: s.icon,
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
        />
      </div>
    </div>
  );
}