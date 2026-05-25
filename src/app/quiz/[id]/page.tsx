import { ensureDbUser } from "@/lib/auth";
import { getQuizDetails } from "@/services/quizService";
import { redirect } from "next/navigation";
import QuizClient from "./QuizClient";

interface QuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuizPage({ params }: QuizPageProps) {
  const user = await ensureDbUser();
  const { id } = await params;

  if (!user) {
    redirect(`/sign-in?redirect_url=/quiz/${id}`);
  }

  const quiz = await getQuizDetails(id);

  if (!quiz) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen py-8 bg-[#09090b]">
      <QuizClient
        userId={user.id}
        quiz={{
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          timeLimit: quiz.timeLimit,
          totalQuestions: quiz.totalQuestions,
          subjectName: quiz.subject?.name || "Subject",
          questions: quiz.questions.map((q) => ({
            id: q.id,
            quizId: q.quizId,
            questionText: q.questionText,
            options: q.options.map((opt) => ({
              id: opt.id,
              questionId: opt.questionId,
              label: opt.label,
              text: opt.text,
            })),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          })),
        }}
      />
    </div>
  );
}