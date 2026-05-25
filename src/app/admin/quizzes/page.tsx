import { db } from "@/lib/db";
import QuizManager from "./QuizManager";
import React from "react";

export const dynamic = "force-dynamic";

export default async function AdminQuizzesPage() {
  const [quizzes, subjects] = await Promise.all([
    db.quiz.findMany({
      orderBy: { createdAt: "desc" },
      include: { subject: true }
    }),
    db.subject.findMany({
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Quiz CMS</h1>
        <p className="text-gray-400 mt-1">Publish new exams, organize academic subjects, and review student questionnaires.</p>
      </div>

      <QuizManager quizzes={quizzes} subjects={subjects} />
    </div>
  );
}
