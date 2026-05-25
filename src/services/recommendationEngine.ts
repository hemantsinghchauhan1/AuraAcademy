import { db } from "@/lib/db";

export interface RecommendationCard {
  id: string;
  type: "QUIZ" | "SESSION" | "PYQ" | "ROOM";
  title: string;
  description: string;
  itemId: string | null;
  reason: string;
}

/**
 * Computes customized study recommendations based on student performance,
 * weak areas, upcoming deadlines, and study streaks.
 */
export async function computeAiRecommendations(userId: string): Promise<RecommendationCard[]> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        selectedSubjects: { include: { subject: true } },
        analytics: true,
      },
    });

    if (!user) return [];

    const selectedSubjectIds = user.selectedSubjects.map((s) => s.subjectId);
    const selectedSubjectNames = user.selectedSubjects.map((s) => s.subject.name);

    const recommendations: Omit<RecommendationCard, "id">[] = [];

    // 1. Check Weak Topics Accuracy (below 70%) -> Recommend Quizzes
    let weakTopicsList: any[] = [];
    if (user.analytics?.weakTopics) {
      try {
        weakTopicsList = JSON.parse(user.analytics.weakTopics);
      } catch (e) {
        weakTopicsList = [];
      }
    }

    const weakSubjectNames = weakTopicsList
      .filter((wt) => wt.accuracy < 70)
      .map((wt) => wt.topic);

    if (weakSubjectNames.length > 0) {
      // Find quizzes matching weak subjects
      const weakQuizzes = await db.quiz.findMany({
        where: {
          subject: { name: { in: weakSubjectNames } },
        },
        include: { subject: true },
        take: 2,
      });

      for (const quiz of weakQuizzes) {
        const accuracy = weakTopicsList.find((wt) => wt.topic === quiz.subject.name)?.accuracy || 60;
        recommendations.push({
          type: "QUIZ",
          title: `📝 Improve ${quiz.subject.name}: Solve "${quiz.title}"`,
          description: `You have ${accuracy}% accuracy in this topic. Solving this quiz will help close understanding gaps.`,
          itemId: quiz.id,
          reason: `Targeted practice for weak topic ${quiz.subject.name}`,
        });
      }
    }

    // 2. Check Streak Gaps -> Recommend joining Study Rooms
    const streak = user.profile?.streak || 0;
    if (streak === 0 && selectedSubjectIds.length > 0) {
      const activeRooms = await db.conversation.findMany({
        where: {
          isGroup: true,
          subjectId: { in: selectedSubjectIds },
        },
        take: 1,
      });

      for (const room of activeRooms) {
        recommendations.push({
          type: "ROOM",
          title: `💬 Restart Your Streak: Chat in ${room.name || "Study Room"}`,
          description: `You have 0 active streak days. Say hi to your peers in the study hub to rebuild your study habit streak!`,
          itemId: room.id,
          reason: "Streak builder helper recommendation",
        });
      }
    }

    // 3. Check Upcoming Calendar Deadlines -> Recommend Pinned Materials / PYQs
    const upcomingEvents = await db.academicEvent.findMany({
      where: {
        subjectId: { in: selectedSubjectIds },
        startTime: { gte: new Date() },
      },
      orderBy: { startTime: "asc" },
      take: 2,
    });

    for (const event of upcomingEvents) {
      // Find pinned resources or upload materials related to the subject
      const materials = await db.pinnedResource.findMany({
        where: {
          conversation: { subjectId: event.subjectId },
          type: "PYQ",
        },
        take: 1,
      });

      if (materials.length > 0) {
        recommendations.push({
          type: "PYQ",
          title: `📂 Study for ${event.title}: Review PYQs`,
          description: `A syllabus event is scheduled soon. Practice with the pinned resource "${materials[0].title}" in your room.`,
          itemId: materials[0].conversationId,
          reason: `Exam prep support for upcoming ${event.eventType}`,
        });
      }
    }

    // 4. Upcoming Live Study Sessions -> Recommend Scheduled sessions
    const upcomingSessions = await db.studySession.findMany({
      where: {
        conversation: { subjectId: { in: selectedSubjectIds } },
        startTime: { gte: new Date() },
      },
      include: { conversation: true },
      orderBy: { startTime: "asc" },
      take: 1,
    });

    for (const session of upcomingSessions) {
      recommendations.push({
        type: "SESSION",
        title: `📅 Attend Session: "${session.title}"`,
        description: `Join classmates at ${session.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} in the "${session.conversation.name}" study room.`,
        itemId: session.conversationId,
        reason: "Active peer group study event scheduled",
      });
    }

    // Fallback: If no custom metrics generated, give default subject room recommendations
    if (recommendations.length === 0 && selectedSubjectIds.length > 0) {
      const generalRooms = await db.conversation.findMany({
        where: { isGroup: true, subjectId: { in: selectedSubjectIds } },
        take: 2,
      });

      for (const room of generalRooms) {
        recommendations.push({
          type: "ROOM",
          title: `📚 Explore Workspace: ${room.name}`,
          description: `Participate in active classrooms and coordinate peer study plans.`,
          itemId: room.id,
          reason: "Subject hub dashboard discovery",
        });
      }
    }

    // Convert into persistent AiRecommendation records
    // Clear previous un-dismissed recommendations
    await db.aiRecommendation.deleteMany({
      where: { userId, isDismissed: false },
    });

    const created = await Promise.all(
      recommendations.map((rec) =>
        db.aiRecommendation.create({
          data: {
            userId,
            type: rec.type,
            title: rec.title,
            description: rec.description,
            itemId: rec.itemId,
            reason: rec.reason,
          },
        })
      )
    );

    return created.map((item) => ({
      id: item.id,
      type: item.type as "QUIZ" | "SESSION" | "PYQ" | "ROOM",
      title: item.title,
      description: item.description,
      itemId: item.itemId,
      reason: item.reason,
    }));
  } catch (error) {
    console.error("computeAiRecommendations error:", error);
    return [];
  }
}

/**
 * Retrieves cached recommendations, computing new ones if empty.
 */
export async function getAiRecommendations(userId: string): Promise<RecommendationCard[]> {
  try {
    const list = await db.aiRecommendation.findMany({
      where: { userId, isDismissed: false },
      orderBy: { createdAt: "desc" },
    });

    if (list.length === 0) {
      return await computeAiRecommendations(userId);
    }

    return list.map((item) => ({
      id: item.id,
      type: item.type as "QUIZ" | "SESSION" | "PYQ" | "ROOM",
      title: item.title,
      description: item.description,
      itemId: item.itemId,
      reason: item.reason,
    }));
  } catch (error) {
    console.error("getAiRecommendations error:", error);
    return [];
  }
}

/**
 * Dismisses a recommendation card
 */
export async function dismissAiRecommendation(userId: string, recommendationId: string) {
  try {
    await db.aiRecommendation.updateMany({
      where: { id: recommendationId, userId },
      data: { isDismissed: true },
    });
    return { success: true };
  } catch (error: any) {
    console.error("dismissAiRecommendation error:", error);
    return { success: false, error: error.message };
  }
}
