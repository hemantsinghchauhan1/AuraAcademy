import { getLessonDetails, getCourseBySlug } from "@/services/courseService";
import { getDbUser } from "@/lib/auth";
import ClassroomPlayer from "./ClassroomPlayer";
import { notFound, redirect } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";

interface LessonPageProps {
  params: Promise<{
    slug: string;
    lessonId: string;
  }>;
}

export default async function StudentClassroomLessonPage({ params }: LessonPageProps) {
  const { slug, lessonId } = await params;
  const dbUser = await getDbUser();

  if (!dbUser) {
    redirect("/sign-in");
  }

  // Load lesson details
  let lesson: any;
  try {
    lesson = await getLessonDetails(lessonId, dbUser.id);
  } catch (err) {
    notFound();
  }

  // Handle premium lock redirection
  if (lesson.isLocked) {
    redirect(`/courses/${slug}`);
  }

  // Load entire course outline structure for side panel navigation
  const courseOutline = await getCourseBySlug(slug, dbUser.id);

  if (!courseOutline) {
    notFound();
  }

  return (
    <ClassroomPlayer
      lesson={lesson}
      courseOutline={courseOutline}
      userId={dbUser.id}
    />
  );
}
