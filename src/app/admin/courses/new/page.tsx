import { getDbUser } from "@/lib/auth";
import CourseCreator from "./CourseCreator";
import { redirect } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";

export default async function AdminNewCoursePage() {
  const dbUser = await getDbUser();

  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "MODERATOR")) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Add New Course</h1>
        <p className="text-gray-400 mt-1">Spin up structured learning modules and outline draft examinations.</p>
      </div>

      <CourseCreator />
    </div>
  );
}
