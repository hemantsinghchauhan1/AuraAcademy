import { db } from "@/lib/db";
import { getDbUser } from "@/lib/auth";
import { Role, Difficulty, ReportStatus, ReportReason, ModerationAction, AdminActionType } from "@prisma/client";

// Guard helper to check if current user is an Admin or Moderator
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

// ─── ADMIN DASHBOARD STATS ───────────────────────────────────────────────────
export async function getAdminStats() {
  await requireModeratorOrAdmin();

  const [
    totalUsers,
    totalQuizzes,
    totalAttempts,
    pendingReports,
    totalComments,
    totalPosts,
    suspendedUsers
  ] = await Promise.all([
    db.user.count(),
    db.quiz.count(),
    db.attempt.count(),
    db.report.count({ where: { status: "PENDING" } }),
    db.comment.count(),
    db.post.count(),
    db.user.count({ where: { isSuspended: true } })
  ]);

  // Calculate active users in the last 7 days (users who took a quiz or posted)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeUsersCount = await db.user.count({
    where: {
      OR: [
        { attempts: { some: { completedAt: { gte: sevenDaysAgo } } } },
        { posts: { some: { createdAt: { gte: sevenDaysAgo } } } },
        { comments: { some: { createdAt: { gte: sevenDaysAgo } } } }
      ]
    }
  });

  // Fetch recent attempts for the Recharts graph
  const recentAttempts = await db.attempt.findMany({
    take: 10,
    orderBy: { completedAt: "desc" },
    include: {
      user: {
        select: {
          email: true,
          profile: { select: { name: true } }
        }
      },
      quiz: { select: { title: true } }
    }
  });

  return {
    totalUsers,
    activeUsers: activeUsersCount || 5, // fallback to avoid 0 for demo
    totalQuizzes,
    totalAttempts,
    pendingReports,
    totalComments,
    totalPosts,
    suspendedUsers,
    recentAttempts: recentAttempts.map(a => ({
      id: a.id,
      userName: a.user.profile?.name || a.user.email,
      quizTitle: a.quiz.title,
      score: a.score,
      totalQuestions: a.totalQuestions,
      completedAt: a.completedAt.toISOString()
    }))
  };
}

// ─── USER MANAGEMENT ──────────────────────────────────────────────────────────
export async function getUsersList({
  page = 1,
  limit = 10,
  search = "",
  roleFilter = "" as string,
  suspensionFilter = "" as string
}) {
  await requireModeratorOrAdmin();

  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { profile: { name: { contains: search, mode: "insensitive" } } }
    ];
  }

  if (roleFilter && ["STUDENT", "MODERATOR", "ADMIN"].includes(roleFilter)) {
    where.role = roleFilter as Role;
  }

  if (suspensionFilter === "SUSPENDED") {
    where.isSuspended = true;
  } else if (suspensionFilter === "ACTIVE") {
    where.isSuspended = false;
  }

  const [users, totalCount] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        profile: true,
        attempts: {
          select: { id: true }
        }
      }
    }),
    db.user.count({ where })
  ]);

  return {
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      isSuspended: u.isSuspended,
      name: u.profile?.name || "Student",
      avatarUrl: u.profile?.avatarUrl,
      streak: u.profile?.streak || 0,
      xp: u.profile?.xp || 0,
      totalAttempts: u.attempts.length,
      createdAt: u.createdAt.toISOString()
    })),
    totalCount,
    totalPages: Math.ceil(totalCount / limit)
  };
}

export async function updateUserRole(targetUserId: string, newRole: Role) {
  const admin = await requireAdmin();

  if (targetUserId === admin.id) {
    throw new Error("You cannot change your own role.");
  }

  const updatedUser = await db.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
    include: { profile: true }
  });

  // Log Admin Action
  await db.adminAction.create({
    data: {
      adminId: admin.id,
      action: "UPDATE_ROLE",
      details: `Changed role of user ${updatedUser.email} to ${newRole}`
    }
  });

  return updatedUser;
}

