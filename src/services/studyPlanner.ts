import { generateAiResponse } from "./aiService";
import { aggregateStudentContext } from "./promptEngine";

/**
 * Generates a tailored study checklist schedule using student academic indicators.
 */
export async function generateStudyPlan(userId: string): Promise<{ success: boolean; plan: string }> {
  try {
    // 1. Gather student metrics
    const studentContext = await aggregateStudentContext(userId);

    // 2. Draft planner-specific prompt
    const plannerPrompt = `
Using the student academic context below, draft a personalized, highly structured, 7-day study plan checklist.

${studentContext}

Instructions:
1. Divide into 3 core study blocks: Weekday Focus (Lectures/Lessons), Weak Topic Interventions (Practice/Quizzes), and Peer Study Collaboration.
2. Recommend dedicated slots for subjects with lower accuracy.
3. Align with upcoming deadlines.
4. Keep the plan bulleted, actionable, and encouraging. Include short motivational titles for the days.
`;

    const aiRes = await generateAiResponse(userId, plannerPrompt, {
      systemContext: "You are an expert IITM Academic Coach. Focus on consistency, time management, and mock practice.",
      bypassCache: true // Ensure fresh generation for plan updates
    });

    if (!aiRes.success) {
      return { success: false, plan: "Failed to generate AI study plan." };
    }

    return { success: true, plan: aiRes.text };
  } catch (error: any) {
    console.error("generateStudyPlan error:", error);
    return { success: false, plan: "An error occurred compiling the study planner." };
  }
}
