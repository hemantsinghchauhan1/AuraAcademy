import { db } from "@/lib/db";
import { getPYQPapers } from "@/services/adminService";
import PYQManager from "./PYQManager";
import React from "react";

export const dynamic = "force-dynamic";

export default async function AdminPyqsPage() {
  // Load papers, categories, and subjects
  const [papers, subjects] = await Promise.all([
    getPYQPapers(),
    db.subject.findMany({ orderBy: { name: "asc" } })
  ]);

  let categories = await db.paperCategory.findMany({ orderBy: { name: "asc" } });

  // Self-healing: Seed required categories dynamically if empty!
  if (categories.length === 0) {
    console.log("🌱 Database paper categories empty. Seeding defaults dynamically...");
    categories = await Promise.all([
      db.paperCategory.create({
        data: {
          name: "IITM BS",
          slug: "iitm-bs",
          description: "Official papers for IIT Madras BS Degree program."
        }
      }),
      db.paperCategory.create({
        data: {
          name: "Semester Papers",
          slug: "semester",
          description: "Term tests, quizzes, and End-Semester exams."
        }
      }),
      db.paperCategory.create({
        data: {
          name: "Placement Papers",
          slug: "placement",
          description: "Coding sheets and recruitment mock papers."
        }
      }),
      db.paperCategory.create({
        data: {
          name: "Mock Papers",
          slug: "mock",
          description: "Mock practice evaluations and trial questionnaires."
        }
      })
    ]);
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">PYQ Storage & Files</h1>
        <p className="text-gray-400 mt-1">Catalog previous year papers, upload syllabus PDFs, and map tags for search indexing.</p>
      </div>

      <PYQManager papers={papers} categories={categories} subjects={subjects} />
    </div>
  );
}
