"use server";

import * as adminService from "./adminService";
import { Role, Difficulty, ReportStatus, ReportReason } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getAdminStatsAction() {
  try {
    return { success: true, data: await adminService.getAdminStats() };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch dashboard statistics." };
  }
}

export async function getUsersListAction(params: {
  page?: number;
  limit?: number;
  search?: string;
  roleFilter?: string;
  suspensionFilter?: string;
}) {
  try {
    return { success: true, data: await adminService.getUsersList(params) };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch user list." };
  }
}

export async function updateUserRoleAction(targetUserId: string, newRole: Role) {
  try {
    const updated = await adminService.updateUserRole(targetUserId, newRole);
    revalidatePath("/admin/users");
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update user role." };
  }
}

export async function toggleUserSuspensionAction(targetUserId: string, reason: string) {
  try {
    const updated = await adminService.toggleUserSuspension(targetUserId, reason);
    revalidatePath("/admin/users");
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to modify user suspension." };
  }
}

export async function getReportsQueueAction(status?: ReportStatus) {
  try {
    return { success: true, data: await adminService.getReportsQueue(status) };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch moderation report queue." };
  }
}

export async function resolveReportAction(reportId: string, action: "DISMISS" | "REMOVE_CONTENT", reason: string) {
  try {
    const res = await adminService.resolveReport(reportId, action, reason);
    revalidatePath("/admin/moderation");
    return { ...res };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to resolve report." };
  }
}

export async function createAdminQuizAction(data: {
  title: string;
  description: string;
  subjectId: string;
  timeLimit: number | null;
  difficulty: Difficulty;
  questions: Array<{
    questionText: string;
    explanation: string;
    correctAnswer: string;
    options: Array<{
      label: string;
      text: string;
    }>;
  }>;
}) {
  try {
    const quiz = await adminService.createAdminQuiz(data);
    revalidatePath("/admin/quizzes");
    revalidatePath("/quiz");
    return { success: true, data: quiz };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create quiz." };
  }
}

export async function deleteAdminQuizAction(quizId: string) {
  try {
    const quiz = await adminService.deleteAdminQuiz(quizId);
    revalidatePath("/admin/quizzes");
    revalidatePath("/quiz");
    return { success: true, data: quiz };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete quiz." };
  }
}

export async function createAdminSubjectAction(name: string, description: string, icon: string) {
  try {
    const subject = await adminService.createAdminSubject(name, description, icon);
    revalidatePath("/admin/quizzes");
    revalidatePath("/quiz");
    return { success: true, data: subject };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create subject." };
  }
}

export async function getAdminLogsAction() {
  try {
    return { success: true, data: await adminService.getAdminLogs() };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch logs audit trail." };
  }
}

export async function getPYQPapersAction() {
  try {
    return { success: true, data: await adminService.getPYQPapers() };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch papers." };
  }
}

export async function getPaperCategoriesAction() {
  try {
    return { success: true, data: await adminService.getPaperCategories() };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch categories." };
  }
}

export async function createPaperCategoryAction(name: string, description?: string) {
  try {
    const category = await adminService.createPaperCategory(name, description);
    revalidatePath("/admin/pyqs");
    return { success: true, data: category };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create paper category." };
  }
}

export async function uploadPYQPaperAction(data: {
  name: string;
  url: string;
  key: string;
  size: number;
  mimeType: string;
  categoryId: string;
  semester?: number;
  subjectId?: string;
  uploadedById: string;
}) {
  try {
    const paper = await adminService.uploadPYQPaper(data);
    revalidatePath("/admin/pyqs");
    return { success: true, data: paper };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to log paper upload." };
  }
}

export async function deletePYQPaperAction(paperId: string) {
  try {
    const paper = await adminService.deletePYQPaper(paperId);
    revalidatePath("/admin/pyqs");
    return { success: true, data: paper };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete paper." };
  }
}
