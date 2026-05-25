"use server";

import * as courseService from "./courseService";
import { revalidatePath } from "next/cache";

export async function getCoursesListAction() {
  try {
    return { success: true, data: await courseService.getCoursesList() };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load courses." };
  }
}

export async function getCourseBySlugAction(slug: string, userId?: string) {
  try {
    return { success: true, data: await courseService.getCourseBySlug(slug, userId) };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load course details." };
  }
}

export async function enrollInCourseAction(courseId: string, userId: string) {
  try {
    const enrollment = await courseService.enrollInCourse(courseId, userId);
    revalidatePath("/courses");
    revalidatePath(`/courses/${courseId}`);
    revalidatePath("/dashboard");
    return { success: true, data: enrollment };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to enroll in course." };
  }
}

export async function getStudentEnrollmentsAction(userId: string) {
  try {
    return { success: true, data: await courseService.getStudentEnrollments(userId) };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to retrieve student dashboard stats." };
  }
}

export async function getLessonDetailsAction(lessonId: string, userId: string) {
  try {
    return { success: true, data: await courseService.getLessonDetails(lessonId, userId) };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch lesson contents." };
  }
}

export async function saveLessonProgressAction(params: {
  lessonId: string;
  userId: string;
  watchTime: number;
  completed: boolean;
  courseSlug: string;
}) {
  try {
    const progress = await courseService.saveLessonProgress(
      params.lessonId,
      params.userId,
      params.watchTime,
      params.completed
    );
    revalidatePath(`/courses/${params.courseSlug}`);
    revalidatePath(`/courses/${params.courseSlug}/lessons/${params.lessonId}`);
    return { success: true, data: progress };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to log lecture watch progress." };
  }
}

export async function submitAssignmentAction(data: {
  assignmentId: string;
  studentId: string;
  fileUrl: string;
  comment?: string;
  courseSlug: string;
  lessonId: string;
}) {
  try {
    const submission = await courseService.submitAssignment(data);
    revalidatePath(`/courses/${data.courseSlug}/lessons/${data.lessonId}`);
    return { success: true, data: submission };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to submit assignment." };
  }
}

export async function addCourseReviewAction(data: {
  courseId: string;
  userId: string;
  rating: number;
  comment?: string;
  courseSlug: string;
}) {
  try {
    const review = await courseService.addCourseReview(data);
    revalidatePath(`/courses/${data.courseSlug}`);
    return { success: true, data: review };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to add course review." };
  }
}
