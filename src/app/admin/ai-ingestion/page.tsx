import { getDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import IngestionClient from "./IngestionClient";
import React from "react";

export const dynamic = "force-dynamic";

export default async function AiIngestionPage() {
  const user = await getDbUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
    redirect("/dashboard");
  }

  // Fetch ingestion jobs
  const jobs = await db.ingestionJob.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      uploadedBy: { select: { id: true, email: true, profile: { select: { name: true } } } },
    },
  });

  // Fetch subjects master list
  const subjects = await db.subject.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return (
    <IngestionClient
      initialJobs={JSON.parse(JSON.stringify(jobs))}
      subjects={JSON.parse(JSON.stringify(subjects))}
    />
  );
}
