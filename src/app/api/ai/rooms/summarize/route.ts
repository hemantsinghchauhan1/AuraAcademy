import { NextResponse } from "next/server";
import { ensureDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateAiResponse } from "@/services/aiService";

export async function POST(req: Request) {
  try {
    const dbUser = await ensureDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { roomId, forceRefresh } = await req.json();

    if (!roomId) {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
    }

    // 1. Verify user is in study room
    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: roomId,
          userId: dbUser.id
        }
      }
    });

    if (!participant) {
      return NextResponse.json({ error: "Access denied. You are not a member of this study room." }, { status: 403 });
    }

    // 2. Cache Check (if forceRefresh is false)
    if (!forceRefresh) {
      const cached = await db.aiSummary.findUnique({
        where: { conversationId: roomId }
      });

      // If cached less than 15 minutes ago, return cache
      if (cached && (Date.now() - new Date(cached.updatedAt).getTime() < 15 * 60 * 1000)) {
        return NextResponse.json({
          success: true,
          content: cached.content,
          keyTakeaways: JSON.parse(cached.keyTakeaways),
          updatedAt: cached.updatedAt
        });
      }
    }

    // 3. Fetch last 50 messages
    const messages = await db.message.findMany({
      where: { conversationId: roomId },
      take: 50,
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          include: { profile: true }
        }
      }
    });

    const room = await db.conversation.findUnique({
      where: { id: roomId },
      select: { name: true }
    });

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        content: `### 📚 AI Discussion Summary: ${room?.name || "Study Room"}\n\nThere are no chat messages in this study room yet. Start discussing chapters or pin materials to trigger AI summaries!`,
        keyTakeaways: ["No discussion active yet"],
        updatedAt: new Date()
      });
    }

    // 4. Format chat history
    const transcript = messages
      .map((m) => `${m.sender.profile?.name || "Student"}: ${m.content}`)
      .join("\n");

    const prompt = `
The following is a chat log transcript from the study room "${room?.name || "Study Hub"}":

${transcript}

Task:
1. Provide an executive summary of the topics discussed.
2. Formulate 3-5 clear key academic takeaways.
3. List any formulas, definitions, code blocks, or links shared.
4. Format the final output strictly in markdown.
`;

    // 5. Query AI Tutor Engine
    const aiRes = await generateAiResponse(dbUser.id, prompt, {
      systemContext: "You are an AI Academic Summarizer for study rooms. Capture academic topics, code snippets, and study materials cleanly.",
      bypassCache: true
    });

    if (!aiRes.success) {
      return NextResponse.json({ error: aiRes.text }, { status: 400 });
    }

    // 6. Extrapolate structured takeaways (look for bullet lists or generate dummy ones if unavailable)
    const takeaways: string[] = [];
    const lines = aiRes.text.split("\n");
    for (const line of lines) {
      const cleaned = line.trim();
      if (cleaned.startsWith("-") || cleaned.startsWith("*")) {
        const item = cleaned.slice(1).trim();
        if (item.length > 5 && takeaways.length < 5) {
          takeaways.push(item);
        }
      }
    }

    if (takeaways.length === 0) {
      takeaways.push("Reviewed current curriculum chapters");
      takeaways.push("Discussed peer problem sets");
      takeaways.push("Pinned syllabus resource materials");
    }

    // 7. Write to database
    const summary = await db.aiSummary.upsert({
      where: { conversationId: roomId },
      update: {
        content: aiRes.text,
        keyTakeaways: JSON.stringify(takeaways),
        updatedAt: new Date()
      },
      create: {
        conversationId: roomId,
        content: aiRes.text,
        keyTakeaways: JSON.stringify(takeaways)
      }
    });

    return NextResponse.json({
      success: true,
      content: summary.content,
      keyTakeaways: takeaways,
      updatedAt: summary.updatedAt
    });
  } catch (error: any) {
    console.error("AI Room Summarize error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
