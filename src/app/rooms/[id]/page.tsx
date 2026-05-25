import { ensureDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getMessages } from "@/services/chatService";
import { 
  joinRoom, 
  getPinnedResources, 
  getRoomPolls, 
  getStudySessions 
} from "@/services/roomService";
import RoomChatClient from "./RoomChatClient";
import React from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RoomPageProps {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id: roomId } = await params;

  // 1. Ensure Clerk authentication & DB profile
  const user = await ensureDbUser();
  if (!user) {
    redirect("/sign-in");
  }

  // 2. Enforce onboarding completion
  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  // 3. Fetch active conversation details
  let conversation = await db.conversation.findUnique({
    where: { id: roomId },
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
                  xp: true,
                  streak: true,
                },
              },
            },
          },
        },
      },
      subject: {
        select: {
          name: true,
          code: true,
        },
      },
    },
  });

  if (!conversation || !conversation.isGroup) {
    redirect("/rooms");
  }

  // 4. Verify participant status or auto-join public study rooms
  const isParticipant = conversation.participants.some(
    (p) => p.userId === user.id
  );

  if (!isParticipant) {
    if (conversation.roomType !== "PRIVATE_GROUP") {
      const joinRes = await joinRoom(user.id, roomId);
      if (!joinRes.success) {
        redirect("/rooms");
      }
      
      // Re-fetch conversation data after joining
      conversation = await db.conversation.findUnique({
        where: { id: roomId },
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
                      xp: true,
                      streak: true,
                    },
                  },
                },
              },
            },
          },
          subject: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      });
    } else {
      redirect("/rooms");
    }
  }

  if (!conversation) {
    redirect("/rooms");
  }

  // 5. Fetch resources, polls, and study sessions in parallel
  const [messagesRes, pinsRes, pollsRes, sessionsRes] = await Promise.all([
    getMessages(roomId, user.id, 50),
    getPinnedResources(roomId),
    getRoomPolls(roomId),
    getStudySessions(roomId),
  ]);

  const initialMessages = messagesRes.success ? messagesRes.messages || [] : [];
  const pinnedResources = pinsRes.success ? pinsRes.resources || [] : [];
  const roomPolls = pollsRes.success ? pollsRes.polls || [] : [];
  const studySessions = sessionsRes.success ? sessionsRes.sessions || [] : [];

  return (
    <div className="min-h-screen bg-[#040406]">
      <RoomChatClient
        currentUser={{
          id: user.id,
          email: user.email,
          role: user.role,
          name: (user as any).profile?.name || "Student",
          avatarUrl: (user as any).profile?.avatarUrl || null,
          isOfficialIITM: user.isOfficialIITM,
        }}
        roomDetails={{
          id: conversation.id,
          name: conversation.name || "Study Room",
          description: conversation.roomDescription || "",
          type: conversation.roomType || "COMMUNITY",
          avatar: conversation.roomAvatar || "📚",
          ownerId: conversation.ownerId || null,
          subjectName: conversation.subject?.name || null,
          subjectCode: conversation.subject?.code || null,
        }}
        participants={conversation.participants.map((p) => ({
          userId: p.userId,
          role: p.role,
          username: p.user.username || "student",
          name: p.user.profile?.name || "Student",
          avatarUrl: p.user.profile?.avatarUrl || null,
          isOfficialIITM: p.user.isOfficialIITM,
          xp: p.user.profile?.xp || 0,
          streak: p.user.profile?.streak || 0,
        }))}
        initialMessages={initialMessages}
        initialPins={pinnedResources}
        initialPolls={roomPolls}
        initialSessions={studySessions}
      />
    </div>
  );
}
