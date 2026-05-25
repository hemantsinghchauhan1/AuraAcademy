"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { DegreeTrack } from "@prisma/client";

// Helper to slugify names
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// Complete master seeder for IITM subjects
export async function ensureSeedSubjects() {
  try {
    const subjectCount = await db.subject.count({
      where: {
        code: { not: null }
      }
    });
    
    if (subjectCount > 0) return; // Already seeded

    console.log("🌱 Seeding Master IITM Subjects database...");

    const dsSubjects = [
      // FOUNDATION LEVEL
      { code: "BSMA1001", name: "Mathematics for Data Science I", level: "FOUNDATION", track: "BS_DATA_SCIENCE" as const, icon: "Calculator" },
      { code: "BSMA1002", name: "Statistics for Data Science I", level: "FOUNDATION", track: "BS_DATA_SCIENCE" as const, icon: "BarChart" },
      { code: "BSCS1001", name: "Computational Thinking", level: "FOUNDATION", track: "BS_DATA_SCIENCE" as const, icon: "Brain" },
      { code: "BSEN1001", name: "English I", level: "FOUNDATION", track: "BS_DATA_SCIENCE" as const, icon: "BookOpen" },
      { code: "BSMA1003", name: "Mathematics for Data Science II", level: "FOUNDATION", track: "BS_DATA_SCIENCE" as const, icon: "Calculator" },
      { code: "BSMA1004", name: "Statistics for Data Science II", level: "FOUNDATION", track: "BS_DATA_SCIENCE" as const, icon: "BarChart" },
      { code: "BSCS1002", name: "Programming in Python", level: "FOUNDATION", track: "BS_DATA_SCIENCE" as const, icon: "Cpu" },
      { code: "BSEN1002", name: "English II", level: "FOUNDATION", track: "BS_DATA_SCIENCE" as const, icon: "BookOpen" },

      // DIPLOMA IN PROGRAMMING
      { code: "BSCS2001", name: "Database Management Systems", level: "DIPLOMA", track: "BS_DATA_SCIENCE" as const, icon: "Database" },
      { code: "BSCS2002", name: "Programming, Data Structures and Algorithms using Python", level: "DIPLOMA", track: "BS_DATA_SCIENCE" as const, icon: "Code" },
      { code: "BSCS2003", name: "Modern Application Development I", level: "DIPLOMA", track: "BS_DATA_SCIENCE" as const, icon: "Globe" },
      { code: "BSCS2004", name: "Modern Application Development II", level: "DIPLOMA", track: "BS_DATA_SCIENCE" as const, icon: "Terminal" },
      { code: "BSSE2001", name: "System Commands", level: "DIPLOMA", track: "BS_DATA_SCIENCE" as const, icon: "Terminal" },

      // DIPLOMA IN DATA SCIENCE
      { code: "BSCS2005", name: "Machine Learning Foundations", level: "DIPLOMA", track: "BS_DATA_SCIENCE" as const, icon: "Cpu" },
      { code: "BSCS2006", name: "Machine Learning Techniques", level: "DIPLOMA", track: "BS_DATA_SCIENCE" as const, icon: "Cpu" },
      { code: "BSMS2001", name: "Business Data Management", level: "DIPLOMA", track: "BS_DATA_SCIENCE" as const, icon: "TrendingUp" },
      { code: "BSMS2002", name: "Business Analytics", level: "DIPLOMA", track: "BS_DATA_SCIENCE" as const, icon: "Activity" },
      { code: "BSSE2002", name: "Tools in Data Science", level: "DIPLOMA", track: "BS_DATA_SCIENCE" as const, icon: "Server" },
      { code: "BSCS2007", name: "Machine Learning Practice", level: "DIPLOMA", track: "BS_DATA_SCIENCE" as const, icon: "Activity" },

      // DEGREE LEVEL
      { code: "BSSE3001", name: "Software Engineering", level: "DEGREE", track: "BS_DATA_SCIENCE" as const, icon: "Layers" },
      { code: "BSCS3001", name: "AI: Search Methods for Problem Solving", level: "DEGREE", track: "BS_DATA_SCIENCE" as const, icon: "Cpu" },
      { code: "BSCS3002", name: "Deep Learning", level: "DEGREE", track: "BS_DATA_SCIENCE" as const, icon: "Activity" },
      { code: "BSSE3002", name: "Strategies for Professional Growth", level: "DEGREE", track: "BS_DATA_SCIENCE" as const, icon: "Sparkles" },
      { code: "BSSE3003", name: "Industry 4.0", level: "DEGREE", track: "BS_DATA_SCIENCE" as const, icon: "Activity" },

      // BS LEVEL
      { code: "BSMA3001", name: "Linear Statistical Models", level: "BS_LEVEL", track: "BS_DATA_SCIENCE" as const, icon: "BarChart" },
      { code: "BSCS3003", name: "Introduction to Big Data", level: "BS_LEVEL", track: "BS_DATA_SCIENCE" as const, icon: "Database" },
      { code: "BSMS3001", name: "Market Research", level: "BS_LEVEL", track: "BS_DATA_SCIENCE" as const, icon: "TrendingUp" },
      { code: "BSMS3002", name: "Financial Forensics", level: "BS_LEVEL", track: "BS_DATA_SCIENCE" as const, icon: "Shield" },
      { code: "BSMS3206", name: "Managerial Economics", level: "BS_LEVEL", track: "BS_DATA_SCIENCE" as const, icon: "TrendingUp" },
    ];

    const esSubjects = [
      // FOUNDATION LEVEL
      { code: "EN1001", name: "English I (ES)", level: "FOUNDATION", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "BookOpen" },
      { code: "MA1001", name: "Math for Electronics I", level: "FOUNDATION", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Calculator" },
      { code: "EN1002", name: "English II (ES)", level: "FOUNDATION", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "BookOpen" },
      { code: "EE1101", name: "Electronic Systems Thinking and Circuits", level: "FOUNDATION", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Activity" },
      { code: "EE1901", name: "Electronic Systems Thinking and Circuits Laboratory", level: "FOUNDATION", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Activity" },
      { code: "CS1101", name: "Introduction to C Programming", level: "FOUNDATION", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Code" },
      { code: "CS1901", name: "C Programming Laboratory", level: "FOUNDATION", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Code" },
      { code: "CS1102", name: "Introduction to Linux and Programming", level: "FOUNDATION", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Terminal" },
      { code: "CS1902", name: "Linux Systems Laboratory", level: "FOUNDATION", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Terminal" },
      { code: "EE1102", name: "Digital Systems", level: "FOUNDATION", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Layers" },
      { code: "EE1103", name: "Electrical and Electronic Circuits", level: "FOUNDATION", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Activity" },
      { code: "EE1902", name: "Electronics Laboratory", level: "FOUNDATION", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Activity" },
      { code: "CS2101", name: "Embedded C Programming", level: "FOUNDATION", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Code" },
      { code: "CS2901", name: "Embedded C Programming Laboratory", level: "FOUNDATION", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Code" },

      // DIPLOMA LEVEL
      { code: "MA2001", name: "Math for Electronics II", level: "DIPLOMA", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Calculator" },
      { code: "EE2101", name: "Signals and Systems", level: "DIPLOMA", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Activity" },
      { code: "EE2102", name: "Analog Electronic Systems", level: "DIPLOMA", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Activity" },
      { code: "EE2901", name: "Analog Electronics Laboratory", level: "DIPLOMA", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Activity" },
      { code: "CS1002", name: "Python Programming (ES)", level: "DIPLOMA", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Code" },
      { code: "EE2103", name: "Digital System Design", level: "DIPLOMA", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Layers" },
      { code: "EE2902", name: "Digital System Design Laboratory", level: "DIPLOMA", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Layers" },
      { code: "EE3101", name: "Digital Signal Processing", level: "DIPLOMA", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Activity" },
      { code: "EE3103", name: "Sensors and Applications", level: "DIPLOMA", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Cpu" },
      { code: "EE3901", name: "Sensors Laboratory", level: "DIPLOMA", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Cpu" },
      { code: "EE3102", name: "Control Engineering", level: "DIPLOMA", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Activity" },
      { code: "EE3999", name: "Electronics System Project", level: "DIPLOMA", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Layers" },

      // DEGREE LEVEL
      { code: "EE4101", name: "Embedded Linux and FPGAs", level: "DEGREE", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Cpu" },
      { code: "EE4901", name: "Embedded Linux and FPGAs Lab", level: "DEGREE", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Cpu" },
      { code: "EE4102", name: "Electromagnetic Fields and Transmission Lines", level: "DEGREE", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Activity" },
      { code: "EE4103", name: "Electronic Product Design", level: "DEGREE", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Layers" },
      { code: "EE4104", name: "Computer Organisation", level: "DEGREE", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Server" },
      { code: "MS4001", name: "Strategies for Professional Growth (ES)", level: "DEGREE", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Sparkles" },

      // ELECTIVES
      { code: "EE4105", name: "Communication Systems", level: "ELECTIVES", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Activity" },
      { code: "EE4106", name: "Internet of Things (IoT)", level: "ELECTIVES", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Globe" },
      { code: "EE4107", name: "Semiconductor Devices and VLSI Technology", level: "ELECTIVES", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Cpu" },
      { code: "EE4108", name: "Electronic Testing and Measurement", level: "ELECTIVES", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Layers" },
      { code: "EE4109", name: "Analog Circuits", level: "ELECTIVES", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Activity" },
      { code: "EE4110", name: "Digital IC Design", level: "ELECTIVES", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Layers" },
      { code: "EE4111", name: "Power Management for Electronic Systems", level: "ELECTIVES", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Server" },
      { code: "EE4112", name: "Biomedical Electronic Systems", level: "ELECTIVES", track: "BS_ELECTRONIC_SYSTEMS" as const, icon: "Activity" },
    ];

    const allSeedData = [...dsSubjects, ...esSubjects];

    for (const sub of allSeedData) {
      await db.subject.upsert({
        where: { code: sub.code },
        update: {
          name: sub.name,
          slug: slugify(sub.name),
          level: sub.level,
          track: sub.track,
          icon: sub.icon,
        },
        create: {
          code: sub.code,
          name: sub.name,
          slug: slugify(sub.name),
          level: sub.level,
          track: sub.track,
          description: `Official IITM Course curriculum paper for ${sub.name} (${sub.code}).`,
          icon: sub.icon,
        }
      });
    }

    console.log("✅ Seeded master subjects successfully.");
  } catch (error) {
    console.error("ensureSeedSubjects error:", error);
  }
}

// Group active subjects by levels
export async function getSubjectsByTrack(track: DegreeTrack) {
  try {
    await ensureSeedSubjects();

    const subjects = await db.subject.findMany({
      where: { track },
      orderBy: { code: "asc" }
    });

    const groups: Record<string, typeof subjects> = {
      FOUNDATION: [],
      DIPLOMA: [],
      DEGREE: [],
      BS_LEVEL: [],
      ELECTIVES: [],
    };

    for (const sub of subjects) {
      if (sub.level && groups[sub.level]) {
        groups[sub.level].push(sub);
      } else {
        // Fallback fallback level keying
        if (!groups.FOUNDATION) groups.FOUNDATION = [];
        groups.FOUNDATION.push(sub);
      }
    }

    return groups;
  } catch (error) {
    console.error("getSubjectsByTrack error:", error);
    return {};
  }
}

// checkUsernameUniqueness server function
export async function checkUsernameUniqueness(username: string, userId?: string) {
  try {
    const normalized = username.trim().toLowerCase();
    if (!normalized) return { available: false, error: "Username cannot be empty." };

    const validRegex = /^[a-z0-9_-]{3,20}$/;
    if (!validRegex.test(normalized)) {
      return { available: false, error: "Username must be 3-20 characters, containing only lowercase letters, numbers, underscores, or hyphens." };
    }

    // Check if the username is taken by another user
    const match = await db.user.findUnique({
      where: { username: normalized }
    });

    if (match && match.id !== userId) {
      return { available: false, error: "Username is already taken by another student." };
    }

    return { available: true };
  } catch (error) {
    console.error("checkUsernameUniqueness error:", error);
    return { available: false, error: "Failed to validate username." };
  }
}

// Onboarding submission service
export async function completeOnboardingAction(
  userId: string,
  params: {
    username: string;
    degreeTrack: DegreeTrack;
    rollNumber: string;
    isOfficialIITM: boolean;
    selectedSubjectIds: string[];
  }
) {
  try {
    // Validate username uniqueness
    const uniqueness = await checkUsernameUniqueness(params.username, userId);
    if (!uniqueness.available) {
      return { success: false, error: uniqueness.error || "Username is unavailable." };
    }

    // 1. Enforce server-side checks (max 4 subjects)
    if (params.selectedSubjectIds.length > 4) {
      return { success: false, error: "Validation failed: Maximum of 4 active subjects allowed." };
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "Student user not found." };

    await db.$transaction(async (tx) => {
      // Update User records
      await tx.user.update({
        where: { id: userId },
        data: {
          username: params.username.trim().toLowerCase(),
          degreeTrack: params.degreeTrack,
          rollNumber: params.rollNumber || null,
          isOfficialIITM: params.isOfficialIITM,
          onboardingCompleted: true,
        }
      });

      // Clear existing selected subjects (self-healing resilience)
      await tx.userSelectedSubject.deleteMany({
        where: { userId }
      });

      // Seed new UserSelectedSubject relations
      if (params.selectedSubjectIds.length > 0) {
        const createData = params.selectedSubjectIds.map(subId => ({
          userId,
          subjectId: subId
        }));
        await tx.userSelectedSubject.createMany({
          data: createData
        });
      }
    });

    // Revalidate paths to refresh page states
    revalidatePath("/dashboard");
    revalidatePath("/courses");
    revalidatePath("/leaderboard");
    revalidatePath("/students");

    return { success: true };
  } catch (error: any) {
    console.error("completeOnboardingAction error:", error);
    return { success: false, error: error.message || "Failed to complete onboarding." };
  }
}
