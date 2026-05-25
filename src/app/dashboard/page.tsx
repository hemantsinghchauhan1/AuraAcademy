import { getSessionUser } from "@/lib/auth";
import { 
  getSubjects, 
  getQuizzes, 
  getUserAttempts, 
  getUserAnalytics 
} from "@/services/quizService";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const revalidate = 0; // Disable caching for dashboard to show live updates

export default async function DashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all dashboard requirements parallelly
  const [subjects, quizzes, attempts, analytics] = await Promise.all([
    getSubjects(),
    getQuizzes(),
    getUserAttempts(user.id),
    getUserAnalytics(user.id),
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
              Select a category, practice timed quizzes, and diagnostic your strengths.
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-xs font-semibold">
            <span className="text-gray-400">Current Role:</span>
            <span className="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-md uppercase">
              {user.role}
            </span>
          </div>
        </div>

        {/* Client side interactive layout */}
        <DashboardClient
          user={{
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.profile?.name || "Student",
            avatarUrl: user.profile?.avatarUrl || null,
            streak: user.profile?.streak || 0,
            xp: user.profile?.xp || 0,
          }}
          subjects={subjects.map(s => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            description: s.description,
            icon: s.icon,
          }))}
          quizzes={quizzes.map(q => ({
            id: q.id,
            title: q.title,
            description: q.description,
            subjectId: q.subjectId,
            timeLimit: q.timeLimit,
            totalQuestions: q.totalQuestions,
            difficulty: q.difficulty as any,
            subject: q.subject ? { name: q.subject.name } : undefined,
          }))}
          attempts={attempts.map(a => ({
            id: a.id,
            userId: a.userId,
            quizId: a.quizId,
            quiz: a.quiz ? {
              title: a.quiz.title,
              subject: a.quiz.subject ? { name: a.quiz.subject.name } : undefined,
            } : undefined,
            score: a.score,
            totalQuestions: a.totalQuestions,
            timeSpent: a.timeSpent,
            answers: JSON.parse(a.answers),
            completedAt: a.completedAt.toLocaleDateString(),
          }))}
          analytics={analytics ? {
            id: analytics.id,
            userId: analytics.userId,
            weakTopics: analytics.weakTopics,
            overallAccuracy: Math.round(analytics.overallAccuracy),
            totalQuizzesTaken: analytics.totalQuizzesTaken,
            updatedAt: analytics.updatedAt.toLocaleDateString(),
          } : null}
        />

      </div>
    </div>
  );
}