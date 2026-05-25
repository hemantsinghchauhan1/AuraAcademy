import { getPendingAssignmentsQueue } from "@/services/courseAdminService";
import { getDbUser } from "@/lib/auth";
import AssignmentsGradingConsole from "./AssignmentsGradingConsole";
import { redirect } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";

export default async function AdminAssignmentsPage() {
  const dbUser = await getDbUser();

  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "MODERATOR")) {
    redirect("/dashboard");
  }

  const submissions = await getPendingAssignmentsQueue();

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Homework Evaluator</h1>
        <p className="text-gray-400 mt-1">Review student task uploads, verify code sheets, and log approval marks.</p>
      </div>

      <AssignmentsGradingConsole submissions={submissions} graderId={dbUser.id} />
    </div>
  );
}
