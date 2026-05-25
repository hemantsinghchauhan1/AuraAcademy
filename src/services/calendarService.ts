"use server";

import { db } from "@/lib/db";
import { EventType } from "@prisma/client";

// Dynamic calendar seeder for active subjects
export async function ensureSeedAcademicEvents() {
  try {
    const eventCount = await db.academicEvent.count();
    if (eventCount > 0) return; // Already seeded

    console.log("🌱 Seeding Master IITM Academic Events schedule...");

    const subjects = await db.subject.findMany();
    if (subjects.length === 0) return;

    const events = [];
    const today = new Date();

    for (const sub of subjects) {
      // 1. Live Class (Today at 10:00 AM)
      const liveStart = new Date(today);
      liveStart.setHours(10, 0, 0, 0);
      const liveEnd = new Date(today);
      liveEnd.setHours(11, 30, 0, 0);

      // 2. Assignment Deadline (Today at 4:00 PM)
      const assignStart = new Date(today);
      assignStart.setHours(16, 0, 0, 0);
      const assignEnd = new Date(today);
      assignEnd.setHours(17, 0, 0, 0);

      // 3. Quiz Timeline (Tomorrow at 2:00 PM)
      const quizStart = new Date(today);
      quizStart.setDate(today.getDate() + 1);
      quizStart.setHours(14, 0, 0, 0);
      const quizEnd = new Date(today);
      quizEnd.setDate(today.getDate() + 1);
      quizEnd.setHours(15, 0, 0, 0);

      // 4. Endterm Exam (Next week at 9:00 AM)
      const examStart = new Date(today);
      examStart.setDate(today.getDate() + 7);
      examStart.setHours(9, 0, 0, 0);
      const examEnd = new Date(today);
      examEnd.setDate(today.getDate() + 7);
      examEnd.setHours(12, 0, 0, 0);

      events.push(
        {
          title: `${sub.code} — Live Interaction Session`,
          description: `Interactive online meeting with instructors discussing midterm syllabus revisions and problem solving.`,
          subjectId: sub.id,
          startTime: liveStart,
          endTime: liveEnd,
          eventType: "LIVE_CLASS" as const,
          priority: "HIGH",
        },
        {
          title: `${sub.code} — Assignment Dropbox Deadline`,
          description: `Submit your completed module practice exercises into the task evaluator dropbox.`,
          subjectId: sub.id,
          startTime: assignStart,
          endTime: assignEnd,
          eventType: "ASSIGNMENT" as const,
          priority: "HIGH",
        },
        {
          title: `${sub.code} — Graded Quiz Assessment`,
          description: `Solve timed practice questions inside the workspace quiz engine. High-speed accuracy counts.`,
          subjectId: sub.id,
          startTime: quizStart,
          endTime: quizEnd,
          eventType: "QUIZ" as const,
          priority: "MEDIUM",
        },
        {
          title: `${sub.code} — Endterm Examination`,
          description: `Official final assessment covering all modular lectures and graded homework.`,
          subjectId: sub.id,
          startTime: examStart,
          endTime: examEnd,
          eventType: "EXAM" as const,
          priority: "HIGH",
        },
        {
          title: `${sub.code} — Important Academic Notice`,
          description: `Vercel edge updates from IITM administrators regarding online exam slots and centre scheduling.`,
          subjectId: sub.id,
          startTime: today,
          endTime: today,
          eventType: "NOTICE" as const,
          priority: "LOW",
        }
      );
    }

    await db.academicEvent.createMany({ data: events });
    console.log(`✅ Seeded ${events.length} Master AcademicEvents successfully.`);
  } catch (error) {
    console.error("ensureSeedAcademicEvents error:", error);
  }
}

// Fetch calendar events filtered strictly to selected subjects
export async function getAcademicCalendar(userId: string) {
  try {
    await ensureSeedAcademicEvents();

    // Find user's active selected subjects
    const selected = await db.userSelectedSubject.findMany({
      where: { userId },
      select: { subjectId: true }
    });

    const activeSubjectIds = selected.map((s) => s.subjectId);

    if (activeSubjectIds.length === 0) return [];

    // Query events
    return db.academicEvent.findMany({
      where: {
        subjectId: { in: activeSubjectIds }
      },
      include: {
        subject: {
          select: {
            code: true,
            name: true,
            icon: true,
          }
        }
      },
      orderBy: {
        startTime: "asc"
      }
    });
  } catch (error) {
    console.error("getAcademicCalendar error:", error);
    return [];
  }
}

// Fetch today's classes
export async function getTodayClasses(userId: string) {
  try {
    await ensureSeedAcademicEvents();

    const selected = await db.userSelectedSubject.findMany({
      where: { userId },
      select: { subjectId: true }
    });

    const activeSubjectIds = selected.map((s) => s.subjectId);

    if (activeSubjectIds.length === 0) return [];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return db.academicEvent.findMany({
      where: {
        subjectId: { in: activeSubjectIds },
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        }
      },
      include: {
        subject: {
          select: {
            code: true,
            name: true,
            icon: true,
          }
        }
      },
      orderBy: {
        startTime: "asc"
      }
    });
  } catch (error) {
    console.error("getTodayClasses error:", error);
    return [];
  }
}

// Compile GitHub-style study consistency heatmap from XP logs
export async function getActivityHeatmap(userId: string) {
  try {
    const logs = await db.xPLog.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" }
    });

    // Compile date counts map: "YYYY-MM-DD" -> count of logs
    const heatmap: Record<string, number> = {};

    for (const log of logs) {
      const dateStr = new Date(log.createdAt).toISOString().split("T")[0];
      if (dateStr) {
        heatmap[dateStr] = (heatmap[dateStr] || 0) + 1;
      }
    }

    return heatmap;
  } catch (error) {
    console.error("getActivityHeatmap error:", error);
    return {};
  }
}
