import { getDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/ai-ingestion/[id]
 * Retrieves details for a specific ingestion job. Admin only.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getDbUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = await params;
    const job = await db.ingestionJob.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error("GET /api/admin/ai-ingestion/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/ai-ingestion/[id]
 * Updates the draft quiz content of an ingestion job. Admin only.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getDbUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, description, questions, subjectId, detectedLevel, detectedTrack } = body;

    const job = await db.ingestionJob.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Save edited draft questions and settings
    const updated = await db.ingestionJob.update({
      where: { id },
      data: {
        draftQuizTitle: title,
        draftQuizDesc: description,
        draftQuestions: questions ? JSON.stringify(questions) : undefined,
        subjectId: subjectId || null,
        detectedLevel: detectedLevel || undefined,
        detectedTrack: detectedTrack || undefined,
      },
    });

    return NextResponse.json({ success: true, job: updated });
  } catch (error: any) {
    console.error("PATCH /api/admin/ai-ingestion/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
