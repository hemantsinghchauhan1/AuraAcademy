import { getDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { processIngestionJob } from "@/services/aiIngestionService";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * GET /api/admin/ai-ingestion
 * Lists recent ingestion jobs. Admin only.
 */
export async function GET() {
  try {
    const user = await getDbUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const jobs = await db.ingestionJob.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        uploadedBy: { select: { id: true, email: true, profile: { select: { name: true } } } },
      },
    });

    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    console.error("GET /api/admin/ai-ingestion error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/ai-ingestion
 * Uploads a document and starts background ingestion processing. Admin only.
 */
export async function POST(req: Request) {
  try {
    const user = await getDbUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validMimes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];

    if (!validMimes.includes(file.type) && !file.name.endsWith(".txt") && !file.name.endsWith(".docx") && !file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "Unsupported file type. Use PDF, DOCX, or TXT." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Dynamic Storage Path: Local simulation is default for out-of-the-box reliability.
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
    const filePath = path.join(uploadDir, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${safeFileName}`;
    const fileKey = `local:${safeFileName}`;

    // Create the IngestionJob record
    const job = await db.ingestionJob.create({
      data: {
        fileName: file.name,
        fileUrl,
        fileKey,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        uploadedById: user.id,
        status: "PENDING",
        parsingStages: JSON.stringify([
          { stage: "Uploading PDF", status: "completed", timestamp: new Date().toISOString() },
          { stage: "Extracting Text", status: "pending", timestamp: new Date().toISOString() },
          { stage: "Structuring Questions", status: "pending", timestamp: new Date().toISOString() },
          { stage: "Detecting Subject", status: "pending", timestamp: new Date().toISOString() },
          { stage: "Awaiting Review", status: "pending", timestamp: new Date().toISOString() },
        ]),
      },
    });

    // Fire off asynchronous background parsing task (non-blocking)
    processIngestionJob(job.id, buffer).catch((err) => {
      console.error(`Job ${job.id} background processing failed:`, err);
    });

    return NextResponse.json({ success: true, jobId: job.id, message: "Ingestion started successfully." });
  } catch (error: any) {
    console.error("POST /api/admin/ai-ingestion error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