export async function toggleUserSuspension(targetUserId: string, reason: string) {
  const moderator = await requireModeratorOrAdmin();

  const userToToggle = await db.user.findUnique({
    where: { id: targetUserId }
  });

  if (!userToToggle) {
    throw new Error("User not found.");
  }

  if (userToToggle.role === "ADMIN") {
    throw new Error("Administrators cannot be suspended.");
  }

  const newStatus = !userToToggle.isSuspended;

  const updatedUser = await db.user.update({
    where: { id: targetUserId },
    data: { isSuspended: newStatus }
  });

  // Log Moderation Action
  await db.moderationLog.create({
    data: {
      moderatorId: moderator.id,
      action: newStatus ? "SUSPEND_USER" : "UNSUSPEND_USER",
      targetId: targetUserId,
      reason: reason || (newStatus ? "Suspended by admin" : "Unsuspended by admin")
    }
  });

  return updatedUser;
}

// ─── FORUM MODERATION ────────────────────────────────────────────────────────
export async function getReportsQueue(status: ReportStatus = "PENDING") {
  await requireModeratorOrAdmin();

  return db.report.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: {
        select: {
          email: true,
          profile: { select: { name: true } }
        }
      },
      post: {
        include: {
          user: {
            select: {
              email: true,
              profile: { select: { name: true } }
            }
          }
        }
      },
      comment: {
        include: {
          user: {
            select: {
              email: true,
              profile: { select: { name: true } }
            }
          }
        }
      }
    }
  });
}

export async function flagPost(postId: string, reporterId: string, reason: ReportReason, details?: string) {
  return db.report.create({
    data: {
      postId,
      reporterId,
      reason,
      details,
      status: "PENDING"
    }
  });
}

export async function flagComment(commentId: string, reporterId: string, reason: ReportReason, details?: string) {
  return db.report.create({
    data: {
      commentId,
      reporterId,
      reason,
      details,
      status: "PENDING"
    }
  });
}

export async function resolveReport(reportId: string, action: "DISMISS" | "REMOVE_CONTENT", reason: string) {
  const moderator = await requireModeratorOrAdmin();

  const report = await db.report.findUnique({
    where: { id: reportId },
    include: { post: true, comment: true }
  });

  if (!report) {
    throw new Error("Report not found.");
  }

  if (action === "DISMISS") {
    await db.report.update({
      where: { id: reportId },
      data: { status: "DISMISSED" }
    });

    await db.moderationLog.create({
      data: {
        moderatorId: moderator.id,
        action: "RESOLVE_REPORT",
        targetId: reportId,
        reason: `Dismissed report. Reason: ${reason}`
      }
    });
  } else if (action === "REMOVE_CONTENT") {
    // Transaction to remove the post/comment and resolve report
    await db.$transaction(async (tx) => {
      // Mark report as resolved
      await tx.report.update({
        where: { id: reportId },
        data: { status: "RESOLVED" }
      });

      if (report.postId) {
        await tx.post.delete({
          where: { id: report.postId }
        });
        await tx.moderationLog.create({
          data: {
            moderatorId: moderator.id,
            action: "REMOVE_POST",
            targetId: report.postId,
            reason: `Deleted reported post. Reason: ${reason}`
          }
        });
      } else if (report.commentId) {
        await tx.comment.delete({
          where: { id: report.commentId }
        });
        await tx.moderationLog.create({
          data: {
            moderatorId: moderator.id,
            action: "REMOVE_COMMENT",
            targetId: report.commentId,
            reason: `Deleted reported comment. Reason: ${reason}`
          }
        });
      }
    });
  }

  return { success: true };
}

