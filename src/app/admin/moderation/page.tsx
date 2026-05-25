import { getReportsQueue } from "@/services/adminService";
import ReportRow from "./ReportRow";
import React from "react";

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  const reports = await getReportsQueue("PENDING");

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Moderation Queue</h1>
        <p className="text-gray-400 mt-1">Review flagged discussions, remove offending items, or dismiss reported items.</p>
      </div>

      {reports.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-xl border border-white/5 space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">Queue is clear!</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Excellent! There are no flagged posts or comments awaiting moderation on AuraAcademy.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report) => (
            <ReportRow key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
