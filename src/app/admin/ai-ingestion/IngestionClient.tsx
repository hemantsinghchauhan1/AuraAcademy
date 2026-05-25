"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Plus,
  Edit3,
  BookOpen,
  Tag,
  ExternalLink,
  Clock,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileCode
} from "lucide-react";

interface SubjectChoice {
  id: string;
  name: string;
  code: string | null;
}

interface IngestionJob {
  id: string;
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  status: "PENDING" | "PARSING" | "EXTRACTING" | "CLASSIFYING" | "DRAFT" | "PUBLISHED" | "FAILED";
  error: string | null;
  extractedText: string | null;
  parsingStages: string | null;
  retryCount: number;
  detectedTrack: string | null;
  detectedSubject: string | null;
  detectedLevel: string | null;
  subjectId: string | null;
  draftQuizTitle: string | null;
  draftQuizDesc: string | null;
  draftQuestions: string | null;
  createdAt: string;
  updatedAt: string;
  subject?: SubjectChoice | null;
  uploadedBy?: { id: string; email: string; profile?: { name: string } | null } | null;
}

interface IngestionClientProps {
  initialJobs: IngestionJob[];
  subjects: SubjectChoice[];
}

export default function IngestionClient({ initialJobs, subjects }: IngestionClientProps) {
  const [jobs, setJobs] = useState<IngestionJob[]>(initialJobs);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    initialJobs.length > 0 ? initialJobs[0].id : null
  );

  // Upload state
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Job editing states
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editQuestions, setEditQuestions] = useState<any[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const activeJob = jobs.find((j) => j.id === selectedJobId) || null;

  // Initialize edit fields when selected job changes
  useEffect(() => {
    if (activeJob) {
      setEditTitle(activeJob.draftQuizTitle || `Quiz - ${activeJob.fileName}`);
      setEditDesc(activeJob.draftQuizDesc || "Concept review quiz generated via AI ingestion.");
      setEditSubjectId(activeJob.subjectId || "");
      setPublishSuccess(null);
      if (activeJob.draftQuestions) {
        try {
          setEditQuestions(JSON.parse(activeJob.draftQuestions));
        } catch {
          setEditQuestions([]);
        }
      } else {
        setEditQuestions([]);
      }
    } else {
      setEditTitle("");
      setEditDesc("");
      setEditSubjectId("");
      setEditQuestions([]);
      setPublishSuccess(null);
    }
  }, [selectedJobId, activeJob]);

  // Polling for processing jobs
  useEffect(() => {
    const runningJobs = jobs.filter(
      (j) => j.status === "PENDING" || j.status === "PARSING" || j.status === "EXTRACTING" || j.status === "CLASSIFYING"
    );

    if (runningJobs.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/ai-ingestion");
        const data = await res.json();
        if (data.success) {
          setJobs(data.jobs);
        }
      } catch (err) {
        console.error("Polling job status failed:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs]);

  // File drop/upload handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setUploadError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setUploadProgress(10);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadProgress(40);
      const res = await fetch("/api/admin/ai-ingestion", {
        method: "POST",
        body: formData,
      });
      setUploadProgress(80);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "File upload failed");
      }

      // Fetch refreshed jobs list
      const jobsRes = await fetch("/api/admin/ai-ingestion");
      const jobsData = await jobsRes.json();
      if (jobsData.success) {
        setJobs(jobsData.jobs);
        setSelectedJobId(data.jobId);
      }
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 1000);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Failed to process file upload.");
      setUploadProgress(null);
    }
  };

  // Draft review actions
  const handleSaveDraft = async () => {
    if (!selectedJobId) return;
    setIsSavingDraft(true);
    try {
      const res = await fetch(`/api/admin/ai-ingestion/${selectedJobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
          subjectId: editSubjectId,
          questions: editQuestions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setJobs((prev) => prev.map((j) => (j.id === selectedJobId ? data.job : j)));
      }
    } catch (err) {
      console.error("Failed to save draft:", err);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedJobId) return;
    if (!editSubjectId) {
      alert("Please map this quiz to a database subject before publishing.");
      return;
    }

    setIsPublishing(true);
    setPublishSuccess(null);

    try {
      // First save current draft changes
      await fetch(`/api/admin/ai-ingestion/${selectedJobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
          subjectId: editSubjectId,
          questions: editQuestions,
        }),
      });

      const res = await fetch(`/api/admin/ai-ingestion/${selectedJobId}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Publish failed");
      }

      setPublishSuccess(data.message);
      
      // Update jobs list in state
      const jobsRes = await fetch("/api/admin/ai-ingestion");
      const jobsData = await jobsRes.json();
      if (jobsData.success) {
        setJobs(jobsData.jobs);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to publish quiz.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUpdateQuestion = (qIndex: number, fields: any) => {
    const updated = [...editQuestions];
    updated[qIndex] = { ...updated[qIndex], ...fields };
    setEditQuestions(updated);
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...editQuestions];
    const opts = [...updated[qIndex].options];
    opts[optIndex] = { ...opts[optIndex], text };
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setEditQuestions(updated);
  };

  const handleAddQuestion = () => {
    const newQ = {
      questionText: "New Question",
      type: "MCQ",
      options: [
        { label: "A", text: "Option A" },
        { label: "B", text: "Option B" },
        { label: "C", text: "Option C" },
        { label: "D", text: "Option D" },
      ],
      correctAnswer: "A",
      explanation: "Explanation...",
      difficulty: "MEDIUM",
      tags: ["general"],
    };
    setEditQuestions([...editQuestions, newQ]);
  };

  const handleDeleteQuestion = (qIndex: number) => {
    const updated = editQuestions.filter((_, i) => i !== qIndex);
    setEditQuestions(updated);
  };

  // Helper formatting values
  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; style: string }> = {
      PENDING: { label: "Uploading", style: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
      PARSING: { label: "Extracting Text", style: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse" },
      EXTRACTING: { label: "Structuring", style: "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse" },
      CLASSIFYING: { label: "Detecting Subject", style: "bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse" },
      DRAFT: { label: "Awaiting Review", style: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
      PUBLISHED: { label: "Published", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      FAILED: { label: "Failed", style: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
    };
    const item = map[status] || { label: status, style: "bg-gray-500/10 text-gray-400 border-gray-500/20" };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.style}`}>
        {item.label}
      </span>
    );
  };

  // Parse stages JSON
  const getStagesList = (job: IngestionJob) => {
    if (!job.parsingStages) return [];
    try {
      return JSON.parse(job.parsingStages);
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-indigo-400" />
          AI Ingestion Control Hub
        </h1>
        <p className="text-gray-400 mt-1">
          Upload notes, assignments, mock papers, and PDFs to parse questions and publish interactive quizzes automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Upload & Job History Feed (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Uploader Box */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`glass-panel p-6 rounded-xl border-2 border-dashed text-center transition-all ${
              isDragActive
                ? "border-indigo-500 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                : "border-white/10 hover:border-white/20 bg-white/[0.01]"
            }`}
          >
            <UploadCloud className="h-10 w-10 mx-auto text-indigo-400 mb-3" />
            <h3 className="text-sm font-bold text-white">Upload Syllabus Document</h3>
            <p className="text-xs text-gray-500 mt-1">PDF, DOCX, or TXT (Max 15MB)</p>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadProgress !== null}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-md transition-colors cursor-pointer"
            >
              {uploadProgress !== null ? "Uploading..." : "Select File"}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.docx,.txt"
              className="hidden"
            />

            {uploadProgress !== null && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Uploading to safe buffer...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadError && (
              <div className="mt-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 flex items-center gap-1.5 justify-center">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Jobs List Feed */}
          <div className="glass-panel p-5 rounded-xl space-y-4">
            <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Ingestion Feed Queue</h2>
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {jobs.map((job) => {
                  const isActive = job.id === selectedJobId;
                  const dateStr = new Date(job.createdAt).toLocaleDateString([], { month: "short", day: "numeric" });
                  return (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`w-full text-left p-3.5 rounded-lg border transition-all flex flex-col gap-2 relative overflow-hidden group cursor-pointer ${
                        isActive
                          ? "bg-indigo-950/20 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                          : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <span className="text-xs font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                          {job.fileName}
                        </span>
                        {getStatusBadge(job.status)}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {dateStr}
                        </span>
                        <span>{(job.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Job Details & Workspace (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {!activeJob ? (
            <div className="glass-panel p-12 text-center rounded-xl border border-white/5 bg-white/[0.005]">
              <FileCode className="h-12 w-12 mx-auto text-gray-700 mb-3" />
              <h3 className="text-sm font-bold text-gray-400">No Document Selected</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-[280px] mx-auto">
                Select an uploaded job from the left sidebar or upload a new file to begin structuring quiz content.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="glass-panel p-5 rounded-xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20 shrink-0">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-white truncate">{activeJob.fileName}</h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Uploaded by {(activeJob as any).uploadedBy?.profile?.name || (activeJob as any).uploadedBy?.email || "Admin"} on {new Date(activeJob.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeJob.status === "DRAFT" && (
                    <button
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {isPublishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {isPublishing ? "Publishing..." : "Approve & Publish"}
                    </button>
                  )}
                </div>
              </div>

              {/* Status Timeline */}
              {activeJob.status !== "PUBLISHED" && activeJob.status !== "FAILED" && activeJob.status !== "DRAFT" && (
                <div className="glass-panel p-6 rounded-xl border border-white/5 space-y-4">
                  <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing AI Pipeline
                  </h3>
                  <div className="space-y-4 pl-2 mt-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
                    {getStagesList(activeJob).map((stage: any, idx: number) => {
                      const isComplete = stage.status === "completed";
                      const isRunning = stage.status === "running";
                      return (
                        <div key={idx} className="flex items-start gap-4 relative">
                          <div className={`h-6.5 w-6.5 rounded-full border flex items-center justify-center shrink-0 ${
                            isComplete ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" :
                            isRunning ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400 animate-pulse" :
                            "bg-white/5 border-white/5 text-gray-600"
                          }`}>
                            {isComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                          </div>
                          <div>
                            <p className={`text-xs font-bold ${isRunning ? "text-indigo-400 animate-pulse" : isComplete ? "text-white" : "text-gray-500"}`}>
                              {stage.stage}
                            </p>
                            {stage.timestamp && (
                              <p className="text-[9px] text-gray-600 mt-0.5">
                                {new Date(stage.timestamp).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FAILED VIEW */}
              {activeJob.status === "FAILED" && (
                <div className="glass-panel p-8 rounded-xl border border-rose-500/20 bg-rose-500/[0.02] text-center space-y-4">
                  <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Ingestion Failure</h3>
                    <p className="text-xs text-rose-400/80 mt-1 max-w-md mx-auto">
                      {activeJob.error || "An error occurred while parsing the document."}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Simulating upload again for retry
                      if (activeJob.fileUrl) {
                        alert("Triggering retry... Files are re-analyzed instantly.");
                        // To test, simple reload works
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-xs font-bold text-indigo-400 transition-all cursor-pointer"
                  >
                    Retry Ingestion
                  </button>
                </div>
              )}

              {/* PUBLISHED VIEW */}
              {activeJob.status === "PUBLISHED" && (
                <div className="glass-panel p-8 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] text-center space-y-4">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
                  <div>
                    <h3 className="text-base font-bold text-white">Quiz Published Successfully!</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                      All structured questions, option listings, correct answers, and subject mappings have been committed to live databases.
                    </p>
                  </div>
                  {publishSuccess && (
                    <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 inline-block font-medium">
                      {publishSuccess}
                    </div>
                  )}
                  <div className="pt-2">
                    <a
                      href="/admin/quizzes"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md transition-colors inline-flex items-center gap-1.5"
                    >
                      Go to Quizzes CMS <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* DRAFT REVIEW WORKSPACE */}
              {activeJob.status === "DRAFT" && (
                <div className="space-y-6">
                  {/* General Config */}
                  <div className="glass-panel p-6 rounded-xl border border-white/5 space-y-4">
                    <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Edit3 className="h-3.5 w-3.5" /> General Quiz Configuration
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Quiz Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-[#09090b]/80 border border-white/5 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Subject Mapping</label>
                        <select
                          value={editSubjectId}
                          onChange={(e) => setEditSubjectId(e.target.value)}
                          className="w-full bg-[#09090b]/80 border border-white/5 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white outline-none"
                        >
                          <option value="">-- Match Subject --</option>
                          {subjects.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name} {sub.code ? `(${sub.code})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Description</label>
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={2}
                        className="w-full bg-[#09090b]/80 border border-white/5 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white outline-none resize-none"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div className="flex gap-2">
                        {activeJob.detectedTrack && (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/10 text-[9px] font-bold text-indigo-400">
                            Track: {activeJob.detectedTrack}
                          </span>
                        )}
                        {activeJob.detectedLevel && (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/10 text-[9px] font-bold text-indigo-400">
                            Level: {activeJob.detectedLevel}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleSaveDraft}
                        disabled={isSavingDraft}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-bold border border-white/5 transition-all cursor-pointer"
                      >
                        {isSavingDraft ? "Saving..." : "Save Draft Changes"}
                      </button>
                    </div>
                  </div>

                  {/* Questions Editor Feed */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                        Structured Questions ({editQuestions.length})
                      </h3>
                      <button
                        onClick={handleAddQuestion}
                        className="px-2.5 py-1 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Question
                      </button>
                    </div>

                    {editQuestions.length === 0 ? (
                      <div className="glass-panel p-6 text-center rounded-xl border border-white/5 text-gray-500 text-xs">
                        No questions in this draft. Add a question card to build your quiz.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {editQuestions.map((q, qIdx) => (
                          <div key={qIdx} className="glass-panel p-5 rounded-xl border border-white/5 bg-[#0e0e12]/30 space-y-4 relative group">
                            <button
                              onClick={() => handleDeleteQuestion(qIdx)}
                              className="absolute top-4 right-4 p-1.5 rounded text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Delete Question"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            <div className="flex items-center gap-2">
                              <span className="h-5 w-5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center">
                                {qIdx + 1}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-semibold text-gray-400">
                                {q.type || "MCQ"}
                              </span>
                            </div>

                            {/* Question text */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-gray-500 uppercase">Question Text</label>
                              <input
                                type="text"
                                value={q.questionText}
                                onChange={(e) => handleUpdateQuestion(qIdx, { questionText: e.target.value })}
                                className="w-full bg-[#09090b]/80 border border-white/5 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white outline-none"
                              />
                            </div>

                            {/* Options Editor */}
                            {q.options && q.options.length > 0 && (
                              <div className="space-y-2">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">Options & Correct Answer</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {q.options.map((opt: any, optIdx: number) => {
                                    const isCorrect = q.correctAnswer === opt.label;
                                    return (
                                      <div key={optIdx} className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleUpdateQuestion(qIdx, { correctAnswer: opt.label })}
                                          className={`h-5 w-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                                            isCorrect
                                              ? "bg-emerald-500 border-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                              : "border-white/20 text-gray-400 hover:border-white/40"
                                          }`}
                                        >
                                          {opt.label}
                                        </button>
                                        <input
                                          type="text"
                                          value={opt.text}
                                          onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                                          className="flex-1 bg-[#09090b]/80 border border-white/5 focus:border-indigo-500 rounded-lg p-2 text-xs text-white outline-none"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Explanation, Difficulty & Tags */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">Difficulty</label>
                                <select
                                  value={q.difficulty || "MEDIUM"}
                                  onChange={(e) => handleUpdateQuestion(qIdx, { difficulty: e.target.value })}
                                  className="w-full bg-[#09090b]/80 border border-white/5 focus:border-indigo-500 rounded-lg p-2 text-xs text-white outline-none"
                                >
                                  <option value="EASY">Easy</option>
                                  <option value="MEDIUM">Medium</option>
                                  <option value="HARD">Hard</option>
                                </select>
                              </div>

                              <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">Concept Tags (Comma separated)</label>
                                <input
                                  type="text"
                                  value={Array.isArray(q.tags) ? q.tags.join(", ") : q.tags || ""}
                                  onChange={(e) => handleUpdateQuestion(qIdx, { tags: e.target.value.split(",").map((s: string) => s.trim()) })}
                                  className="w-full bg-[#09090b]/80 border border-white/5 focus:border-indigo-500 rounded-lg p-2 text-xs text-white outline-none"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-gray-500 uppercase">Explanation</label>
                              <textarea
                                value={q.explanation || ""}
                                onChange={(e) => handleUpdateQuestion(qIdx, { explanation: e.target.value })}
                                rows={2}
                                className="w-full bg-[#09090b]/80 border border-white/5 focus:border-indigo-500 rounded-lg p-2 text-xs text-white outline-none resize-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