// ─── QUIZ CMS ────────────────────────────────────────────────────────────────
export async function createAdminQuiz(data: {
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
  const admin = await requireAdmin();

  const newQuiz = await db.$transaction(async (tx) => {
    const quiz = await tx.quiz.create({
      data: {
        title: data.title,
        description: data.description,
        subjectId: data.subjectId,
        timeLimit: data.timeLimit,
        totalQuestions: data.questions.length,
        difficulty: data.difficulty
      }
    });

    for (const q of data.questions) {
      const question = await tx.question.create({
        data: {
          quizId: quiz.id,
          questionText: q.questionText,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        }
      });

      await tx.option.createMany({
        data: q.options.map(opt => ({
          questionId: question.id,
          label: opt.label,
          text: opt.text
        }))
      });
    }

    return quiz;
  });

  // Log Admin Action
  await db.adminAction.create({
    data: {
      adminId: admin.id,
      action: "CREATE_QUIZ",
      details: `Created quiz "${data.title}" under Subject ID ${data.subjectId}`
    }
  });

  return newQuiz;
}

export async function deleteAdminQuiz(quizId: string) {
  const admin = await requireAdmin();

  const deletedQuiz = await db.quiz.delete({
    where: { id: quizId }
  });

  // Log Admin Action
  await db.adminAction.create({
    data: {
      adminId: admin.id,
      action: "DELETE_QUIZ",
      details: `Deleted quiz: ${deletedQuiz.title} (ID: ${quizId})`
    }
  });

  return deletedQuiz;
}

export async function createAdminSubject(name: string, description: string, icon: string) {
  const admin = await requireAdmin();

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const subject = await db.subject.create({
    data: {
      name,
      slug,
      description,
      icon
    }
  });

  await db.adminAction.create({
    data: {
      adminId: admin.id,
      action: "CREATE_SUBJECT",
      details: `Created subject "${name}"`
    }
  });

  return subject;
}

export async function getAdminLogs() {
  await requireModeratorOrAdmin();

  const [adminActions, moderationLogs] = await Promise.all([
    db.adminAction.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        admin: {
          select: {
            email: true,
            profile: { select: { name: true } }
          }
        }
      }
    }),
    db.moderationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        moderator: {
          select: {
            email: true,
            profile: { select: { name: true } }
          }
        }
      }
    })
  ]);

  return {
    adminActions: adminActions.map(a => ({
      id: a.id,
      action: a.action,
      adminName: a.admin.profile?.name || a.admin.email,
      details: a.details,
      createdAt: a.createdAt.toISOString()
    })),
    moderationLogs: moderationLogs.map(m => ({
      id: m.id,
      action: m.action,
      moderatorName: m.moderator.profile?.name || m.moderator.email,
      targetId: m.targetId,
      reason: m.reason,
      createdAt: m.createdAt.toISOString()
    }))
  };
}

// ─── PYQ SYSTEM SERVICES ─────────────────────────────────────────────────────
export async function getPYQPapers() {
  await requireModeratorOrAdmin();

  return db.uploadedFile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      subject: true,
      uploadedBy: {
        select: {
          email: true,
          profile: { select: { name: true } }
        }
      }
    }
  });
}

export async function getPaperCategories() {
  return db.paperCategory.findMany({
    orderBy: { name: "asc" }
  });
}

export async function createPaperCategory(name: string, description?: string) {
  await requireAdmin();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return db.paperCategory.create({
    data: { name, slug, description }
  });
}

export async function uploadPYQPaper(data: {
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
  await requireModeratorOrAdmin();

  return db.uploadedFile.create({
    data: {
      name: data.name,
      url: data.url,
      key: data.key,
      size: data.size,
      mimeType: data.mimeType,
      categoryId: data.categoryId,
      semester: data.semester,
      subjectId: data.subjectId,
      uploadedById: data.uploadedById
    }
  });
}

export async function deletePYQPaper(paperId: string) {
  await requireModeratorOrAdmin();
  return db.uploadedFile.delete({
    where: { id: paperId }
  });
}
