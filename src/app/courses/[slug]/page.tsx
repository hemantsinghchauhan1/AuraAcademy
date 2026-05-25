import { getCourseBySlug } from "@/services/courseService";
import { getDbUser } from "@/lib/auth";
import CourseDetails from "./CourseDetails";
import { notFound } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

export default async function StudentCourseDetailsPage({ params }: CoursePageProps) {
  const { slug } = await params;
  const dbUser = await getDbUser();
  const userId = dbUser?.id;

  const course = await getCourseBySlug(slug, userId);

  if (!course) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CourseDetails course={course} userId={userId} />
    </div>
  );
}
