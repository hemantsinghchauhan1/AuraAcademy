import { db } from "@/lib/db";
import { getDbUser } from "@/lib/auth";
import { Role, Difficulty, VideoType, SubmissionStatus } from "@prisma/client";

// Guard helper to verify administrator or moderator privileges
async function requireModeratorOrAdmin() {
  const user = await getDbUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
    throw new Error("Unauthorized access. Admin or Moderator privileges required.");
  }
  return user;
}

async function requireAdmin() {
  const user = await getDbUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized access. Admin privileges required.");
  }
  return user;
}

// ─── COURSE CMS CREATION ─────────────────────────────────────────────────────
export async function createAdminCourse(data: {
  title: string;
  description: string;
  thumbnailUrl?: string;
  isPremium?: boolean;
}) {
  const admin = await requireAdmin();

  const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const course = await db.course.create({
    data: {
      title: data.title,
      slug,
      description: data.description,
      thumbnailUrl: data.thumbnailUrl || null,
      isPremium: data.isPremium || false,
      isPublished: false // default draft mode
    }
  });

  // Log action
  await db.adminAction.create({
    data: {
      adminId: admin.id,
      action: "CREATE_QUIZ", // fallback admin action log type
      details: `Created new course: "${data.title}" (slug: ${slug})`
    }
  });

  return course;
}

export async function updateCoursePublishState(courseId: string, isPublished: boolean) {
  await requireAdmin();
  return db.course.update({
    where: { id: courseId },
    data: { isPublished }
  });
}

export async function deleteAdminCourse(courseId: string) {
  const admin = await requireAdmin();
  const deleted = await db.course.delete({
    where: { id: courseId }
  });

  await db.adminAction.create({
    data: {
      adminId: admin.id,
      action: "DELETE_QUIZ",
      details: `Deleted course: "${deleted.title}" (ID: ${courseId})`
    }
  });

  return deleted;
}

// ─── MODULE & LESSON CURRICULUM CMS ──────────────────────────────────────────
export async function createAdminModule(data: {
  courseId: string;
  title: string;
  description?: string;
  order: number;
}) {
  await requireModeratorOrAdmin();

  return db.module.create({
    data: {
      courseId: data.courseId,
      title: data.title,
      description: data.description || null,
      order: data.order
    }
  });
}

export async function createAdminLesson(data: {
  moduleId: string;
  title: string;
  content: string;
  videoUrl?: string;
  videoType?: VideoType;
  order: number;
  quizId?: string;
}) {
  await requireModeratorOrAdmin();

  return db.lesson.create({
    data: {
      moduleId: data.moduleId,
      title: data.title,
      content: data.content,
      videoUrl: data.videoUrl || null,
      videoType: data.videoType || null,
      order: data.order,
      quizId: data.quizId || null
    }
  });
}

export async function createAdminAssignment(data: {
  lessonId: string;
  title: string;
  description: string;
  dueDate?: Date;
}) {
  await requireModeratorOrAdmin();

  return db.assignment.create({
    data: {
      lessonId: data.lessonId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate || null
    }
  });
}

export async function addLessonResource(data: {
  lessonId: string;
  name: string;
  url: string;
}) {
  await requireModeratorOrAdmin();

  return db.resource.create({
    data: {
      lessonId: data.lessonId,
      name: data.name,
      url: data.url
    }
  });
}

// ─── HOMEWORK EVALUATOR QUEUE ───────────────────────────────────────────────
export async function getPendingAssignmentsQueue() {
  await requireModeratorOrAdmin();

  return db.assignmentSubmission.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      student: {
        select: {
          email: true,
          profile: { select: { name: true } }
        }
      },
      assignment: {
        include: {
          lesson: {
            select: { title: true }
          }
        }
      }
    }
  });
}

export async function gradeAssignmentSubmission(data: {
  submissionId: string;
  graderId: string;
  status: SubmissionStatus;
  feedback?: string;
}) {
  await requireModeratorOrAdmin();

  const updatedSub = await db.assignmentSubmission.update({
    where: { id: data.submissionId },
    data: {
      status: data.status,
      feedback: data.feedback || null,
      gradedById: data.graderId
    }
  });

  // Log in moderation history
  await db.moderationLog.create({
    data: {
      moderatorId: data.graderId,
      action: "RESOLVE_REPORT", // fallback log type representing review resolution
      targetId: data.submissionId,
      reason: `Evaluated homework submission. Grade: ${data.status}. Feedback: ${data.feedback || "None"}`
    }
  });

  return updatedSub;
}
