"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────
// ENUMS & TYPES RE-EXPORTS / DEFINITIONS
// ─────────────────────────────────────────────────────────────
export type LeaderboardFilter = "xp" | "streak" | "weekly" | "monthly";

// Helper to seed defaults if they don't exist
export async function ensureSeedGamification() {
  try {
    // 1. Seed Level System
    const levelCount = await db.levelSystem.count();
    if (levelCount === 0) {
      const levels = [
        { level: 1, xpThreshold: 0, title: "Aura Initiate" },
        { level: 2, xpThreshold: 200, title: "Code Apprentice" },
        { level: 3, xpThreshold: 500, title: "Syntax Explorer" },
        { level: 4, xpThreshold: 1000, title: "Logic Builder" },
        { level: 5, xpThreshold: 1800, title: "Algorithm Aspirant" },
        { level: 6, xpThreshold: 2800, title: "Structure Sculptor" },
        { level: 7, xpThreshold: 4000, title: "Recursion Master" },
        { level: 8, xpThreshold: 5500, title: "Concurrency Knight" },
        { level: 9, xpThreshold: 7500, title: "System Overlord" },
        { level: 10, xpThreshold: 10000, title: "Aura Archmage" },
      ];
      await db.levelSystem.createMany({ data: levels });
      console.log("✅ Seeded default LevelSystem");
    }

    // 2. Seed Default Achievements
    const achievementCount = await db.achievement.count();
    if (achievementCount === 0) {
      const achievements = [
        {
          title: "First Step",
          description: "Complete your first lesson at AuraAcademy",
          icon: "🚀",
          xpReward: 100,
          rarity: "COMMON" as const,
        },
        {
          title: "Quiz Master",
          description: "Solve a quiz with a perfect 100% accuracy score",
          icon: "💯",
          xpReward: 250,
          rarity: "RARE" as const,
        },
        {
          title: "Unstoppable",
          description: "Maintain a 7-day active study streak",
          icon: "🔥",
          xpReward: 350,
          rarity: "EPIC" as const,
        },
        {
          title: "DSA Overlord",
          description: "Complete the entire structured DSA roadmap curriculum",
          icon: "🧠",
          xpReward: 1000,
          rarity: "LEGENDARY" as const,
        },
        {
          title: "Community Pillar",
          description: "Publish your first feedback or comment in the peer forums",
          icon: "🤝",
          xpReward: 150,
          rarity: "COMMON" as const,
        },
        {
          title: "Assignment Champ",
          description: "Get an approved grade on any classroom assignment",
          icon: "🏆",
          xpReward: 300,
          rarity: "RARE" as const,
        },
      ];
      await db.achievement.createMany({ data: achievements });
      console.log("✅ Seeded default Achievements");
    }

    // 3. Seed Default Badges
    const badgeCount = await db.badge.count();
    if (badgeCount === 0) {
      const badges = [
        { name: "Code Ninja", description: "Completed 5 lessons within 24 hours", icon: "🥷" },
        { name: "Bug Hunter", description: "Found and debugged forum topics with code blocks", icon: "🐛" },
        { name: "Scholar", description: "Enrolled in and completed at least one full course", icon: "🎓" },
        { name: "Elite Solver", description: "Maintained a streak above 10 days", icon: "⚡" },
      ];
      await db.badge.createMany({ data: badges });
      console.log("✅ Seeded default Badges");
    }

    // 4. Seed Daily Missions
    const missionCount = await db.mission.count();
    if (missionCount === 0) {
      const missions = [
        { title: "Daily Scholar", description: "Complete 1 lesson today", xpReward: 50, targetCount: 1, type: "LESSON" as const },
        { title: "Trivia Solver", description: "Complete 1 practice quiz today", xpReward: 100, targetCount: 1, type: "QUIZ" as const },
        { title: "Social Connector", description: "Publish 1 comment in the peer forums today", xpReward: 50, targetCount: 1, type: "FORUM" as const },
      ];
      await db.mission.createMany({ data: missions });
      console.log("✅ Seeded default Missions");
    }
  } catch (error) {
    console.error("ensureSeedGamification error:", error);
  }
}

