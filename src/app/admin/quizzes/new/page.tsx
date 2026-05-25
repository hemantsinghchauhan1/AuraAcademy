import { db } from "@/lib/db";
import QuizCreator from "./QuizCreator";
import React from "react";

export const dynamic = "force-dynamic";

export default async function AdminNewQuizPage() {
  const subjects = await db.subject.findMany({
    orderBy: { name: "asc" }
  });

  return (
    <div className="max-w-5xl mx-auto">
      <QuizCreator subjects={subjects} />
    </div>
  );
}
