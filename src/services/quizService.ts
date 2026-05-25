"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Self-seeding mock data helper
async function ensureSeedData() {
  try {
    const subjectCount = await db.subject.count();
    if (subjectCount > 0) return;

    // Seed Subjects
    const math = await db.subject.create({
      data: {
        name: "Mathematics",
        slug: "mathematics",
        description: "Advance Calculus, Linear Algebra, and Discrete Math",
        icon: "Calculator",
      },
    });

    const cs = await db.subject.create({
      data: {
        name: "Computer Science",
        slug: "computer-science",
        description: "Enterprise Architecture, Algorithms, and System Design",
        icon: "Cpu",
      },
    });

    const physics = await db.subject.create({
      data: {
        name: "Quantum Physics",
        slug: "quantum-physics",
        description: "Quantum Mechanics, Wave Theory, and Statistical Mechanics",
        icon: "Atom",
      },
    });

    // Seed Mathematics Quizzes & Questions
    const quiz1 = await db.quiz.create({
      data: {
        title: "Linear Algebra & Vectors",
        description: "Master vector spaces, transformations, determinants, and eigenvalues.",
        subjectId: math.id,
        timeLimit: 15,
        totalQuestions: 5,
        difficulty: "MEDIUM",
      },
    });

    await db.question.createMany({
      data: [
        {
          quizId: quiz1.id,
          questionText: "What is the dimension of the vector space of all 3x3 symmetric matrices?",
          optionA: "9",
          optionB: "6",
          optionC: "3",
          optionD: "5",
          correctAnswer: "B",
          explanation: "A symmetric matrix is determined by its diagonal elements and the elements either above or below the diagonal. For a 3x3 matrix, there are 3 diagonal elements and 3 elements above. Thus, 3 + 3 = 6 dimensions.",
        },
        {
          quizId: quiz1.id,
          questionText: "Which of the following is true for an orthogonal matrix Q?",
          optionA: "Q^T = Q^-1",
          optionB: "Det(Q) is always 0",
          optionC: "Q^T Q = 2I",
          optionD: "Q is always symmetric",
          correctAnswer: "A",
          explanation: "By definition, an orthogonal matrix Q satisfies Q^T Q = I. Multiplying both sides by Q^-1 on the right gives Q^T = Q^-1.",
        },
        {
          quizId: quiz1.id,
          questionText: "If A is a 3x3 matrix with eigenvalues 1, 2, and 5, what is the determinant of A?",
          optionA: "8",
          optionB: "15",
          optionC: "10",
          optionD: "5",
          correctAnswer: "C",
          explanation: "The determinant of any square matrix is equal to the product of its eigenvalues. Det(A) = 1 * 2 * 5 = 10.",
        },
        {
          quizId: quiz1.id,
          questionText: "What is the condition for a matrix to be diagonalized?",
          optionA: "It must be a symmetric matrix",
          optionB: "It must have distinct eigenvalues",
          optionC: "It must have n linearly independent eigenvectors",
          optionD: "Its determinant must be non-zero",
          correctAnswer: "C",
          explanation: "An n x n matrix is diagonalizable if and only if it has n linearly independent eigenvectors, which form the columns of the diagonalizing matrix P.",
        },
        {
          quizId: quiz1.id,
          questionText: "If the determinant of a 2x2 matrix is -6, what are its eigenvalues?",
          optionA: "2 and 3",
          optionB: "-2 and 3",
          optionC: "-6 and 1",
          optionD: "Cannot determine, but their product must be -6",
          correctAnswer: "D",
          explanation: "The determinant of a matrix is the product of its eigenvalues. Hence, the eigenvalues must multiply to -6, but we cannot uniquely determine them from just the determinant.",
        },
      ],
    });

    // Seed CS Quizzes & Questions
    const quiz2 = await db.quiz.create({
      data: {
        title: "Enterprise Architecture & Microservices",
        description: "Test your architectural patterns, routing strategies, caching mechanisms, and system durability knowledge.",
        subjectId: cs.id,
        timeLimit: 10,
        totalQuestions: 4,
        difficulty: "HARD",
      },
    });

    await db.question.createMany({
      data: [
        {
          quizId: quiz2.id,
          questionText: "Which architecture pattern uses event-sourcing and commands/queries separation?",
          optionA: "CQRS",
          optionB: "MVC",
          optionC: "Layered Architecture",
          optionD: "Monolithic",
          correctAnswer: "A",
          explanation: "CQRS stands for Command Query Responsibility Segregation. It separates read and update operations for a data store, often integrated with Event Sourcing to audit historical state changes.",
        },
        {
          quizId: quiz2.id,
          questionText: "In distributed systems, what does the CAP Theorem state you must trade off?",
          optionA: "Capacity, Accuracy, and Speed",
          optionB: "Consistency, Availability, and Partition Tolerance",
          optionC: "Complexity, Adaptability, and Portability",
          optionD: "Caching, Asynchrony, and Parallelism",
          correctAnswer: "B",
          explanation: "CAP Theorem states that a distributed data store can simultaneously provide at most two of the three guarantees: Consistency, Availability, and Partition Tolerance.",
        },
        {
          quizId: quiz2.id,
          questionText: "What is the primary role of a circuit breaker pattern in microservices?",
          optionA: "To encrypt communications between microservices",
          optionB: "To prevent cascading failures across service dependencies",
          optionC: "To balance network load evenly between containers",
          optionD: "To compress large file transfers over HTTP",
          correctAnswer: "B",
          explanation: "A Circuit Breaker detects service degradation and stops cascading calls to failing dependencies, immediately returning a fallback error instead of exhausting server threads.",
        },
        {
          quizId: quiz2.id,
          questionText: "Which caching strategy writes data to both the cache and database simultaneously?",
          optionA: "Write-Around",
          optionB: "Write-Back",
          optionC: "Write-Through",
          optionD: "Cache-Aside",
          correctAnswer: "C",
          explanation: "Write-Through updates both the cache and persistent store at the same time, preventing stale cache anomalies at the cost of higher write latency.",
        },
      ],
    });

  } catch (error) {
    console.error("Seeding Error:", error);
  }
}

