import { getDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/ai-ingestion/[id]/publish
 * Publishes the draft quiz of an ingestion job to the live platform. Admin only.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getDbUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = await params;
    const job = await db.ingestionJob.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft ingestion jobs can be published" }, { status: 400 });
    }

    if (!job.subjectId) {
      return NextResponse.json({ error: "A valid subject mapping is required to publish this quiz" }, { status: 400 });
    }

    const title = job.draftQuizTitle || `AI Generated Quiz - ${job.fileName}`;
    const description = job.draftQuizDesc || "Concept review quiz generated automatically via AI document ingestion.";
    
    let questionsList: any[] = [];
    if (job.draftQuestions) {
      try {
        questionsList = JSON.parse(job.draftQuestions);
      } catch (e) {
        questionsList = [];
      }
    }

    if (questionsList.length === 0) {
      return NextResponse.json({ error: "Draft quiz does not contain any questions to publish" }, { status: 400 });
    }

    // Determine the average difficulty or map to default
    let mappedDifficulty: "EASY" | "MEDIUM" | "HARD" = "MEDIUM";
    const difficultyCount = { EASY: 0, MEDIUM: 0, HARD: 0 };
    questionsList.forEach((q: any) => {
      const diff = (q.difficulty || "MEDIUM").toUpperCase();
      if (diff === "EASY") difficultyCount.EASY++;
      else if (diff === "HARD") difficultyCount.HARD++;
      else difficultyCount.MEDIUM++;
    });

    if (difficultyCount.EASY > difficultyCount.MEDIUM && difficultyCount.EASY > difficultyCount.HARD) {
      mappedDifficulty = "EASY";
    } else if (difficultyCount.HARD > difficultyCount.MEDIUM && difficultyCount.HARD > difficultyCount.EASY) {
      mappedDifficulty = "HARD";
    }

    // 1. Create the Quiz in a Transaction
    const newQuiz = await db.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          title,
          description,
          subjectId: job.subjectId!,
          timeLimit: questionsList.length * 2, // 2 minutes per question default
          totalQuestions: questionsList.length,
          difficulty: mappedDifficulty,
        },
      });

      // Create questions sequentially
      for (const q of questionsList) {
        const questionText = q.questionText || "Question text placeholder";
        const explanation = q.explanation || "No explanation provided.";
        const correctAnswer = q.correctAnswer || "A";

        // Map options array: label must be "A", "B", etc.
        const rawOptions = q.options || [];
        const formattedOptions = rawOptions.map((opt: any, index: number) => {
          const defaultLabel = String.fromCharCode(65 + index); // A, B, C, D...
          return {
            label: opt.label || defaultLabel,
            text: opt.text || "Option choice placeholder",
          };
        });

        await tx.question.create({
          data: {
            quizId: quiz.id,
            questionText,
            correctAnswer,
            explanation,
            options: {
              create: formattedOptions,
            },
          },
        });
      }

      // 2. Update job status to PUBLISHED
      await tx.ingestionJob.update({
        where: { id: job.id },
        data: { status: "PUBLISHED" },
      });

      return quiz;
    });

    // 3. Increment AdminAction log to record publishing history
    await db.adminAction.create({
      data: {
        adminId: user.id,
        action: "CREATE_QUIZ",
        details: `Successfully generated and published quiz "${title}" via AI ingestion from document "${job.fileName}"`,
      },
    });

    return NextResponse.json({
      success: true,
      quizId: newQuiz.id,
      message: `Quiz "${title}" published successfully with ${questionsList.length} questions.`,
    });
  } catch (error: any) {
    console.error("POST /api/admin/ai-ingestion/[id]/publish error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
