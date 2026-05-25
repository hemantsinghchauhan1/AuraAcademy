"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/services/notificationService";

// ── 1. BOOTSTRAP SUBJECT ROOMS (Auto-provision official subject study hubs) ──
export async function bootstrapSubjectRooms() {
  try {
    const subjects = await db.subject.findMany();
    
    const results = await Promise.all(
      subjects.map(async (subj) => {
        // Look for official SUBJECT type conversation room
        const existing = await db.conversation.findFirst({
          where: {
            isGroup: true,
            roomType: "SUBJECT",
            subjectId: subj.id,
          },
        });

        if (existing) return { subjectId: subj.id, status: "exists" };

        // Create the official class study room
        await db.conversation.create({
          data: {
            isGroup: true,
            name: `${subj.name} Study Hub`,
            roomDescription: subj.description || `Official study and collaboration hub for ${subj.name}.`,
            roomType: "SUBJECT",
            roomAvatar: subj.icon || "📚",
            subjectId: subj.id,
          },
        });

        return { subjectId: subj.id, status: "created" };
      })
    );

    return { success: true, results };
  } catch (error: any) {
    console.error("bootstrapSubjectRooms error:", error);
    return { success: false, error: error.message };
  }
}

// ── 2. GET USER & DISCOVERABLE STUDY ROOMS (With Recommendations Matrix) ──
export async function getRoomsWorkspace(userId: string) {
  try {
    // 1. Proactively bootstrap official subject rooms if missing
    await bootstrapSubjectRooms();

    // 2. Fetch the user's active course selections to build recommendations
    const selectedSubjects = await db.userSelectedSubject.findMany({
      where: { userId },
      select: { subjectId: true },
    });
    const userSubjectIds = new Set(selectedSubjects.map((us) => us.subjectId));

    // 3. Fetch all active study group rooms sorted by activity
    const allRooms = await db.conversation.findMany({
      where: {
        isGroup: true,
        roomType: { in: ["SUBJECT", "PROJECT", "COMMUNITY"] },
      },
      include: {
        participants: {
          select: {
            userId: true,
            role: true,
            user: {
              select: {
                id: true,
                username: true,
                isOfficialIITM: true,
                profile: { select: { name: true, avatarUrl: true } },
              },
            },
          },
        },
        subject: { select: { name: true, code: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const joinedRooms: any[] = [];
    const discoverableRooms: any[] = [];
    const recommendedRooms: any[] = [];

    allRooms.forEach((room) => {
      const isMember = room.participants.some((p) => p.userId === userId);
      const isRecommended = room.subjectId && userSubjectIds.has(room.subjectId);

      const mappedRoom = {
        id: room.id,
        name: room.name || "Study Room",
        description: room.roomDescription || "",
        type: room.roomType || "COMMUNITY",
        avatar: room.roomAvatar || "🏫",
        subjectId: room.subjectId,
        subjectName: room.subject?.name || null,
        subjectCode: room.subject?.code || null,
        memberCount: room.participants.length,
        messagesCount: room._count.messages,
        participants: room.participants,
        isMember,
      };

      if (isMember) {
        joinedRooms.push(mappedRoom);
      } else {
        if (isRecommended) {
          recommendedRooms.push(mappedRoom);
        } else {
          discoverableRooms.push(mappedRoom);
        }
      }
    });

    return {
      success: true,
      joined: joinedRooms,
      recommended: recommendedRooms,
      discoverable: discoverableRooms,
    };
  } catch (error: any) {
    console.error("getRoomsWorkspace error:", error);
    return { success: false, error: error.message };
  }
}

// ── 3. JOIN & LEAVE ACTIVE COLLABORATION ROOMS ───────────────────────────────
export async function joinRoom(userId: string, roomId: string) {
  try {
    // Check if membership already exists to avoid database conflicts
    const existing = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: roomId,
          userId,
        },
      },
    });

    if (existing) {
      return { success: true, alreadyMember: true };
    }

    // Add participant entry
    await db.conversationParticipant.create({
      data: {
        conversationId: roomId,
        userId,
        role: "MEMBER",
      },
    });

    // Touch updated time to sync lists
    await db.conversation.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    revalidatePath("/rooms");

    return { success: true, alreadyMember: false };
  } catch (error: any) {
    console.error("joinRoom error:", error);
    return { success: false, error: error.message };
  }
}

export async function leaveRoom(userId: string, roomId: string) {
  try {
    await db.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId: roomId,
          userId,
        },
      },
    });

    revalidatePath("/rooms");

    return { success: true };
  } catch (error: any) {
    console.error("leaveRoom error:", error);
    return { success: false, error: error.message };
  }
}