// ─────────────────────────────────────────────────────────────
// XP LOGS & LEVEL PROGRESSION ENGINE
// ─────────────────────────────────────────────────────────────
export async function earnXp(userId: string, amount: number, reason: string) {
  try {
    await ensureSeedGamification();

    // 1. Anti-Abuse XP Protection
    // If the reason indicates a specific unique event (e.g. COMPLETED_LESSON:id), prevent duplicate earning.
    const alreadyEarned = await db.xPLog.findFirst({
      where: { userId, reason },
    });
    if (alreadyEarned) {
      return { success: false, message: "XP already claimed for this event." };
    }

    // 2. Create XP Log
    await db.xPLog.create({
      data: {
        userId,
        amount,
        reason,
      },
    });

    // 3. Update User Profile XP
    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile) return { success: false, message: "Profile not found." };

    const oldXp = profile.xp;
    const newXp = oldXp + amount;

    await db.profile.update({
      where: { userId },
      data: { xp: newXp },
    });

    // 4. Update Leaderboard Stats
    await db.leaderboard.upsert({
      where: { userId },
      create: {
        userId,
        name: profile.name || "Student",
        xp: newXp,
        streak: profile.streak || 0,
        rank: 1,
      },
      update: {
        name: profile.name || "Student",
        xp: newXp,
      },
    });

    // Recalculate levels & check for level up notification details
    const oldLevelRecord = await db.levelSystem.findFirst({
      where: { xpThreshold: { lte: oldXp } },
      orderBy: { level: "desc" },
    });
    const newLevelRecord = await db.levelSystem.findFirst({
      where: { xpThreshold: { lte: newXp } },
      orderBy: { level: "desc" },
    });

    const leveledUp = newLevelRecord && oldLevelRecord && newLevelRecord.level > oldLevelRecord.level;

    // Trigger achievement evaluation
    await checkAndUnlockAchievements(userId);
    await checkAndUnlockBadges(userId);

    // Refresh dashboard / leaderboards
    revalidatePath("/dashboard");
    revalidatePath("/leaderboard");

    return {
      success: true,
      amount,
      newXp,
      leveledUp: !!leveledUp,
      newLevel: newLevelRecord?.level || 1,
      newTitle: newLevelRecord?.title || "Aura Initiate",
    };
  } catch (error: any) {
    console.error("earnXp error:", error);
    return { success: false, error: error.message };
  }
}

// Get user profile including gamification details
export async function getUserGamificationProfile(userId: string) {
  await ensureSeedGamification();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      profile: true,
      userAchievements: {
        include: { achievement: true },
        orderBy: { unlockedAt: "desc" },
      },
      userBadges: {
        include: { badge: true },
        orderBy: { unlockedAt: "desc" },
      },
      certificates: {
        include: { course: true },
        orderBy: { issuedAt: "desc" },
      },
      xpLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user || !user.profile) return null;

  // Calculate current Level
  const currentLevelRecord = await db.levelSystem.findFirst({
    where: { xpThreshold: { lte: user.profile.xp } },
    orderBy: { level: "desc" },
  });

  const nextLevelRecord = await db.levelSystem.findFirst({
    where: { level: (currentLevelRecord?.level || 1) + 1 },
  });

  // Calculate global rank
  const leaderboardEntry = await db.leaderboard.findUnique({ where: { userId } });

  return {
    ...user,
    levelInfo: {
      currentLevel: currentLevelRecord?.level || 1,
      title: currentLevelRecord?.title || "Aura Initiate",
      xp: user.profile.xp,
      minXp: currentLevelRecord?.xpThreshold || 0,
      maxXp: nextLevelRecord?.xpThreshold || 10000,
      progressPercentage: nextLevelRecord
        ? Math.min(
            100,
            Math.round(
              ((user.profile.xp - (currentLevelRecord?.xpThreshold || 0)) /
                (nextLevelRecord.xpThreshold - (currentLevelRecord?.xpThreshold || 0))) *
                100
            )
          )
        : 100,
    },
    rank: leaderboardEntry?.rank || 999,
  };
}

