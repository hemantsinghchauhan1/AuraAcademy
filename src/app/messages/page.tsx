import { ensureDbUser } from "@/lib/auth";
import { getUserConversations, getMessages } from "@/services/chatService";
import { redirect } from "next/navigation";
import MessagesClient from "./MessagesClient";
import React from "react";

export const dynamic = "force-dynamic"; // Always server-render
export const revalidate = 0; // Live updates — no caching

interface MessagesPageProps {
  searchParams: Promise<{ conversationId?: string }>;
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  // Ensure Clerk auth & Prisma record
  const user = await ensureDbUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Enforce onboarding gate redirect
  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  const { conversationId } = await searchParams;

  // Parallel fetch: user conversations + messages if active conversationId is provided
  const conversationsPromise = getUserConversations(user.id);
  
  const messagesPromise = conversationId 
    ? getMessages(conversationId, user.id)
    : Promise.resolve({ success: true, messages: [] });

  const [convsRes, msgsRes] = await Promise.all([
    conversationsPromise,
    messagesPromise
  ]);

  const conversations = convsRes.success ? (convsRes.conversations as any[]) : [];
  const initialMessages = msgsRes.success ? (msgsRes.messages as any[]) : [];

  return (
    <div className="min-h-screen bg-[#040406]">
      <MessagesClient
        currentUser={{
          id: user.id,
          email: user.email,
          role: user.role,
          name: (user as any).profile?.name || "Student",
          avatarUrl: (user as any).profile?.avatarUrl || null,
          isOfficialIITM: user.isOfficialIITM,
        }}
        initialConversations={conversations}
        initialConversationId={conversationId || null}
        initialMessages={initialMessages}
      />
    </div>
  );
}
