import { db } from "@/lib/db";
import { getDbUser } from "@/lib/auth";
import { SubmissionStatus, VideoType } from "@prisma/client";
import { earnXp, updateMissionProgress } from "./gamificationService";

// ─── STUDENT COURSE SEARCH & ENROLLMENT ──────────────────────────────────────
export async function getCoursesList() {
  return db.course.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    include: {
      modules: {
        select: { id: true }
      },
      enrollments: {
        select: { id: true }
      },
      reviews: {
        select: { rating: true }
      }
    }
  });
}

export async function getCourseBySlug(slug: string, userId?: string) {
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              order: true,
              videoUrl: true,
              videoType: true,
              quizId: true
            }
          }
        }
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              email: true,
              profile: { select: { name: true, avatarUrl: true } }
            }
          }
        }
      }
    }
  });

  if (!course) return null;

  let isEnrolled = false;
  let progressPercentage = 0;

  if (userId) {
    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId: course.id }
      }
    });
    isEnrolled = !!enrollment;

    if (isEnrolled) {
      // Calculate overall course progress percentage
      const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
      if (totalLessons > 0) {
        const lessonIds = course.modules.flatMap(m => m.lessons.map(l => l.id));
        const completedCount = await db.lessonProgress.count({
          where: {
            userId,
            lessonId: { in: lessonIds },
            completed: true
          }
        });
        progressPercentage = Math.round((completedCount / totalLessons) * 100);
      }
    }
  }

  return {
    ...course,
    isEnrolled,
    progressPercentage
  };
}

export async function enrollInCourse(courseId: string, userId: string) {
  const existing = await db.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId }
    }
  });

  if (existing) return existing;

  return db.enrollment.create({
    data: {
      userId,
      courseId
    }
  });
}

export async function getStudentEnrollments(userId: string) {
  const enrollments = await db.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          modules: {
            include: {
              lessons: { select: { id: true } }
            }
          }
        }
      }
    }
  });

  return Promise.all(
    enrollments.map(async (e) => {
      const lessonIds = e.course.modules.flatMap(m => m.lessons.map(l => l.id));
      const total = lessonIds.length;
      let completedCount = 0;

      if (total > 0) {
        completedCount = await db.lessonProgress.count({
          where: {
            userId,
            lessonId: { in: lessonIds },
            completed: true
          }
        });
      }

      return {
        id: e.id,
        courseId: e.courseId,
        title: e.course.title,
        slug: e.course.slug,
        description: e.course.description,
        thumbnailUrl: e.course.thumbnailUrl,
        isPremium: e.course.isPremium,
        completed: e.completed,
        totalLessons: total,
        completedLessons: completedCount,
        progressPercentage: total > 0 ? Math.round((completedCount / total) * 100) : 0
      };
    })
  );
}

// ─── INTERACTIVE CLASSROOM LECTURES ──────────────────────────────────────────
export async function getLessonDetails(lessonId: string, userId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: true
        }
      },
      resources: true,
      assignments: {
        include: {
          submissions: {
            where: { studentId: userId },
            orderBy: { createdAt: "desc" }
          }
        }
      },
      quiz: {
        select: {
          id: true,
          title: true,
          totalQuestions: true
        }
      }
    }
  });

  if (!lesson) throw new Error("Lesson not found.");

  const course = lesson.module.course;

  // Protect premium content
  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId: course.id }
    }
  });

  const isEnrolled = !!enrollment;

  if (course.isPremium && !isEnrolled) {
    return {
      id: lesson.id,
      title: lesson.title,
      order: lesson.order,
      isLocked: true,
      courseSlug: course.slug,
      courseTitle: course.title
    };
  }

  // Get student's progress for this specific lesson
  const progress = await db.lessonProgress.findUnique({
    where: {
      userId_lessonId: { userId, lessonId }
    }
  });

  return {
    id: lesson.id,
    title: lesson.title,
    content: lesson.content,
    videoUrl: lesson.videoUrl,
    videoType: lesson.videoType,
    order: lesson.order,
    courseSlug: course.slug,
    courseTitle: course.title,
    moduleId: lesson.moduleId,
    quiz: lesson.quiz,
    resources: lesson.resources,
    assignments: lesson.assignments.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate?.toISOString(),
      studentSubmission: a.submissions[0] || null
    })),
    isLocked: false,
    progress: progress ? {
      completed: progress.completed,
      watchTime: progress.watchTime
    } : {
      completed: false,
      watchTime: 0
    }
  };
}

export async function saveLessonProgress(lessonId: string, userId: string, watchTime: number, completed: boolean) {
  const record = await db.lessonProgress.upsert({
    where: {
      userId_lessonId: { userId, lessonId }
    },
    update: {
      watchTime,
      completed
    },
    create: {
      userId,
      lessonId,
      watchTime,
      completed
    },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: {
                include: {
                  modules: {
                    include: {
                      lessons: { select: { id: true } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  // Self-healing: Check if this completion marks the overall course as finished
  if (completed) {
    // Award XP and update daily missions progress
    await earnXp(userId, 50, `COMPLETED_LESSON:${lessonId}`);
    await updateMissionProgress(userId, "LESSON", 1);

    const course = record.lesson.module.course;
    const lessonIds = course.modules.flatMap(m => m.lessons.map(l => l.id));
    const completedCount = await db.lessonProgress.count({
      where: {
        userId,
        lessonId: { in: lessonIds },
        completed: true
      }
    });

    if (completedCount === lessonIds.length) {
      await db.enrollment.update({
        where: {
          userId_courseId: { userId, courseId: course.id }
        },
        data: { completed: true }
      });
    }
  }

  return record;
}

// ─── ASSIGNMENT SUBMISSIONS ──────────────────────────────────────────────────
export async function submitAssignment(data: {
  assignmentId: string;
  studentId: string;
  fileUrl: string;
  comment?: string;
}) {
  const existingSub = await db.assignmentSubmission.findFirst({
    where: {
      assignmentId: data.assignmentId,
      studentId: data.studentId
    },
    orderBy: { createdAt: "desc" }
  });

  if (existingSub && existingSub.status === "PENDING") {
    // Overwrite/update existing pending submission
    return db.assignmentSubmission.update({
      where: { id: existingSub.id },
      data: {
        fileUrl: data.fileUrl,
        comment: data.comment
      }
    });
  }

  // Create fresh resubmission
  return db.assignmentSubmission.create({
    data: {
      assignmentId: data.assignmentId,
      studentId: data.studentId,
      fileUrl: data.fileUrl,
      comment: data.comment,
      status: "PENDING"
    }
  });
}

// ─── COURSE REVIEWS ──────────────────────────────────────────────────────────
export async function addCourseReview(data: {
  courseId: string;
  userId: string;
  rating: number;
  comment?: string;
}) {
  return db.courseReview.upsert({
    where: {
      userId_courseId: { userId: data.userId, courseId: data.courseId }
    },
    update: {
      rating: data.rating,
      comment: data.comment
    },
    create: {
      userId: data.userId,
      courseId: data.courseId,
      rating: data.rating,
      comment: data.comment
    }
  });
}
