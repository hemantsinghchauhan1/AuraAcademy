"use client";

import React, { useState } from "react";
import { gradeAssignmentSubmissionAction } from "@/services/courseAdminActions";
import { SubmissionStatus } from "@prisma/client";

interface AssignmentsGradingConsoleProps {
  submissions: any[];
  graderId: string;
}

export default function AssignmentsGradingConsole({ submissions: initialSubmissions, graderId }: AssignmentsGradingConsoleProps) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [loading, setLoading] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  const handleGrade = async (submissionId: string, status: SubmissionStatus) => {
    if (!feedbackText.trim() && status === "REJECTED") {
      alert("Please specify review feedback before rejecting a student's submission.");
      return;
    }

    setLoading(true);
    const res = await gradeAssignmentSubmissionAction({
      submissionId,
      graderId,
      status,
      feedback: feedbackText
    });
    setLoading(false);

    if (res.success) {
      setSubmissions(submissions.filter(s => s.id !== submissionId));
      setSelectedSubId(null);
      setFeedbackText("");
      alert(`Submission successfully ${status.toLowerCase()} and logged.`);
    } else {
      alert(res.error || "Failed to record evaluation grade.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <span>Pending Submissions Queue</span>
          <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-semibold font-mono">
            {submissions.length} Tasks
          </span>
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">Evaluate homework files, leave descriptive feedback, and check code sheets.</p>
      </div>

      {submissions.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-xl border border-white/5 space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">Grading queue is clear!</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            All submitted student assignments have been reviewed and graded.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submissions list sheet */}
          <div className="lg:col-span-2 glass-panel rounded-xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-white/[0.01]">
                    <th className="p-4 pl-6">Student</th>
                    <th className="p-4">Linked Lesson</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {submissions.map((s) => {
                    const isSelected = s.id === selectedSubId;
                    return (
                      <tr key={s.id} className={`hover:bg-white/[0.01] transition-colors ${isSelected ? "bg-indigo-500/5" : ""}`}>
                        {/* Student Name */}
                        <td className="p-4 pl-6">
                          <div>
                            <h4 className="font-bold text-white leading-tight">{s.student.profile?.name || "Student"}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">{s.student.email}</p>
                          </div>
                        </td>

                        {/* Lesson title */}
                        <td className="p-4 text-xs">
                          <p className="font-semibold text-gray-300">{s.assignment.title}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Lesson: {s.assignment.lesson.title}</p>
                        </td>

                        {/* Select details */}
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => {
                              setSelectedSubId(s.id);
                              setFeedbackText("");
                            }}
                            className="px-3.5 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Evaluate Submission
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Evaluation Panel (Conditional) */}
          <div className="lg:col-span-1">
            {selectedSubId ? (() => {
              const sub = submissions.find(s => s.id === selectedSubId);
              if (!sub) return null;

              return (
                <div className="glass-panel p-6 rounded-xl border border-white/5 bg-[#0c0c10]/40 space-y-4 animate-fade-in">
                  <div>
                    <h3 className="text-sm font-bold text-white">Review Evaluation</h3>
                    <p className="text-xs text-gray-400 mt-0.5">For {sub.student.profile?.name || sub.student.email}</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Submission Attachment */}
                    <div className="bg-[#09090b]/50 p-3 rounded-lg border border-white/5">
                      <p className="text-gray-500">Student Comment Note:</p>
                      <p className="text-white mt-1 italic">"{sub.comment || "No comment added."}"</p>
                      <a
                        href={sub.fileUrl}
                        download={`${sub.student.profile?.name || "student"}_submission.pdf`}
                        className="inline-flex items-center space-x-1.5 text-indigo-400 hover:underline mt-2.5 font-semibold"
                      >
                        <span>📁</span>
                        <span>Download Homework Document</span>
                      </a>
                    </div>

                    {/* Feedback Form */}
                    <div className="space-y-1 pt-1">
                      <label className="block text-gray-400 font-semibold">Teacher Evaluation Feedback</label>
                      <textarea
                        placeholder="Leave helpful feedback comments or reasons for adjustments..."
                        className="w-full p-2.5 rounded-lg glass-input text-white min-h-[80px]"
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <button
                      onClick={() => handleGrade(sub.id, "REJECTED")}
                      disabled={loading}
                      className="w-full py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-lg font-semibold transition-colors cursor-pointer"
                    >
                      Reject Submission
                    </button>
                    <button
                      onClick={() => handleGrade(sub.id, "APPROVED")}
                      disabled={loading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-md shadow-emerald-900/10 transition-colors cursor-pointer"
                    >
                      {loading ? "Grading..." : "Approve & Mark"}
                    </button>
                  </div>
                </div>
              );
            })() : (
              <div className="glass-panel p-6 rounded-xl border border-white/5 text-center text-xs text-gray-500 italic py-16">
                Select a student submission from the queue list to start grading.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
