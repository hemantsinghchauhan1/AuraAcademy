import { db } from "@/lib/db";
import { getDbUser } from "@/lib/auth";
import OutlineBuilder from "./OutlineBuilder";
import { notFound, redirect } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";

interface AdminCourseEditProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCourseEditPage({ params }: AdminCourseEditProps) {
  const { id } = await params;
  const dbUser = await getDbUser();

  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "MODERATOR")) {
    redirect("/dashboard");
  }

  // Load course details
  const course = await db.course.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              resources: true,
              assignments: true
            }
          }
        }
      }
    }
  });

  if (!course) {
    notFound();
  }

  // Fetch quizzes directories for attachments select tags
  const quizzes = await db.quiz.findMany({
    select: {
      id: true,
      title: true
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="max-w-5xl mx-auto">
      <OutlineBuilder course={course} quizzes={quizzes} />
    </div>
  );
}
