"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { NotificationType, NotificationPriority } from "@prisma/client";

// ── Helper: Provision Notification Preference if missing ──
async function getOrProvisionPreference(userId: string) {
  let pref = await db.notificationPreference.findUnique({
    where: { userId },
  });

  if (!pref) {
    pref = await db.notificationPreference.create({
      data: {
        userId,
        muteDMs: false,
        muteRoomMessages: false,
        muteSocialAlerts: false,
        muteLeaderboardUpdates: false,
        muteReminders: false,
        mutedRoomIds: "[]",
      },
    });
  }

  return pref;
}

// ── 1. CREATE CENTRALIZED NOTIFICATION ──
export async function createNotification(
  userId: string,
  params: {
    type: NotificationType;
    title: string;
    description: string;
    link?: string;
    priority?: NotificationPriority;
    metadata?: Record<string, any>;
  }
) {
  try {
    const preference = await getOrProvisionPreference(userId);
    const priority = params.priority || "NORMAL";

    // A. Verify mute filters based on types
    if (params.type === "DIRECT_MESSAGE" && preference.muteDMs) {
      return { success: false, reason: "Direct messages are muted" };
    }

    if (params.type === "ROOM_MESSAGE" && preference.muteRoomMessages) {
      // Mentions override general room muting as they are high importance
      if (priority !== "CRITICAL") {
        return { success: false, reason: "Room messages are muted" };
      }
    }

    if (params.type === "ACHIEVEMENT_UNLOCK" && preference.muteSocialAlerts) {
      return { success: false, reason: "Social notifications are muted" };
    }

    if (params.type === "LEADERBOARD_UPDATE" && preference.muteLeaderboardUpdates) {
      return { success: false, reason: "Leaderboard alerts are muted" };
    }

    if (
      (params.type === "ASSIGNMENT_DEADLINE" || 
       params.type === "QUIZ_REMINDER" || 
       params.type === "STUDY_SESSION") && 
      preference.muteReminders
    ) {
      return { success: false, reason: "Academic reminders are muted" };
    }

    // B. Check specific Room Mutes
    if (params.metadata?.roomId) {
      try {
        const mutedRooms: string[] = JSON.parse(preference.mutedRoomIds || "[]");
        if (mutedRooms.includes(params.metadata.roomId) && priority !== "CRITICAL") {
          return { success: false, reason: "This specific room is muted" };
        }
      } catch (e) {
        console.error("Failed to parse muted rooms array:", e);
      }
    }

    // C. Write to Database
    const notification = await db.notification.create({
      data: {
        userId,
        type: params.type,
        title: params.title,
        description: params.description,
        link: params.link || null,
        priority,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });

    revalidatePath("/notifications");

    return { success: true, notification };
  } catch (error: any) {
    console.error("createNotification error:", error);
    return { success: false, error: error.message };
  }
}

// ── 2. GET USER TIMELINE NOTIFICATIONS ──
export async function getNotificationsWorkspace(userId: string, limit = 50) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId },
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.notification.count({
        where: { userId, read: false },
      }),
    ]);

    const parsedNotifications = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      description: n.description,
      link: n.link,
      read: n.read,
      priority: n.priority,
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
      createdAt: n.createdAt,
    }));

    return {
      success: true,
      notifications: parsedNotifications,
      unreadCount,
    };
  } catch (error: any) {
    console.error("getNotificationsWorkspace error:", error);
    return { success: false, error: error.message };
  }
}

// ── 3. MARK NOTIFICATION AS READ ──
export async function markAsRead(userId: string, notificationId: string) {
  try {
    await db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });

    const newUnreadCount = await db.notification.count({
      where: { userId, read: false },
    });

    revalidatePath("/notifications");

    return { success: true, unreadCount: newUnreadCount };
  } catch (error: any) {
    console.error("markAsRead error:", error);
    return { success: false, error: error.message };
  }
}

export async function markAllAsRead(userId: string) {
  try {
    await db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    revalidatePath("/notifications");

    return { success: true, unreadCount: 0 };
  } catch (error: any) {
    console.error("markAllAsRead error:", error);
    return { success: false, error: error.message };
  }
}

