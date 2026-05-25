"use server";

import * as courseAdminService from "./courseAdminService";
import { VideoType, SubmissionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createAdminCourseAction(data: {
  title: string;
  description: string;
  thumbnailUrl?: string;
  isPremium?: boolean;
}) {
  try {
    const course = await courseAdminService.createAdminCourse(data);
    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    return { success: true, data: course };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create course." };
  }
}

export async function updateCoursePublishStateAction(courseId: string, isPublished: boolean, courseSlug: string) {
  try {
    const updated = await courseAdminService.updateCoursePublishState(courseId, isPublished);
    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    revalidatePath(`/courses/${courseSlug}`);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to modify course publishing state." };
  }
}

export async function deleteAdminCourseAction(courseId: string) {
  try {
    const deleted = await courseAdminService.deleteAdminCourse(courseId);
    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    return { success: true, data: deleted };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete course." };
  }
}

export async function createAdminModuleAction(data: {
  courseId: string;
  title: string;
  description?: string;
  order: number;
  courseSlug: string;
}) {
  try {
    const mod = await courseAdminService.createAdminModule(data);
    revalidatePath(`/courses/${data.courseSlug}`);
    return { success: true, data: mod };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to append course module." };
  }
}

export async function createAdminLessonAction(data: {
  moduleId: string;
  title: string;
  content: string;
  videoUrl?: string;
  videoType?: VideoType;
  order: number;
  quizId?: string;
  courseSlug: string;
}) {
  try {
    const lesson = await courseAdminService.createAdminLesson(data);
    revalidatePath(`/courses/${data.courseSlug}`);
    return { success: true, data: lesson };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to add lesson." };
  }
}

export async function createAdminAssignmentAction(data: {
  lessonId: string;
  title: string;
  description: string;
  dueDate?: Date;
  courseSlug: string;
  lessonIdStr: string;
}) {
  try {
    const assignment = await courseAdminService.createAdminAssignment(data);
    revalidatePath(`/courses/${data.courseSlug}/lessons/${data.lessonIdStr}`);
    return { success: true, data: assignment };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to append assignment." };
  }
}

export async function addLessonResourceAction(data: {
  lessonId: string;
  name: string;
  url: string;
  courseSlug: string;
}) {
  try {
    const res = await courseAdminService.addLessonResource(data);
    revalidatePath(`/courses/${data.courseSlug}/lessons/${data.lessonId}`);
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to attach downloadable slides." };
  }
}

export async function getPendingAssignmentsQueueAction() {
  try {
    return { success: true, data: await courseAdminService.getPendingAssignmentsQueue() };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch student grading queue." };
  }
}

export async function gradeAssignmentSubmissionAction(data: {
  submissionId: string;
  graderId: string;
  status: SubmissionStatus;
  feedback?: string;
}) {
  try {
    const graded = await courseAdminService.gradeAssignmentSubmission(data);
    revalidatePath("/admin/assignments");
    return { success: true, data: graded };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to record evaluation grade." };
  }
}