export async function getSubjects() {
  await ensureSeedData();
  try {
    return await db.subject.findMany({
      include: {
        _count: {
          select: { quizzes: true },
        },
      },
    });
  } catch (e) {
    console.error("Failed to fetch subjects:", e);
    return [];
  }
}

export async function getQuizzes(subjectId?: string) {
  await ensureSeedData();
  try {
    const where = subjectId ? { subjectId } : {};
    return await db.quiz.findMany({
      where,
      include: {
        subject: true,
      },
    });
  } catch (e) {
    console.error("Failed to fetch quizzes:", e);
    return [];
  }
}

export async function getQuizDetails(quizId: string) {
  await ensureSeedData();
  try {
    return await db.quiz.findUnique({
      where: { id: quizId },
      include: {
        subject: true,
        questions: true,
      },
    });
  } catch (e) {
    console.error("Failed to fetch quiz details:", e);
    return null;
  }
}

export async function submitQuizAttempt(
  userId: string,
  quizId: string,
  score: number,
  timeSpent: number,
  answers: Record<string, string>
) {
  try {
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      include: { subject: true },
    });

    if (!quiz) throw new Error("Quiz not found");

    // 1. Create Attempt Record
    const attempt = await db.attempt.create({
      data: {
        userId,
        quizId,
        score,
        totalQuestions: quiz.totalQuestions,
        timeSpent,
        answers: JSON.stringify(answers),
      },
    });

    // 2. Award XP and update user streak
    const xpAwarded = score * 50 + 100; // 50 XP per correct, 100 XP completion bonus

    await db.$transaction(async (tx) => {
      // Fetch current profile to calculate streak increment
      const profile = await tx.profile.findUnique({ where: { userId } });
      const currentStreak = profile?.streak || 0;

      // Update Profile (increment XP & streak)
      await tx.profile.update({
        where: { userId },
        data: {
          xp: { increment: xpAwarded },
          streak: currentStreak + 1, // Add to streak!
        },
      });

      // Update Analytics
      const analytics = await tx.analytics.findUnique({ where: { userId } });
      const currentQuizzesTaken = analytics?.totalQuizzesTaken || 0;
      const accuracy = (score / quiz.totalQuestions) * 100;
      const newOverallAccuracy =
        currentQuizzesTaken === 0
          ? accuracy
          : ((analytics?.overallAccuracy || 0) * currentQuizzesTaken + accuracy) / (currentQuizzesTaken + 1);

      // Determine weak topic updates
      let weakTopicsParsed = [];
      try {
        if (analytics?.weakTopics) {
          weakTopicsParsed = JSON.parse(analytics.weakTopics);
        }
      } catch (err) {
        weakTopicsParsed = [];
      }

      // Check if accuracy on this quiz is weak (say, below 70%)
      if (accuracy < 70) {
        const topicIndex = weakTopicsParsed.findIndex((t: any) => t.topic === quiz.subject.name);
        if (topicIndex > -1) {
          weakTopicsParsed[topicIndex].accuracy = Math.round(
            (weakTopicsParsed[topicIndex].accuracy + accuracy) / 2
          );
          weakTopicsParsed[topicIndex].questionsSolved += quiz.totalQuestions;
        } else {
          weakTopicsParsed.push({
            topic: quiz.subject.name,
            accuracy: Math.round(accuracy),
            questionsSolved: quiz.totalQuestions,
          });
        }
      } else {
        // If accuracy is good, check if we can remove/mitigate this topic from weak topics
        const topicIndex = weakTopicsParsed.findIndex((t: any) => t.topic === quiz.subject.name);
        if (topicIndex > -1) {
          const updatedAccuracy = Math.round((weakTopicsParsed[topicIndex].accuracy + accuracy) / 2);
          if (updatedAccuracy >= 75) {
            // No longer weak! Remove it
            weakTopicsParsed.splice(topicIndex, 1);
          } else {
            weakTopicsParsed[topicIndex].accuracy = updatedAccuracy;
            weakTopicsParsed[topicIndex].questionsSolved += quiz.totalQuestions;
          }
        }
      }

      await tx.analytics.update({
        where: { userId },
        data: {
          totalQuizzesTaken: { increment: 1 },
          overallAccuracy: newOverallAccuracy,
          weakTopics: JSON.stringify(weakTopicsParsed),
        },
      });
    });

    return {
      success: true,
      attemptId: attempt.id,
      xpAwarded,
    };
  } catch (error: any) {
    console.error("Failed to submit quiz attempt:", error);
    return { success: false, error: error.message || "Failed to submit attempt." };
  }
}

export async function getUserAnalytics(userId: string) {
  try {
    const analytics = await db.analytics.findUnique({
      where: { userId },
    });

    if (!analytics) return null;

    let weakTopics = [];
    try {
      weakTopics = JSON.parse(analytics.weakTopics);
    } catch (e) {
      weakTopics = [];
    }

    return {
      ...analytics,
      weakTopics,
    };
  } catch (e) {
    console.error("Failed to get analytics:", e);
    return null;
  }
}

export async function getUserAttempts(userId: string) {
  try {
    return await db.attempt.findMany({
      where: { userId },
      include: {
        quiz: {
          include: { subject: true },
        },
      },
      orderBy: { completedAt: "desc" },
    });
  } catch (e) {
    console.error("Failed to fetch user attempts:", e);
    return [];
  }
}