// ─────────────────────────────────────────────────────────────
// ACHIEVEMENTS & BADGES AUTOMATIC UNLOCKS
// ─────────────────────────────────────────────────────────────
export async function checkAndUnlockAchievements(userId: string) {
  try {
    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile) return;

    const unlocked = await db.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });
    const unlockedIds = new Set(unlocked.map((a) => a.achievementId));

    const achievements = await db.achievement.findMany();

    // Check conditions
    for (const ach of achievements) {
      if (unlockedIds.has(ach.id)) continue;

      let meetsCriteria = false;

      if (ach.title === "First Step") {
        const completions = await db.lessonProgress.count({ where: { userId, completed: true } });
        meetsCriteria = completions >= 1;
      } else if (ach.title === "Quiz Master") {
        const perfectAttempts = await db.attempt.count({
          where: {
            userId,
            score: { equals: db.attempt.fields.totalQuestions }, // perfect score!
          },
        });
        meetsCriteria = perfectAttempts >= 1;
      } else if (ach.title === "Unstoppable") {
        meetsCriteria = (profile.streak || 0) >= 7;
      } else if (ach.title === "Community Pillar") {
        const comments = await db.comment.count({ where: { userId } });
        const posts = await db.post.count({ where: { userId } });
        meetsCriteria = comments + posts >= 1;
      } else if (ach.title === "Assignment Champ") {
        const approvedSubmissions = await db.assignmentSubmission.count({
          where: { studentId: userId, status: "APPROVED" },
        });
        meetsCriteria = approvedSubmissions >= 1;
      } else if (ach.title === "DSA Overlord") {
        // Find if user has completed a course with "DSA" or "Algorithms" slug
        const completedDsa = await db.enrollment.findFirst({
          where: {
            userId,
            completed: true,
            course: {
              slug: { contains: "dsa" },
            },
          },
        });
        meetsCriteria = !!completedDsa;
      }

      if (meetsCriteria) {
        // Unlock it!
        await db.userAchievement.create({
          data: {
            userId,
            achievementId: ach.id,
          },
        });

        // Award XP! (Uses transaction-safe reason to avoid duplicate claim)
        await earnXp(userId, ach.xpReward, `ACHIEVEMENT_UNLOCKED:${ach.id}`);
      }
    }
  } catch (error) {
    console.error("checkAndUnlockAchievements error:", error);
  }
}

export async function checkAndUnlockBadges(userId: string) {
  try {
    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile) return;

    const unlocked = await db.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    const unlockedIds = new Set(unlocked.map((b) => b.badgeId));

    const badges = await db.badge.findMany();

    for (const badge of badges) {
      if (unlockedIds.has(badge.id)) continue;

      let meetsCriteria = false;

      if (badge.name === "Code Ninja") {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentCompletions = await db.lessonProgress.count({
          where: { userId, completed: true, updatedAt: { gte: oneDayAgo } },
        });
        meetsCriteria = recentCompletions >= 5;
      } else if (badge.name === "Bug Hunter") {
        const posts = await db.post.count({
          where: { userId, content: { contains: "```" } },
        });
        meetsCriteria = posts >= 1;
      } else if (badge.name === "Scholar") {
        const completedCourse = await db.enrollment.count({
          where: { userId, completed: true },
        });
        meetsCriteria = completedCourse >= 1;
      } else if (badge.name === "Elite Solver") {
        meetsCriteria = (profile.streak || 0) >= 10;
      }

      if (meetsCriteria) {
        await db.userBadge.create({
          data: {
            userId,
            badgeId: badge.id,
          },
        });
      }
    }
  } catch (error) {
    console.error("checkAndUnlockBadges error:", error);
  }
}

// ─────────────────────────────────────────────────────────────
// DAILY MISSIONS ENGINE & CLAIMING
// ─────────────────────────────────────────────────────────────
export async function getDailyMissions(userId: string) {
  try {
    await ensureSeedGamification();

    const allMissions = await db.mission.findMany();
    const userMissions = await db.userMission.findMany({
      where: { userId },
      include: { mission: true },
    });

    const userMissionsMap = new Map(userMissions.map((um) => [um.missionId, um]));

    // Auto-create missing missions records for user
    const results = [];
    for (const mission of allMissions) {
      let userMission = userMissionsMap.get(mission.id);

      if (!userMission) {
        // Seed default counts based on current day progress
        let currentCount = 0;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        if (mission.type === "LESSON") {
          currentCount = await db.lessonProgress.count({
            where: { userId, completed: true, updatedAt: { gte: todayStart } },
          });
        } else if (mission.type === "QUIZ") {
          currentCount = await db.attempt.count({
            where: { userId, completedAt: { gte: todayStart } },
          });
        } else if (mission.type === "FORUM") {
          const comments = await db.comment.count({
            where: { userId, createdAt: { gte: todayStart } },
          });
          const posts = await db.post.count({
            where: { userId, createdAt: { gte: todayStart } },
          });
          currentCount = comments + posts;
        } else if (mission.type === "STREAK") {
          const profile = await db.profile.findUnique({ where: { userId } });
          currentCount = profile?.streak && profile.streak > 0 ? 1 : 0;
        }

        const isCompleted = currentCount >= mission.targetCount;

        userMission = await db.userMission.create({
          data: {
            userId,
            missionId: mission.id,
            currentCount: Math.min(mission.targetCount, currentCount),
            completed: isCompleted,
            claimed: false,
          },
          include: { mission: true },
        });
      }

      results.push(userMission);
    }

    return results;
  } catch (error) {
    console.error("getDailyMissions error:", error);
    return [];
  }
}