// ── 4. NOTIFICATION PREFERENCES ──
export async function getNotificationPreferences(userId: string) {
  try {
    const preferences = await getOrProvisionPreference(userId);
    return { success: true, preferences };
  } catch (error: any) {
    console.error("getNotificationPreferences error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateNotificationPreferences(
  userId: string,
  params: {
    muteDMs?: boolean;
    muteRoomMessages?: boolean;
    muteSocialAlerts?: boolean;
    muteLeaderboardUpdates?: boolean;
    muteReminders?: boolean;
  }
) {
  try {
    const preferences = await db.notificationPreference.update({
      where: { userId },
      data: params,
    });

    return { success: true, preferences };
  } catch (error: any) {
    console.error("updateNotificationPreferences error:", error);
    return { success: false, error: error.message };
  }
}

// ── 5. ROOM MUTING SYSTEM ──
export async function muteRoom(userId: string, roomId: string) {
  try {
    const pref = await getOrProvisionPreference(userId);
    let mutedList: string[] = [];
    try {
      mutedList = JSON.parse(pref.mutedRoomIds || "[]");
    } catch (e) {
      mutedList = [];
    }

    if (!mutedList.includes(roomId)) {
      mutedList.push(roomId);
    }

    const updated = await db.notificationPreference.update({
      where: { userId },
      data: {
        mutedRoomIds: JSON.stringify(mutedList),
      },
    });

    return { success: true, mutedRoomIds: mutedList };
  } catch (error: any) {
    console.error("muteRoom error:", error);
    return { success: false, error: error.message };
  }
}

export async function unmuteRoom(userId: string, roomId: string) {
  try {
    const pref = await getOrProvisionPreference(userId);
    let mutedList: string[] = [];
    try {
      mutedList = JSON.parse(pref.mutedRoomIds || "[]");
    } catch (e) {
      mutedList = [];
    }

    mutedList = mutedList.filter((id) => id !== roomId);

    await db.notificationPreference.update({
      where: { userId },
      data: {
        mutedRoomIds: JSON.stringify(mutedList),
      },
    });

    return { success: true, mutedRoomIds: mutedList };
  } catch (error: any) {
    console.error("unmuteRoom error:", error);
    return { success: false, error: error.message };
  }
}

// ── 6. ACADEMIC REMINDERS AGGREGATOR ENGINE ──
export async function getAcademicReminders(userId: string) {
  try {
    // 1. Fetch user's selected subjects to find relevant events
    const selectedSubjects = await db.userSelectedSubject.findMany({
      where: { userId },
      select: { subjectId: true },
    });
    const subjectIds = selectedSubjects.map((s) => s.subjectId);

    // 2. Fetch upcoming general academic events (quizzes, assignments, exams)
    const upcomingEvents = await db.academicEvent.findMany({
      where: {
        subjectId: { in: subjectIds },
        startTime: { gte: new Date() },
      },
      include: {
        subject: { select: { name: true, code: true } },
      },
      orderBy: { startTime: "asc" },
      take: 5,
    });

    // 3. Fetch active study sessions for rooms the user has joined
    const joinedRoomParticipants = await db.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    const joinedRoomIds = joinedRoomParticipants.map((p) => p.conversationId);

    const upcomingSessions = await db.studySession.findMany({
      where: {
        conversationId: { in: joinedRoomIds },
        startTime: { gte: new Date() },
      },
      include: {
        conversation: { select: { name: true, roomAvatar: true } },
      },
      orderBy: { startTime: "asc" },
      take: 5,
    });

    // 4. Map them into a unified structured timeline card model
    const reminders = [
      ...upcomingEvents.map((e) => ({
        id: e.id,
        type: "EVENT" as const,
        category: e.eventType, // "QUIZ" | "ASSIGNMENT" | "EXAM" etc
        title: e.title,
        description: e.description,
        time: e.startTime,
        subjectName: e.subject.name,
        subjectCode: e.subject.code,
        priority: e.priority, // "HIGH" | "MEDIUM" | "LOW"
      })),
      ...upcomingSessions.map((s) => ({
        id: s.id,
        type: "STUDY_SESSION" as const,
        category: "STUDY_SESSION",
        title: s.title,
        description: s.description || "Classroom group discussion session",
        time: s.startTime,
        roomName: s.conversation.name || "Study Room",
        roomAvatar: s.conversation.roomAvatar || "🏫",
        priority: "MEDIUM",
      })),
    ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return { success: true, reminders };
  } catch (error: any) {
    console.error("getAcademicReminders error:", error);
    return { success: false, error: error.message };
  }
}
