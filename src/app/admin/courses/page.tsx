import { db } from "@/lib/db";
import { getDbUser } from "@/lib/auth";
import CoursesPanel from "./CoursesPanel";
import { redirect } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const dbUser = await getDbUser();

  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "MODERATOR")) {
    redirect("/dashboard");
  }

  // Fetch courses with count aggregations
  const courses = await db.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          modules: true,
          enrollments: true
        }
      }
    }
  });

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Curriculum CMS</h1>
        <p className="text-gray-400 mt-1">Structure course outlines, create lesson roadmaps, and grade student submissions.</p>
      </div>

      <CoursesPanel courses={courses} />
    </div>
  );
}