// Hook to call when user performs a gamified activity to increment daily mission counts
export async function updateMissionProgress(userId: string, type: "LESSON" | "QUIZ" | "FORUM" | "STREAK", count: number = 1) {
  try {
    await ensureSeedGamification();

    const userMissions = await db.userMission.findMany({
      where: { userId, mission: { type } },
      include: { mission: true },
    });

    for (const um of userMissions) {
      if (um.completed) continue;

      const newCount = Math.min(um.mission.targetCount, um.currentCount + count);
      const isCompleted = newCount >= um.mission.targetCount;

      await db.userMission.update({
        where: { id: um.id },
        data: {
          currentCount: newCount,
          completed: isCompleted,
        },
      });
    }
  } catch (error) {
    console.error("updateMissionProgress error:", error);
  }
}

export async function claimMissionReward(userId: string, userMissionId: string) {
  try {
    const userMission = await db.userMission.findUnique({
      where: { id: userMissionId },
      include: { mission: true },
    });

    if (!userMission) return { success: false, error: "Mission not found." };
    if (!userMission.completed) return { success: false, error: "Mission is not yet completed." };
    if (userMission.claimed) return { success: false, error: "Reward already claimed." };

    // Mark as claimed
    await db.userMission.update({
      where: { id: userMissionId },
      data: { claimed: true },
    });

    // Earn XP!
    const res = await earnXp(userId, userMission.mission.xpReward, `DAILY_MISSION_CLAIMED:${userMission.id}`);

    revalidatePath("/dashboard");

    return {
      success: true,
      xpAwarded: userMission.mission.xpReward,
      leveledUp: res.leveledUp,
      newLevel: res.newLevel,
    };
  } catch (error: any) {
    console.error("claimMissionReward error:", error);
    return { success: false, error: error.message };
  }
}

// Reset daily missions progress (Run by admin or automated scheduler / user login sync)
export async function resetDailyMissionsForUser(userId: string) {
  try {
    await db.userMission.deleteMany({ where: { userId } });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("resetDailyMissionsForUser error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// GLOBAL LEADERBOARDS & RANKINGS SYSTEM
// ─────────────────────────────────────────────────────────────
export async function getLeaderboardStandings(filterType: LeaderboardFilter = "xp") {
  try {
    await ensureSeedGamification();

    // In a production environment with scaling workloads, we dynamically sort based on active filters.
    // For local SQLite/PostgreSQL, we fetch dynamic records.
    if (filterType === "streak") {
      const records = await db.leaderboard.findMany({
        orderBy: { streak: "desc" },
        take: 50,
      });
      return records.map((r, i) => ({ ...r, rank: i + 1 }));
    }

    // Default by XP rankings
    const records = await db.leaderboard.findMany({
      orderBy: { xp: "desc" },
      take: 50,
    });
    return records.map((r, i) => ({ ...r, rank: i + 1 }));
  } catch (error) {
    console.error("getLeaderboardStandings error:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// DYNAMIC SVG COURSE CERTIFICATE GENERATION & VERIFICATION
// ─────────────────────────────────────────────────────────────
export async function getOrCreateCertificate(userId: string, courseId: string) {
  try {
    // 1. Verify user completed all modules/lessons in the course
    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: { lessons: true },
        },
      },
    });

    if (!course) throw new Error("Course not found");

    const enrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    // Check completion threshold
    const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    if (lessonIds.length > 0) {
      const completedCount = await db.lessonProgress.count({
        where: {
          userId,
          lessonId: { in: lessonIds },
          completed: true,
        },
      });

      if (completedCount < lessonIds.length) {
        throw new Error("Course is not fully completed yet.");
      }
    }

    // Check if certificate already issued
    const existingCert = await db.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existingCert) return existingCert;

    // Generate dynamic code e.g. AURA-XXXX-YYYY
    const randPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const certCode = `AURA-${randPart1}-${randPart2}`;

    // Issue new certificate
    const newCert = await db.certificate.create({
      data: {
        userId,
        courseId,
        certificateCode: certCode,
      },
    });

    // Mark enrollment completed just in case
    await db.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { completed: true },
    });

    // Send verified academic email notification dynamically (does not block on empty API credentials)
    try {
      const studentUser = await db.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      if (studentUser) {
        const { sendCertificateEmail } = await import("./emailService");
        await sendCertificateEmail(
          studentUser.email,
          studentUser.profile?.name || "Aura Graduate",
          course.title,
          certCode
        );
      }
    } catch (emailErr) {
      console.error("Non-blocking certificate email notification warning:", emailErr);
    }

    // Earn bonus XP for completing the course!
    await earnXp(userId, 500, `COURSE_CERTIFICATE:${courseId}`);

    return newCert;
  } catch (error: any) {
    console.error("getOrCreateCertificate error:", error);
    return null;
  }
}

