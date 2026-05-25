"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/services/notificationService";

// ── 1. CREATE CONVERSATION (With DM Deduplication Guards) ──────────────────
export async function createConversation(
  creatorUserId: string,
  params: {
    userIds: string[]; // List of user IDs including the creator
    name?: string;
    isGroup?: boolean;
  }
) {
  try {
    const isGroup = params.isGroup || false;
    const userIds = Array.from(new Set(params.userIds)); // Unique values

    // Authenticity check: Ensure creator is part of the request
    if (!userIds.includes(creatorUserId)) {
      return { success: false, error: "Unauthorized conversation creation parameters." };
    }

    // 1. If it's a Direct Message (isGroup === false)
    if (!isGroup) {
      if (userIds.length !== 2) {
        return { success: false, error: "Direct message conversations require exactly 2 participants." };
      }

      // Check if conversation already exists between these 2 users to prevent duplicates
      const existing = await db.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId: userIds[0] } } },
            { participants: { some: { userId: userIds[1] } } },
          ],
        },
        include: {
          participants: {
            include: {
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
        },
      });

      if (existing) {
        return { success: true, conversation: existing, existing: true };
      }
    }

    // Validate that all participants actually exist in the database
    const validUsersCount = await db.user.count({
      where: { id: { in: userIds } },
    });

    if (validUsersCount !== userIds.length) {
      return { success: false, error: "One or more conversation participants are invalid." };
    }

    // Create the conversation in a transaction
    const conversation = await db.conversation.create({
      data: {
        isGroup,
        name: params.name || null,
        participants: {
          create: userIds.map((uid) => ({ userId: uid })),
        },
      },
      include: {
        participants: {
          include: {
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
      },
    });

    revalidatePath("/messages");

    return { success: true, conversation, existing: false };
  } catch (error: any) {
    console.error("createConversation error:", error);
    return { success: false, error: error.message || "Failed to create conversation." };
  }
}

// ── 2. SEND MESSAGE (With Ownership & Participant Validation) ──────────────
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
) {
  try {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return { success: false, error: "Message content cannot be empty." };
    }

    // 1. Validate that the sender is actually a participant of this conversation
    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId,
        },
      },
    });

    if (!participant) {
      return { success: false, error: "Unauthorized access: You are not a participant in this conversation." };
    }

    // 2. Persist the message record
    const message = await db.message.create({
      data: {
        conversationId,
        senderId,
        content: trimmedContent,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profile: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });

    // 3. Touch updatedAt in Conversation to float it to top of inbox lists
    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // 4. Dispatch DM notification to all other conversation participants (non-sender)
    const allParticipants = await db.conversationParticipant.findMany({
      where: { conversationId, userId: { not: senderId } },
      select: { userId: true },
    });

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { isGroup: true, name: true },
    });

    const senderProfile = await db.profile.findUnique({
      where: { userId: senderId },
      select: { name: true },
    });
    const senderName = senderProfile?.name || "A classmate";

    await Promise.allSettled(
      allParticipants.map((p) =>
        createNotification(p.userId, {
          type: conversation?.isGroup ? "ROOM_MESSAGE" : "DIRECT_MESSAGE",
          title: conversation?.isGroup
            ? `New message in ${conversation.name || "Study Room"}`
            : `${senderName} sent you a message`,
          description: trimmedContent.length > 80 ? trimmedContent.slice(0, 80) + "..." : trimmedContent,
          link: conversation?.isGroup
            ? `/rooms/${conversationId}`
            : `/messages?conversationId=${conversationId}`,
          priority: "NORMAL",
          metadata: { conversationId, senderId, senderName },
        })
      )
    );

    revalidatePath("/messages");

    return { success: true, message };
  } catch (error: any) {
    console.error("sendMessage error:", error);
    return { success: false, error: error.message || "Failed to send message." };
  }
}

// ── 3. GET MESSAGES (With Cursor Pagination Filters) ───────────────────────
export async function getMessages(
  conversationId: string,
  userId: string,
  limit = 50,
  cursor?: string
) {
  try {
    // 1. Verify that the requesting user is a participant of the conversation
    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      return { success: false, error: "Unauthorized access: You are not permitted to view this conversation's history." };
    }

    // 2. Fetch paginated message logs
    const messages = await db.message.findMany({
      where: { conversationId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profile: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });

    // Mark messages sent by others in this conversation as seen
    await db.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        seen: false,
      },
      data: {
        seen: true,
      },
    });

    // Return in chronological order (oldest to newest) for smooth timeline rendering
    return { success: true, messages: messages.reverse() };
  } catch (error: any) {
    console.error("getMessages error:", error);
    return { success: false, error: error.message || "Failed to fetch messages." };
  }
}

// ── 4. GET USER CONVERSATIONS (Eager-Loading Previews & Badges) ─────────────
export async function getUserConversations(userId: string) {
  try {
    // 1. Gather all conversation IDs mapped to this user
    const participations = await db.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    const conversationIds = participations.map((p) => p.conversationId);

    if (conversationIds.length === 0) {
      return { success: true, conversations: [] };
    }

    // 2. Query all matched conversations sorted by latest activity
    const conversations = await db.conversation.findMany({
      where: { id: { in: conversationIds } },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                isOfficialIITM: true,
                profile: {
                  select: {
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Last message only for preview snippets
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                profile: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 3. Calculate unread counts for each conversation
    const mappedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await db.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            seen: false,
          },
        });

        return {
          ...conv,
          unreadCount,
        };
      })
    );

    return { success: true, conversations: mappedConversations };
  } catch (error: any) {
    console.error("getUserConversations error:", error);
    return { success: false, error: error.message || "Failed to fetch user inbox conversations." };
  }
}
