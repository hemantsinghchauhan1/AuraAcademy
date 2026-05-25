"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuizStore } from "@/store/useQuizStore";
import { submitQuizAttempt } from "@/services/quizService";
import { 
  Clock, 
  Flag, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Brain
} from "lucide-react";

interface Question {
  id: string;
  quizId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
}

interface QuizClientProps {
  userId: string;
  quiz: {
    id: string;
    title: string;
    description: string;
    timeLimit: number | null;
    totalQuestions: number;
    subjectName: string;
    questions: Question[];
  };
}

export default function QuizClient({ userId, quiz }: QuizClientProps) {
  const router = useRouter();
  
  const {
    quizId,
    questions,
    currentQuestionIndex,
    selectedAnswers,
    flaggedQuestions,
    timeLeft,
    isStarted,
    isSubmitted,
    startQuiz,
    selectAnswer,
    toggleFlag,
    nextQuestion,
    prevQuestion,
    setQuestionIndex,
    tick,
    submitQuiz,
    resetQuiz
  } = useQuizStore();

  const [isPending, startTransition] = useTransition();

  // 1. Initialize store state on mount
  useEffect(() => {
    startQuiz(quiz.id, quiz.title, quiz.questions, quiz.timeLimit);
    return () => resetQuiz(); // Reset on exit
  }, [quiz, startQuiz, resetQuiz]);

  // 2. Set up ticking countdown timer
  useEffect(() => {
    if (isStarted && !isSubmitted && timeLeft > 0) {
      const timer = setInterval(() => tick(), 1000);
      return () => clearInterval(timer);
    }
  }, [isStarted, isSubmitted, timeLeft, tick]);

  if (!isStarted || questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-32 text-center space-y-4">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-gray-400 text-sm font-semibold">Pre-compiling exam paper and questions workspace...</p>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const totalAnswered = Object.keys(selectedAnswers).length;

  // Format Time Remaining (e.g. 14:02)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isTimeCritical = timeLeft < 120; // less than 2 minutes

  // Trigger submission to server action
  const handleFinalSubmit = () => {
    if (isPending) return;

    startTransition(async () => {
      // Calculate scores on the client side in the store
      const results = submitQuiz();

      // Submit results to server db
      const res = await submitQuizAttempt(
        userId,
        quiz.id,
        results.score,
        results.timeSpent,
        results.answers
      );

      if (res.success && res.attemptId) {
        // Clear quiz workspace and push to results with query identifier
        router.push(`/result?attemptId=${res.attemptId}`);
      } else {
        alert("Failed to record attempt. Please try submitting again.");
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* 1. QUIZ RUNNER HEADER */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden border border-white/5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400">
            <Brain className="h-4 w-4" />
            <span>Active Syllabus Testing Workspace</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">{quiz.title}</h2>
        </div>

        {/* GLOWING TICK TIMER */}
        <div className={`flex items-center space-x-2 border px-4 py-2 rounded-xl text-sm font-bold tracking-tight transition-all duration-300 ${
          isTimeCritical 
            ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse" 
            : "bg-white/5 border-white/10 text-gray-200"
        }`}>
          <Clock className={`h-4.5 w-4.5 ${isTimeCritical ? "text-red-400" : "text-indigo-400"}`} />
          <span>Time Remaining: {formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* 2. CORE WORKSPACE COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* QUESTIONS GRID NAVIGATOR (left 4 columns) */}
        <div className="lg:col-span-4 glass-panel p-5 rounded-2xl space-y-4 border border-white/5 order-last lg:order-first">
          <div>
            <h3 className="text-sm font-extrabold text-white">Questions Navigation Grid</h3>
            <p className="text-xs text-gray-500 mt-0.5">Jump directly to any paper question</p>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2.5">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentQuestionIndex;
              const isAnswered = !!selectedAnswers[q.id];
              const isFlagged = !!flaggedQuestions[q.id];

              return (
                <button
                  key={q.id}
                  onClick={() => setQuestionIndex(idx)}
                  className={`h-11 rounded-xl text-xs font-bold transition-all relative border flex items-center justify-center ${
                    isCurrent
                      ? "bg-white text-black border-white shadow-lg shadow-white/10 scale-105 z-10"
                      : isAnswered
                      ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-400"
                      : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  <span>{idx + 1}</span>
                  {isFlagged && (
                    <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-orange-400"></span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-white/5 pt-4 space-y-2 text-xs text-gray-500 font-medium">
            <div className="flex justify-between items-center">
              <span>Total Questions:</span>
              <span className="text-white font-bold">{questions.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Answered:</span>
              <span className="text-indigo-400 font-bold">{totalAnswered}</span>
            </div>
            <div className="flex justify-between items-center text-orange-400">
              <span>Flagged for Review:</span>
              <span className="font-bold">
                {Object.values(flaggedQuestions).filter(Boolean).length}
              </span>
            </div>
          </div>
        </div>

        {/* ACTIVE QUESTION PANEL CONTAINER (right 8 columns) */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="glass-panel p-6 sm:p-8 rounded-2xl relative border border-white/5 min-h-[350px] flex flex-col justify-between">
            
            {/* Top row index tracker */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <button
                onClick={() => toggleFlag(currentQ.id)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  flaggedQuestions[currentQ.id]
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                }`}
              >
                <Flag className="h-3.5 w-3.5" />
                <span>{flaggedQuestions[currentQ.id] ? "Flagged for Review" : "Flag Question"}</span>
              </button>
            </div>

            {/* Question Text */}
            <div className="space-y-6 flex-1 mb-8">
              <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                {currentQ.questionText}
              </h3>

              {/* Multiple choice Options list */}
              <div className="grid grid-cols-1 gap-3">
                {["A", "B", "C", "D"].map((optKey) => {
                  const optText = currentQ[`option${optKey}` as keyof Question] as string;
                  const isSelected = selectedAnswers[currentQ.id] === optKey;

                  return (
                    <button
                      key={optKey}
                      onClick={() => selectAnswer(currentQ.id, optKey)}
                      className={`w-full text-left p-4 rounded-xl text-sm transition-all border flex items-center space-x-4 ${
                        isSelected
                          ? "bg-indigo-600/10 border-indigo-500 text-white font-bold shadow-md shadow-indigo-600/5"
                          : "bg-white/3 border-white/5 text-gray-400 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors ${
                        isSelected 
                          ? "bg-indigo-500 border-indigo-400 text-white" 
                          : "bg-white/5 border-white/10 text-gray-500"
                      }`}>
                        {optKey}
                      </span>
                      <span className="flex-1 leading-relaxed">{optText}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Buttons Row */}
            <div className="flex justify-between items-center border-t border-white/5 pt-6">
              
              <button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              {isLastQuestion ? (
                <button
                  onClick={handleFinalSubmit}
                  disabled={isPending}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Submitting Paper...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Submit Exam Paper</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/10 transition-all active:scale-95"
                >
                  <span>Next Question</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

            </div>

          </div>

          {/* Warning notice when unanswered questions exist before submission */}
          {isLastQuestion && totalAnswered < questions.length && (
            <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl flex items-start space-x-2 text-xs text-yellow-400">
              <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
              <p>
                <strong>Unanswered Questions:</strong> You have only answered <strong>{totalAnswered}</strong> out of <strong>{questions.length}</strong> questions on this exam paper. Please review your Navigator Grid before submitting.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