export async function verifyCertificate(code: string) {
  try {
    const cert = await db.certificate.findUnique({
      where: { certificateCode: code },
      include: {
        user: {
          select: {
            profile: true,
          },
        },
        course: true,
      },
    });

    if (!cert) return null;

    return {
      certificateCode: cert.certificateCode,
      studentName: cert.user.profile?.name || "Aura Graduate",
      courseTitle: cert.course.title,
      courseDescription: cert.course.description,
      issuedAt: cert.issuedAt,
    };
  } catch (error) {
    console.error("verifyCertificate error:", error);
    return null;
  }
}

// High-fidelity vector SVG builder code running entirely on Edge/Server
export async function generateCertificateSvg(studentName: string, courseTitle: string, certificateCode: string, issuedDate: string) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="100%" height="100%">
      <defs>
        <!-- Gradients -->
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0a0f" />
          <stop offset="50%" stop-color="#0f0e1d" />
          <stop offset="100%" stop-color="#07070b" />
        </linearGradient>
        <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d946ef" stop-opacity="0.8" />
          <stop offset="35%" stop-color="#8b5cf6" stop-opacity="0.4" />
          <stop offset="65%" stop-color="#3b82f6" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.8" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffe259" />
          <stop offset="100%" stop-color="#ffa751" />
        </linearGradient>
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#c084fc" />
          <stop offset="50%" stop-color="#e879f9" />
          <stop offset="100%" stop-color="#60a5fa" />
        </linearGradient>
        
        <!-- Filters -->
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="20" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="subtleGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <!-- Base Canvas Background -->
      <rect width="1000" height="700" fill="url(#bgGrad)" />

      <!-- Glowing Ambient Background Blurs -->
      <circle cx="200" cy="200" r="150" fill="#8b5cf6" opacity="0.12" filter="url(#glow)" />
      <circle cx="800" cy="500" r="180" fill="#d946ef" opacity="0.12" filter="url(#glow)" />
      <circle cx="500" cy="350" r="120" fill="#3b82f6" opacity="0.1" filter="url(#glow)" />

      <!-- Premium Glassmorphism Outer Borders -->
      <rect x="30" y="30" width="940" height="640" rx="20" fill="none" stroke="url(#borderGrad)" stroke-width="2.5" />
      <rect x="45" y="45" width="910" height="610" rx="15" fill="none" stroke="#ffffff" stroke-opacity="0.03" stroke-width="1" />

      <!-- Corner Ornamental Lines -->
      <path d="M 50 80 L 50 50 L 80 50" fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-linecap="round" />
      <path d="M 950 80 L 950 50 L 920 50" fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-linecap="round" />
      <path d="M 50 620 L 50 650 L 80 650" fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-linecap="round" />
      <path d="M 950 620 L 950 650 L 920 650" fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-linecap="round" />

      <!-- AuraAcademy Header Icon & Brand -->
      <g transform="translate(500, 120)" text-anchor="middle">
        <!-- Logo Emblem -->
        <polygon points="0,-35 25,-10 15,25 -15,25 -25,-10" fill="url(#goldGrad)" opacity="0.9" />
        <circle cx="0" cy="2" r="12" fill="#0c0a1c" />
        <polygon points="0,-8 7,5 -7,5" fill="url(#goldGrad)" />
        
        <!-- Platform Name -->
        <text y="65" font-family="'Inter', 'Outfit', 'Segoe UI', sans-serif" font-size="28" font-weight="900" fill="#ffffff" letter-spacing="6" filter="url(#subtleGlow)">AURAACADEMY</text>
        <text y="88" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#8b5cf6" letter-spacing="4">MINDS TRANSFORMED, PATHS ILLUMINATED</text>
      </g>

      <!-- Main Body Text -->
      <g transform="translate(500, 275)" text-anchor="middle">
        <text font-family="'Georgia', serif" font-size="20" font-style="italic" fill="#94a3b8" letter-spacing="1">This certifies that the educational title is awarded to</text>
        
        <!-- Student Name (Vibrant Dynamic Gradient) -->
        <text y="65" font-family="'Inter', 'Outfit', 'Segoe UI', sans-serif" font-size="44" font-weight="800" fill="url(#textGrad)" letter-spacing="2" filter="url(#subtleGlow)">${studentName}</text>
        
        <text y="115" font-family="'Georgia', serif" font-size="18" font-style="italic" fill="#94a3b8">for successfully mastering all lectures, assignments, and test assessments in</text>
        
        <!-- Course Title -->
        <text y="165" font-family="'Inter', 'Outfit', sans-serif" font-size="30" font-weight="700" fill="#ffffff" letter-spacing="1" filter="url(#subtleGlow)">${courseTitle}</text>
      </g>

      <!-- Signature Blocks & Metadata -->
      <g transform="translate(150, 560)">
        <line x1="0" y1="0" x2="200" y2="0" stroke="#475569" stroke-width="1" />
        <text x="100" y="25" text-anchor="middle" font-family="'Inter', sans-serif" font-size="12" font-weight="700" fill="#e2e8f0" letter-spacing="1">AURA BOARD PANEL</text>
        <text x="100" y="42" text-anchor="middle" font-family="'Inter', sans-serif" font-size="10" font-weight="500" fill="#64748b">ACADEMIC COMMITTEE</text>
      </g>

      <!-- Verification Seal Emblem -->
      <g transform="translate(500, 535)">
        <circle cx="0" cy="0" r="42" fill="url(#goldGrad)" opacity="0.15" filter="url(#subtleGlow)" />
        <circle cx="0" cy="0" r="36" fill="url(#bgGrad)" stroke="url(#goldGrad)" stroke-width="1.5" />
        
        <!-- Star ornaments in badge -->
        <path d="M 0 -22 L 6 -6 L 22 -6 L 10 4 L 15 20 L 0 10 L -15 20 L -10 4 L -22 -6 L -6 -6 Z" fill="url(#goldGrad)" transform="scale(0.85)" />
        <text y="24" text-anchor="middle" font-family="'Inter', sans-serif" font-size="9" font-weight="900" fill="#ffffff" letter-spacing="1">VERIFIED</text>
      </g>

      <g transform="translate(850, 560)">
        <line x1="-200" y1="0" x2="0" y2="0" stroke="#475569" stroke-width="1" />
        <text x="-100" y="25" text-anchor="middle" font-family="'Inter', sans-serif" font-size="12" font-weight="700" fill="#e2e8f0" letter-spacing="1">DATE ISSUED</text>
        <text x="-100" y="42" text-anchor="middle" font-family="'Inter', sans-serif" font-size="10" font-weight="500" fill="#64748b">${issuedDate}</text>
      </g>

      <!-- Bottom verification ID and QR Code Block -->
      <g transform="translate(500, 640)" text-anchor="middle">
        <text font-family="'Courier New', Courier, monospace" font-size="11" font-weight="bold" fill="#64748b" letter-spacing="1">VERIFICATION CODE: ${certificateCode}</text>
      </g>
    </svg>
  `;
}
