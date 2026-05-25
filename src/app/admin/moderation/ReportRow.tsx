"use client";

import React, { useState } from "react";
import { resolveReportAction } from "@/services/adminActions";

interface ReportRowProps {
  report: {
    id: string;
    reason: string;
    details: string | null;
    status: string;
    createdAt: Date | string;
    postId?: string | null;
    commentId?: string | null;
    reporter: {
      email: string;
      profile: { name: string } | null;
    };
    post?: {
      id: string;
      title: string;
      content: string;
      user: {
        email: string;
        profile: { name: string } | null;
      };
    } | null;
    comment?: {
      id: string;
      text: string;
      user: {
        email: string;
        profile: { name: string } | null;
      };
    } | null;
  };
}

export default function ReportRow({ report }: ReportRowProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleAction = async (action: "DISMISS" | "REMOVE_CONTENT") => {
    if (!reason.trim()) {
      setError("Please specify a reason for this resolution action.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await resolveReportAction(report.id, action, reason);

    setLoading(false);
    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || "Failed to execute resolution action.");
    }
  };

  if (success) {
    return (
      <div className="glass-panel border-emerald-500/20 p-4 rounded-xl text-center text-sm text-emerald-400 font-medium animate-pulse">
        ✓ Report successfully resolved and logged.
      </div>
    );
  }

  const isPost = !!report.postId;
  const targetAuthor = isPost
    ? report.post?.user.profile?.name || report.post?.user.email
    : report.comment?.user.profile?.name || report.comment?.user.email;

  const contentSnippet = isPost ? report.post?.content : report.comment?.text;
  const postTitle = isPost ? report.post?.title : "Comment Thread";

  return (
    <div className="glass-panel p-6 rounded-xl border border-white/5 space-y-4 hover:border-white/10 transition-colors">
      {/* Header Info */}
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-white/5 pb-3">
        <div className="flex items-center space-x-2.5">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isPost ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"}`}>
            {isPost ? "Post Flagged" : "Comment Flagged"}
          </span>
          <span className="text-xs text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10 uppercase tracking-wider">
            {report.reason}
          </span>
        </div>
        <span className="text-[10px] text-gray-500">Flagged: {new Date(report.createdAt).toLocaleString()}</span>
      </div>

      {/* Reported Content Card */}
      <div className="bg-[#09090b]/50 p-4 rounded-lg border border-white/5">
        <p className="text-xs text-gray-500 font-medium">Flagged Content (by {targetAuthor}):</p>
        {isPost && <h4 className="text-sm font-bold text-white mt-1.5">{postTitle}</h4>}
        <p className="text-sm text-gray-300 mt-1 italic font-serif leading-relaxed line-clamp-3">
          "{contentSnippet}"
        </p>
      </div>

      {/* Reporter Metadata */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>Reporter: <span className="text-white">{report.reporter.profile?.name || report.reporter.email}</span></p>
        {report.details && (
          <p className="bg-white/[0.02] p-2.5 rounded border border-white/5 mt-1 font-sans text-gray-300">
            <span className="font-semibold text-gray-400">Reporter's Note:</span> {report.details}
          </p>
        )}
      </div>

      {/* Action Controls */}
      <div className="space-y-3 pt-2">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Specify reason for moderation action..."
            className="flex-1 px-3 py-2 text-xs rounded-lg glass-input text-white"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
          />
        </div>

        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

        <div className="flex justify-end space-x-3 text-xs">
          <button
            onClick={() => handleAction("DISMISS")}
            disabled={loading}
            className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Dismiss Report
          </button>
          <button
            onClick={() => handleAction("REMOVE_CONTENT")}
            disabled={loading}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium shadow-md shadow-rose-900/10 transition-colors cursor-pointer"
          >
            {loading ? "Deleting..." : "Delete & Ban Content"}
          </button>
        </div>
      </div>
    </div>
  );
}