// ── 4. CUSTOM GROUP CREATOR ──────────────────────────────────────────────────
export async function createGroupRoom(
  userId: string,
  params: {
    name: string;
    description?: string;
    type: "PROJECT" | "COMMUNITY";
    avatarUrl?: string;
  }
) {
  try {
    const name = params.name.trim();
    if (!name) return { success: false, error: "Room name is required." };

    const conversation = await db.conversation.create({
      data: {
        isGroup: true,
        name,
        roomDescription: params.description?.trim() || "",
        roomType: params.type,
        roomAvatar: params.avatarUrl?.trim() || "🤝",
        ownerId: userId,
        participants: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });

    revalidatePath("/rooms");

    return { success: true, roomId: conversation.id };
  } catch (error: any) {
    console.error("createGroupRoom error:", error);
    return { success: false, error: error.message };
  }
}

// ── 5. PINNED RESOURCES SERVICES (Milestone Resources) ─────────────────────
export async function createPinnedResource(
  userId: string,
  params: {
    roomId: string;
    title: string;
    url?: string;
    description?: string;
    type: string; // "LINK" | "NOTE" | "PYQ" | "ANNOUNCEMENT"
  }
) {
  try {
    const resource = await db.pinnedResource.create({
      data: {
        conversationId: params.roomId,
        title: params.title.trim(),
        url: params.url?.trim() || null,
        description: params.description?.trim() || null,
        type: params.type,
        createdById: userId,
      },
    });

    // Notify all room members about the new pinned material
    const room = await db.conversation.findUnique({
      where: { id: params.roomId },
      select: { name: true, participants: { select: { userId: true } } },
    });

    const creatorProfile = await db.profile.findUnique({
      where: { userId },
      select: { name: true },
    });
    const pinnerName = creatorProfile?.name || "A student";

    await Promise.allSettled(
      (room?.participants || [])
        .filter((p) => p.userId !== userId)
        .map((p) =>
          createNotification(p.userId, {
            type: "ROOM_MESSAGE",
            title: `📌 New material pinned in ${room?.name || "Study Room"}`,
            description: `${pinnerName} pinned "${params.title}" to the knowledge base`,
            link: `/rooms/${params.roomId}`,
            priority: "NORMAL",
            metadata: { roomId: params.roomId },
          })
        )
    );

    return { success: true, resource };
  } catch (error: any) {
    console.error("createPinnedResource error:", error);
    return { success: false, error: error.message };
  }
}

export async function getPinnedResources(roomId: string) {
  try {
    const resources = await db.pinnedResource.findMany({
      where: { conversationId: roomId },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, resources };
  } catch (error: any) {
    console.error("getPinnedResources error:", error);
    return { success: false, error: error.message };
  }
}

// ── 6. REALTIME ROOM POLLS SERVICES ──────────────────────────────────────────
export async function createRoomPoll(
  userId: string,
  params: {
    roomId: string;
    question: string;
    options: string[];
  }
) {
  try {
    const poll = await db.roomPoll.create({
      data: {
        conversationId: params.roomId,
        question: params.question.trim(),
        options: JSON.stringify(params.options),
        createdById: userId,
      },
    });

    // Notify all room members about the new interactive poll
    const room = await db.conversation.findUnique({
      where: { id: params.roomId },
      select: { name: true, participants: { select: { userId: true } } },
    });

    const creatorProfile = await db.profile.findUnique({
      where: { userId },
      select: { name: true },
    });
    const pollCreator = creatorProfile?.name || "A student";

    await Promise.allSettled(
      (room?.participants || [])
        .filter((p) => p.userId !== userId)
        .map((p) =>
          createNotification(p.userId, {
            type: "POLL_CREATED",
            title: `📊 New poll in ${room?.name || "Study Room"}`,
            description: `${pollCreator} launched a poll: "${params.question}"`,
            link: `/rooms/${params.roomId}`,
            priority: "NORMAL",
            metadata: { roomId: params.roomId },
          })
        )
    );

    return { success: true, poll };
  } catch (error: any) {
    console.error("createRoomPoll error:", error);
    return { success: false, error: error.message };
  }
}

export async function voteRoomPoll(
  userId: string,
  pollId: string,
  optionIndex: number
) {
  try {
    // Upsert the vote (User can only cast one vote per poll)
    const vote = await db.roomPollVote.upsert({
      where: {
        pollId_userId: {
          pollId,
          userId,
        },
      },
      update: {
        optionIndex,
      },
      create: {
        pollId,
        userId,
        optionIndex,
      },
    });

    return { success: true, vote };
  } catch (error: any) {
    console.error("voteRoomPoll error:", error);
    return { success: false, error: error.message };
  }
}

export async function getRoomPolls(roomId: string) {
  try {
    const polls = await db.roomPoll.findMany({
      where: { conversationId: roomId },
      include: {
        votes: {
          select: {
            userId: true,
            optionIndex: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const parsedPolls = polls.map((p) => ({
      id: p.id,
      question: p.question,
      options: JSON.parse(p.options) as string[],
      votes: p.votes,
      createdById: p.createdById,
      createdAt: p.createdAt,
    }));

    return { success: true, polls: parsedPolls };
  } catch (error: any) {
    console.error("getRoomPolls error:", error);
    return { success: false, error: error.message };
  }
}

// ── 7. SCHEDULED STUDY SESSIONS SERVICES ─────────────────────────────────────
export async function createStudySession(
  userId: string,
  params: {
    roomId: string;
    title: string;
    description?: string;
    startTime: string | Date;
    endTime: string | Date;
  }
) {
  try {
    const session = await db.studySession.create({
      data: {
        conversationId: params.roomId,
        title: params.title.trim(),
        description: params.description?.trim() || null,
        startTime: new Date(params.startTime),
        endTime: new Date(params.endTime),
        createdById: userId,
      },
    });

    // Notify all room members about the scheduled study session with IMPORTANT priority
    const room = await db.conversation.findUnique({
      where: { id: params.roomId },
      select: { name: true, participants: { select: { userId: true } } },
    });

    const creatorProfile = await db.profile.findUnique({
      where: { userId },
      select: { name: true },
    });
    const organizerName = creatorProfile?.name || "A student";
    const sessionStart = new Date(params.startTime);
    const formattedStart = sessionStart.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    await Promise.allSettled(
      (room?.participants || [])
        .filter((p) => p.userId !== userId)
        .map((p) =>
          createNotification(p.userId, {
            type: "STUDY_SESSION",
            title: `📅 Study session scheduled in ${room?.name || "Study Room"}`,
            description: `${organizerName} scheduled "${params.title}" on ${formattedStart}`,
            link: `/rooms/${params.roomId}`,
            priority: "IMPORTANT",
            metadata: { roomId: params.roomId, sessionId: session.id },
          })
        )
    );

    return { success: true, session };
  } catch (error: any) {
    console.error("createStudySession error:", error);
    return { success: false, error: error.message };
  }
}

export async function getStudySessions(roomId: string) {
  try {
    const sessions = await db.studySession.findMany({
      where: {
        conversationId: roomId,
        endTime: { gte: new Date() }, // Active or future sessions
      },
      orderBy: { startTime: "asc" },
    });
    return { success: true, sessions };
  } catch (error: any) {
    console.error("getStudySessions error:", error);
    return { success: false, error: error.message };
  }
}
