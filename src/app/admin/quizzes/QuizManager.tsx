"use client";

import React, { useState } from "react";
import { deleteAdminQuizAction, createAdminSubjectAction } from "@/services/adminActions";

interface QuizManagerProps {
  quizzes: any[];
  subjects: any[];
}

export default function QuizManager({ quizzes: initialQuizzes, subjects: initialSubjects }: QuizManagerProps) {
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [subjects, setSubjects] = useState(initialSubjects);
  const [loading, setLoading] = useState(false);

  // Subject form state
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [subjectDesc, setSubjectDesc] = useState("");
  const [subjectIcon, setSubjectIcon] = useState("📚");
  const [subjectError, setSubjectError] = useState("");

  const handleDelete = async (quizId: string, quizTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete the quiz "${quizTitle}" and all associated student attempts?`)) return;

    setLoading(true);
    const res = await deleteAdminQuizAction(quizId);
    setLoading(false);

    if (res.success) {
      setQuizzes(quizzes.filter((q) => q.id !== quizId));
    } else {
      alert(res.error || "Failed to delete quiz.");
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      setSubjectError("Subject name is required.");
      return;
    }

    setLoading(true);
    setSubjectError("");

    const res = await createAdminSubjectAction(subjectName, subjectDesc, subjectIcon);

    setLoading(false);
    if (res.success && res.data) {
      setSubjects([...subjects, res.data]);
      setShowSubjectModal(false);
      setSubjectName("");
      setSubjectDesc("");
      setSubjectIcon("📚");
    } else {
      setSubjectError(res.error || "Failed to create subject.");
    }
  };

  return (
    <div className="space-y-6">
      {/* CMS Action Buttons Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Live Quizzes Directory</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-semibold font-mono">
              {quizzes.length} Quizzes
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage curriculum evaluations, subjects, and questions sheets.</p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={() => setShowSubjectModal(true)}
            className="px-4 py-2 border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-colors cursor-pointer"
          >
            + Create Subject
          </button>
          <a
            href="/admin/quizzes/new"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-md shadow-indigo-900/10 transition-colors"
          >
            + Create New Quiz
          </a>
        </div>
      </div>

      {/* Quizzes Table List */}
      <div className="glass-panel rounded-xl overflow-hidden border border-white/5">
        {quizzes.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm space-y-3">
            <p>No quizzes are currently active in AuraAcademy.</p>
            <a href="/admin/quizzes/new" className="inline-block text-indigo-400 hover:underline text-xs">Create the first quiz now →</a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-white/[0.01]">
                  <th className="p-4 pl-6">Quiz Title</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Difficulty</th>
                  <th className="p-4">Parameters</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {quizzes.map((q) => {
                  const diffColor = q.difficulty === "EASY" ? "text-emerald-400" : q.difficulty === "MEDIUM" ? "text-indigo-400" : "text-rose-400";
                  return (
                    <tr key={q.id} className="hover:bg-white/[0.01] transition-colors">
                      {/* Title & Description */}
                      <td className="p-4 pl-6">
                        <div>
                          <h4 className="font-bold text-white leading-tight">{q.title}</h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1 max-w-sm">{q.description}</p>
                        </div>
                      </td>

                      {/* Subject Tag */}
                      <td className="p-4">
                        <span className="inline-flex items-center space-x-1 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded text-xs font-medium text-gray-300">
                          <span>{q.subject.icon || "📚"}</span>
                          <span>{q.subject.name}</span>
                        </span>
                      </td>

                      {/* Difficulty */}
                      <td className="p-4">
                        <span className={`text-xs font-bold ${diffColor}`}>{q.difficulty}</span>
                      </td>

                      {/* Questions Count / Time limit */}
                      <td className="p-4 text-xs text-gray-400 space-y-0.5">
                        <p>Questions: <span className="text-white font-medium">{q.totalQuestions}</span></p>
                        <p>Time Limit: <span className="text-white font-medium">{q.timeLimit ? `${q.timeLimit} mins` : "Unlimited"}</span></p>
                      </td>

                      {/* Action buttons (Delete) */}
                      <td className="p-4 pr-6 text-right">
                        <button
                          disabled={loading}
                          onClick={() => handleDelete(q.id, q.title)}
                          className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Delete Quiz
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Subject Overlay Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <form onSubmit={handleCreateSubject} className="w-full max-w-md bg-[#0c0c10] border border-white/10 p-6 rounded-xl space-y-4 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Create Subject</h3>
              <p className="text-xs text-gray-400 mt-1">Spin up a new category to group related interactive quiz questionnaires.</p>
            </div>

            <div className="space-y-3 text-xs text-gray-300">
              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Subject Title</label>
                <input
                  type="text"
                  placeholder="e.g. Artificial Intelligence"
                  className="w-full px-3 py-2 rounded-lg glass-input text-white"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Description</label>
                <textarea
                  placeholder="e.g. Fundamental paradigms in expert systems and neural models..."
                  className="w-full p-3 rounded-lg glass-input text-white min-h-[60px]"
                  value={subjectDesc}
                  onChange={(e) => setSubjectDesc(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Emoji Icon</label>
                <input
                  type="text"
                  placeholder="e.g. 🤖"
                  className="w-full px-3 py-2 rounded-lg glass-input text-white"
                  value={subjectIcon}
                  onChange={(e) => setSubjectIcon(e.target.value)}
                />
              </div>
            </div>

            {subjectError && <p className="text-xs text-rose-400 font-medium">{subjectError}</p>}

            <div className="flex justify-end space-x-3 text-xs">
              <button
                type="button"
                onClick={() => setShowSubjectModal(false)}
                className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-md shadow-indigo-900/10 transition-colors cursor-pointer"
              >
                {loading ? "Creating..." : "Save Subject"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
