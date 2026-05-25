import { NextResponse } from "next/server";
import { ensureDbUser } from "@/lib/auth";
import { generateAiResponse, getAiConversation, saveAiMessage, clearAiConversation } from "@/services/aiService";
import { aggregateStudentContext } from "@/services/promptEngine";
import { generateStudyPlan } from "@/services/studyPlanner";
import { db } from "@/lib/db";

// Basic hourly rate limiting map (userId -> { count: number, resetTime: number })
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const limit = 30; // Max 30 messages per hour
  const windowMs = 60 * 60 * 1000;

  const data = rateLimitMap.get(userId);
  if (!data) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (now > data.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (data.count >= limit) {
    return true;
  }

  data.count++;
  return false;
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const dbUser = await ensureDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { action, prompt } = await req.json();

    // 2. Route actions
    if (action === "clear") {
      await clearAiConversation(dbUser.id);
      return NextResponse.json({ success: true, message: "Chat history cleared." });
    }

    if (action === "generatePlan") {
      const planRes = await generateStudyPlan(dbUser.id);
      return NextResponse.json(planRes);
    }

    // 3. Regular Chat query
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt string is required" }, { status: 400 });
    }

    // Rate limiting check
    if (isRateLimited(dbUser.id)) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down and try again in an hour." },
        { status: 429 }
      );
    }

    // Save user's question first
    await saveAiMessage(dbUser.id, "user", prompt);

    // Fetch conversation context and system metrics
    const studentContext = await aggregateStudentContext(dbUser.id);
    const recentHistory = await getAiConversation(dbUser.id);

    // Map history for system injection
    const formattedHistory = recentHistory
      .slice(0, 10)
      .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join("\n");

    const systemContext = `
Student Academic Context:
${studentContext}

Recent Conversation History:
${formattedHistory || "None"}
`;

    // Generate AI response
    const aiRes = await generateAiResponse(dbUser.id, prompt, {
      systemContext,
      bypassCache: true // User chat should be dynamic
    });

    if (!aiRes.success) {
      return NextResponse.json({ error: aiRes.text }, { status: 400 });
    }

    // Save AI reply to history
    await saveAiMessage(dbUser.id, "assistant", aiRes.text);

    return NextResponse.json({
      success: true,
      text: aiRes.text,
      source: aiRes.source
    });
  } catch (error: any) {
    console.error("AI Chat API error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const dbUser = await ensureDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const messages = await getAiConversation(dbUser.id);
    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    console.error("AI Chat GET API error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
