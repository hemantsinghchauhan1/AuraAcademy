import { db } from "@/lib/db";

// Abusive phrases/words blocklist
const OFFENSIVE_TERMS = [
  "ignore previous instructions",
  "system prompt",
  "hack",
  "exploit",
  "offensive",
  "racist",
  "sexist",
  "spam",
  "bypass safety",
];

export interface PromptValidationResult {
  isValid: boolean;
  sanitizedPrompt: string;
  reason?: string;
}

/**
 * Validates prompt input to prevent abuse and prompt injection.
 */
export function validateAndSanitizePrompt(prompt: string): PromptValidationResult {
  const trimmed = prompt.trim();
  
  if (!trimmed) {
    return { isValid: false, sanitizedPrompt: "", reason: "Prompt cannot be empty." };
  }

  // Token budgeting constraint check
  if (trimmed.length > 3000) {
    return { 
      isValid: false, 
      sanitizedPrompt: trimmed.slice(0, 3000), 
      reason: "Prompt length exceeds 3000 characters limit." 
    };
  }

  // Safety filter
  const lowerPrompt = trimmed.toLowerCase();
  for (const term of OFFENSIVE_TERMS) {
    if (lowerPrompt.includes(term)) {
      return { 
        isValid: false, 
        sanitizedPrompt: "", 
        reason: `Blocked query due to safety policy: detected security keyword "${term}".` 
      };
    }
  }

  return { isValid: true, sanitizedPrompt: trimmed };
}

/**
 * Collects all student profile and academic metrics to formulate a rich system context.
 */
export async function aggregateStudentContext(userId: string) {
  try {
    // 1. Fetch user selected subjects
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        selectedSubjects: {
          include: {
            subject: true,
          },
        },
        analytics: true,
      },
    });

    if (!user) {
      return "Student context: Unknown user profile.";
    }

    const name = user.profile?.name || "Student";
    const degreeTrack = user.degreeTrack || "BS_DATA_SCIENCE";
    const subjects = user.selectedSubjects.map((s) => `${s.subject.name} (${s.subject.code || "N/A"})`).join(", ");
    
    // Parse weak topics
    let weakTopicsStr = "None";
    if (user.analytics?.weakTopics) {
      try {
        const weakList = JSON.parse(user.analytics.weakTopics);
        if (Array.isArray(weakList) && weakList.length > 0) {
          weakTopicsStr = weakList
            .map((wt: any) => `${wt.topic} (${wt.accuracy}% accuracy over ${wt.questionsSolved} questions)`)
            .join(", ");
        }
      } catch (e) {
        console.error("Error parsing user weak topics:", e);
      }
    }

    // 2. Fetch upcoming deadlines/classes
    const calendarEvents = await db.academicEvent.findMany({
      where: {
        subjectId: { in: user.selectedSubjects.map((s) => s.subjectId) },
        startTime: { gte: new Date() },
      },
      orderBy: { startTime: "asc" },
      take: 3,
    });

    const calendarStr = calendarEvents.length > 0
      ? calendarEvents.map((e) => `[${e.eventType}] ${e.title} at ${e.startTime.toDateString()}`).join("; ")
      : "No upcoming classes or deadlines scheduled.";

    // 3. User Gamification stats
    const streak = user.profile?.streak || 0;
    const xp = user.profile?.xp || 0;

    const context = `
=== STUDENT PROFILE CONTEXT ===
- Student Name: ${name}
- Degree Track: ${degreeTrack}
- Current Subjects Enrolled: ${subjects || "None selected yet"}
- Weakest Subjects/Chapters: ${weakTopicsStr}
- Gamification Metrics: ${xp} XP, ${streak}-day active study streak
- Upcoming Timetable & Deadlines: ${calendarStr}
===============================
`;
    return context;
  } catch (error) {
    console.error("aggregateStudentContext error:", error);
    return "Student context: Error gathering academic metrics.";
  }
}

/**
 * Returns the global system instructions for the AI tutor Persona.
 */
export function getSystemInstructions(): string {
  return `You are AuraAcademy's AI Academic Copilot, a highly intelligent personal tutor for students at IIT Madras (IITM).
Your goal is to guide students on their BS Degree paths (Data Science & Applications, Electronic Systems).
You should explain concepts simply, generate practice questions on demand, recommend topics for revision, and outline study plans.

Guidelines:
1. Always maintain a premium, encouraging, and academic tone.
2. Be concise but extremely informative. Use formatting (bullet points, markdown tables, bold highlights) to organize answers.
3. Help summarize DBMS, Python Programming, DSA, Mathematics, Machine Learning, and Electronic Circuits.
4. When asked about schedules, suggest focusing on weak topics or preparing for upcoming deadlines.
5. Do NOT answer off-topic questions (e.g. general recipes, entertainment) - politely redirect them back to their study goals.
6. Provide equations in standard markdown block notation if necessary.
7. Keep code explanations clean with syntax highlighted markdown blocks.
`;
}
