import { db } from "@/lib/db";
import { extractTextFromBuffer } from "./documentParser";
import { generateDraftQuizFromText } from "./questionGenerator";
import { DegreeTrack } from "@prisma/client";

/**
 * Executes the background ingestion stages (Parsing, Structuring, and Classification) asynchronously.
 */
export async function processIngestionJob(jobId: string, fileBuffer: Buffer) {
  const updateStages = async (stage: string, status: "pending" | "running" | "completed" | "failed", error?: string) => {
    const job = await db.ingestionJob.findUnique({ where: { id: jobId } });
    if (!job) return;
    
    let stages: any[] = [];
    if (job.parsingStages) {
      try {
        stages = JSON.parse(job.parsingStages);
      } catch {
        stages = [];
      }
    }
    
    const existingIndex = stages.findIndex((s: any) => s.stage === stage);
    if (existingIndex > -1) {
      stages[existingIndex] = { stage, status, timestamp: new Date().toISOString(), error };
    } else {
      stages.push({ stage, status, timestamp: new Date().toISOString(), error });
    }
    
    await db.ingestionJob.update({
      where: { id: jobId },
      data: {
        parsingStages: JSON.stringify(stages),
      }
    });
  };

  try {
    // --- Step 1: PARSING (Extracting Text) ---
    await db.ingestionJob.update({
      where: { id: jobId },
      data: { status: "PARSING" }
    });
    await updateStages("Extracting Text", "running");

    const job = await db.ingestionJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Job not found");

    const parseResult = await extractTextFromBuffer(fileBuffer, job.mimeType);
    
    await db.ingestionJob.update({
      where: { id: jobId },
      data: {
        extractedText: parseResult.text,
      }
    });
    await updateStages("Extracting Text", "completed");

    // --- Step 2: EXTRACTING & CLASSIFYING (Structuring Questions & Subject Detection) ---
    await db.ingestionJob.update({
      where: { id: jobId },
      data: { status: "EXTRACTING" }
    });
    await updateStages("Structuring Questions", "running");
    await updateStages("Detecting Subject", "running");

    const draftResult = await generateDraftQuizFromText(parseResult.text);

    // Map track dynamically
    let mappedTrack: DegreeTrack | null = null;
    if (draftResult.detectedTrack === "BS_DATA_SCIENCE" || draftResult.detectedTrack === "BS_ELECTRONIC_SYSTEMS") {
      mappedTrack = draftResult.detectedTrack as DegreeTrack;
    }
    const mappedSubjectId = (draftResult as any).subjectId || null;

    await db.ingestionJob.update({
      where: { id: jobId },
      data: {
        status: "DRAFT",
        detectedSubject: draftResult.detectedSubject,
        detectedTrack: mappedTrack,
        detectedLevel: draftResult.detectedLevel,
        subjectId: mappedSubjectId,
        draftQuizTitle: draftResult.title,
        draftQuizDesc: draftResult.description,
        draftQuestions: JSON.stringify(draftResult.questions),
      }
    });

    await updateStages("Structuring Questions", "completed");
    await updateStages("Detecting Subject", "completed");
    await updateStages("Awaiting Review", "completed");

  } catch (error: any) {
    console.error("processIngestionJob error:", error);
    await db.ingestionJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: error.message || "Unknown ingestion failure",
      }
    });
    
    await updateStages("Extraction Failed", "failed", error.message);
  }
}
