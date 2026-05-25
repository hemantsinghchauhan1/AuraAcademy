import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Award, 
  ArrowRight, 
  HelpCircle,
  Brain,
  ChevronRight,
  Sparkles
} from "lucide-react";

export const revalidate = 0; // Disable caching to fetch live quiz result attempts

interface ResultPageProps {
  searchParams: Promise<{ attemptId?: string }>;
}

export default async function ResultPage({ searchParams }: ResultPageProps) {
  const user = await getSessionUser();
  const { attemptId } = await searchParams;

  if (!user) {
    redirect("/login");
  }

  if (!attemptId) {
    redirect("/dashboard");
  }

  // Fetch the attempt details
  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          subject: true,
          questions: true,
        },
      },
    },
  });

  // Verify ownership and existence
  if (!attempt || attempt.userId !== user.id) {
    redirect("/dashboard");
  }

  const { quiz } = attempt;
  const questions = quiz.questions;
  
  // Parse user answers JSON
  let userAnswers: Record<string, string> = {};
  try {
    userAnswers = JSON.parse(attempt.answers);
  } catch (e) {
    userAnswers = {};
  }

  const scorePercentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
  const isPassed = scorePercentage >= 70;
  
  // Calculate XP awarded
  const xpAwarded = attempt.score * 50 + 100;

  return (
    <div className="min-h-screen py-10 bg-[#09090b]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* 1. SUCCESS/XP CONGRATS PANEL */}
        <div className="glass-panel p-8 rounded-3xl relative overflow-hidden text-center space-y-4 border border-white/5">
          {/* Background glows */}
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-indigo-500/10 blur-xl"></div>
          
          <div className="inline-flex h-12 w-12 rounded-2xl bg-indigo-500/10 items-center justify-center text-indigo-400 mb-2">
            <Sparkles className="h-6 w-6" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            {isPassed ? "Congratulations! Exam Passed" : "Quiz Finished"}
          </h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            You completed <strong>{quiz.title}</strong>. Your attempt diagnostics have been recorded.
          </p>

          <div className="flex justify-center items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full text-xs font-bold text-indigo-400 w-fit mx-auto">
            <span>🔥 XP GAINED:</span>
            <span>+{xpAwarded} XP Awarded</span>
          </div>
        </div>

        {/* 2. STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          
          {/* Accuracy Card */}
          <div className="glass-panel p-5 rounded-2xl text-center space-y-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Accuracy Ratio</p>
            <p className={`text-2xl sm:text-3xl font-extrabold ${isPassed ? "text-emerald-400" : "text-yellow-400"}`}>
              {scorePercentage}%
            </p>
            <p className="text-xs text-gray-400 font-medium">
              {attempt.score} of {attempt.totalQuestions} Right
            </p>
          </div>

          {/* Time spent Card */}
          <div className="glass-panel p-5 rounded-2xl text-center space-y-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Time Spent</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-400 flex justify-center items-center">
              <Clock className="h-5 w-5 text-indigo-400 mr-1.5" />
              <span>{Math.floor(attempt.timeSpent / 60)}m</span>
            </p>
            <p className="text-xs text-gray-400 font-medium">
              {attempt.timeSpent % 60} seconds duration
            </p>
          </div>

          {/* Subject tag card */}
          <div className="glass-panel p-5 rounded-2xl text-center space-y-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Subject Category</p>
            <p className="text-xl sm:text-2xl font-extrabold text-purple-400 truncate pt-0.5">
              {quiz.subject?.name || "Syllabus"}
            </p>
            <p className="text-xs text-gray-400 font-medium">
              Academic Field
            </p>
          </div>

          {/* Difficulty card */}
          <div className="glass-panel p-5 rounded-2xl text-center space-y-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Difficulty Index</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-blue-400 uppercase pt-0.5">
              {quiz.difficulty}
            </p>
            <p className="text-xs text-gray-400 font-medium">
              Complexity Degree
            </p>
          </div>

        </div>

        {/* 3. QUESTIONS AUDIT LIST */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Brain className="h-5 w-5 text-indigo-400" />
            <span>Question-by-Question Review</span>
          </h2>

          <div className="space-y-6">
            {questions.map((q, idx) => {
              const chosen = userAnswers[q.id];
              const isCorrect = chosen === q.correctAnswer;

              return (
                <div 
                  key={q.id} 
                  className={`glass-panel p-6 rounded-2xl border relative overflow-hidden ${
                    isCorrect 
                      ? "border-emerald-500/20 hover:border-emerald-500/35" 
                      : "border-red-500/20 hover:border-red-500/35"
                  }`}
                >
                  {/* Status Indicator check */}
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-gray-500 uppercase">
                      Question {idx + 1}
                    </span>
                    <span className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      isCorrect 
                        ? "bg-emerald-500/10 text-emerald-400" 
                        : "bg-red-500/10 text-red-400"
                    }`}>
                      {isCorrect ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Correct</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Incorrect</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Question Text */}
                  <h4 className="text-sm sm:text-base font-bold text-white leading-relaxed mb-6">
                    {q.questionText}
                  </h4>

                  {/* Options reviews */}
                  <div className="grid grid-cols-1 gap-2.5 mb-6">
                    {["A", "B", "C", "D"].map((optKey) => {
                      const optText = q[`option${optKey}` as keyof typeof q] as string;
                      const wasChosen = chosen === optKey;
                      const isOptionCorrect = q.correctAnswer === optKey;

                      return (
                        <div 
                          key={optKey} 
                          className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-center space-x-3 transition-all ${
                            isOptionCorrect
                              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold"
                              : wasChosen
                              ? "bg-red-500/10 border border-red-500/30 text-red-300 font-medium"
                              : "bg-white/3 border border-white/5 text-gray-500"
                          }`}
                        >
                          <span className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold border ${
                            isOptionCorrect 
                              ? "bg-emerald-500 border-emerald-400 text-white" 
                              : wasChosen 
                              ? "bg-red-500 border-red-400 text-white" 
                              : "bg-white/5 border-white/10 text-gray-500"
                          }`}>
                            {optKey}
                          </span>
                          <span className="flex-1 leading-relaxed">{optText}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* IN-DEPTH EXPLANATION CARD */}
                  <div className="p-4 bg-white/3 rounded-xl border border-white/5 space-y-1.5">
                    <h5 className="text-xs font-bold text-indigo-400 flex items-center space-x-1.5">
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>In-Depth Explanation:</span>
                    </h5>
                    <p className="text-xs text-gray-400 leading-relaxed font-normal">
                      {q.explanation}
                    </p>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* 4. ACTIONS FOOTER ROW */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 border-t border-white/5 pt-8">
          <a
            href={`/quiz/${quiz.id}`}
            className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/8 text-white border border-white/10 hover:border-white/20 font-semibold rounded-xl text-xs text-center transition-all"
          >
            Retake Exam Paper
          </a>
          <a
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs text-center shadow-lg transition-all flex justify-center items-center space-x-1.5"
          >
            <span>Back to Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

      </div>
    </div>
  );
}