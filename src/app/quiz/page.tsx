import { getDbUser } from "@/lib/auth";
import { getSubjects, getQuizzes } from "@/services/quizService";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Clock, Target, ChevronRight, Zap, Trophy } from "lucide-react";

export const revalidate = 60;

const difficultyConfig = {
  EASY: { label: "Easy", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  MEDIUM: { label: "Medium", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  HARD: { label: "Hard", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

export default async function QuizListPage() {
  const user = await getDbUser();

  if (!user) {
    redirect("/sign-in?redirect_url=/quiz");
  }

  const [subjects, quizzes] = await Promise.all([getSubjects(), getQuizzes()]);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full text-xs font-semibold text-indigo-400 mb-2">
            <Zap className="h-3 w-3" />
            <span>Quiz Arena</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Choose Your Challenge
          </h1>
          <p className="text-gray-400 text-base max-w-xl mx-auto">
            Pick a subject and test your knowledge. Earn XP, climb the leaderboard, and identify weak topics.
          </p>
        </div>

        {/* Subject Filter Pills */}
        <div className="flex flex-wrap gap-3 justify-center">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all cursor-default"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>{subject.name}</span>
              <span className="bg-white/10 text-xs px-1.5 py-0.5 rounded-full text-gray-400">
                {(subject as any)._count?.quizzes || 0}
              </span>
            </div>
          ))}
        </div>

        {/* Quiz Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => {
            const diff = difficultyConfig[quiz.difficulty as keyof typeof difficultyConfig] || difficultyConfig.MEDIUM;
            return (
              <div
                key={quiz.id}
                className="glass-panel rounded-2xl border border-white/10 p-6 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group flex flex-col"
              >
                {/* Subject Tag */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {(quiz as any).subject?.name || "General"}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${diff.bg} ${diff.color}`}>
                    {diff.label}
                  </span>
                </div>

                {/* Quiz Title */}
                <h2 className="text-lg font-bold text-white leading-snug mb-2 group-hover:text-indigo-300 transition-colors">
                  {quiz.title}
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed flex-1 mb-5">
                  {quiz.description}
                </p>

                {/* Stats Row */}
                <div className="flex items-center space-x-4 text-xs text-gray-500 mb-5">
                  <div className="flex items-center space-x-1">
                    <Target className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{quiz.totalQuestions} Questions</span>
                  </div>
                  {quiz.timeLimit && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span>{quiz.timeLimit} min</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                    <span>+{quiz.totalQuestions * 50 + 100} XP</span>
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href={`/quiz/${quiz.id}`}
                  className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all hover:scale-[1.02] shadow-md shadow-indigo-600/20 group"
                >
                  <span>Start Quiz</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            );
          })}
        </div>

        {quizzes.length === 0 && (
          <div className="text-center py-24 space-y-4">
            <div className="h-20 w-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
              <BookOpen className="h-9 w-9 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-white">No quizzes available yet</h2>
            <p className="text-gray-400 text-sm">Check back soon — new quizzes are being added regularly.</p>
          </div>
        )}

      </div>
    </div>
  );
}
