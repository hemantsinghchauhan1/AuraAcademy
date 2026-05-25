"use client";

import React, { useState, useEffect, useRef } from "react";
import { saveLessonProgressAction, submitAssignmentAction } from "@/services/courseActions";

interface ClassroomPlayerProps {
  lesson: any;
  courseOutline: any; // complete course structure for side panel
  userId: string;
}

export default function ClassroomPlayer({ lesson: initialLesson, courseOutline, userId }: ClassroomPlayerProps) {
  const [lesson, setLesson] = useState(initialLesson);
  const [activeTab, setActiveTab] = useState<"reading" | "resources" | "assignment">("reading");

  // Assignment submissions state
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [assignmentComment, setAssignmentComment] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Video watch tracker states
  const [completed, setCompleted] = useState(lesson.progress?.completed || false);
  const [watchTime, setWatchTime] = useState(lesson.progress?.watchTime || 0);

  const nativeVideoRef = useRef<HTMLVideoElement>(null);
  const watchTimerRef = useRef<any>(null);

  // Auto-save watch state periodically
  const saveProgress = async (currentTime: number, markComplete: boolean) => {
    await saveLessonProgressAction({
      lessonId: lesson.id,
      userId,
      watchTime: Math.round(currentTime),
      completed: markComplete,
      courseSlug: lesson.courseSlug
    });
  };

  // Video progress event handlers (for native HTML5 player)
  const handleTimeUpdate = () => {
    if (nativeVideoRef.current) {
      const currentTime = nativeVideoRef.current.currentTime;
      setWatchTime(currentTime);

      // Periodically auto-save every 10 seconds
      if (Math.round(currentTime) % 10 === 0) {
        saveProgress(currentTime, completed);
      }
    }
  };

  const handleEnded = () => {
    setCompleted(true);
    if (nativeVideoRef.current) {
      saveProgress(nativeVideoRef.current.duration, true);
    }
  };

  // Manual fallback toggler for YouTube/Loom embeds (as direct API watch state inside secure iframe boundaries is blocked)
  const handleManualCompletion = async () => {
    const nextCompleted = !completed;
    setCompleted(nextCompleted);
    await saveProgress(watchTime, nextCompleted);
  };

  // Cleanup timers on mount
  useEffect(() => {
    setLesson(initialLesson);
    setCompleted(initialLesson.progress?.completed || false);
    setWatchTime(initialLesson.progress?.watchTime || 0);
    setUploadSuccess(false);
    setUploadError("");
    setAssignmentFile(null);
    setAssignmentComment("");

    return () => {
      if (watchTimerRef.current) clearInterval(watchTimerRef.current);
    };
  }, [initialLesson]);

  // Homework file changes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== "application/pdf" && !selected.type.startsWith("image/")) {
        setUploadError("Please upload a valid PDF or Image file submission.");
        return;
      }
      setAssignmentFile(selected);
      setUploadError("");
    }
  };

  const handleAssignmentSubmit = async (e: React.FormEvent, assignmentId: string) => {
    e.preventDefault();
    if (!assignmentFile) {
      setUploadError("Please select a homework PDF or Image slides payload.");
      return;
    }

    setUploadLoading(true);
    setUploadError("");
    setUploadSuccess(false);

    // Read file as Base64 Data URL for functional student demo
    const reader = new FileReader();
    reader.readAsDataURL(assignmentFile);
    reader.onload = async () => {
      const base64Data = reader.result as string;

      const res = await submitAssignmentAction({
        assignmentId,
        studentId: userId,
        fileUrl: base64Data,
        comment: assignmentComment,
        courseSlug: lesson.courseSlug,
        lessonId: lesson.id
      });

      setUploadLoading(false);
      if (res.success) {
        setUploadSuccess(true);
        setAssignmentFile(null);
        setAssignmentComment("");
        // Reload lesson state to update submission panel
        window.location.reload();
      } else {
        setUploadError(res.error || "Failed to submit assignment.");
      }
    };

    reader.onerror = () => {
      setUploadError("Failed to read task file payload.");
      setUploadLoading(false);
    };
  };

  // Video renderer routing
  const renderVideoPlayer = () => {
    if (!lesson.videoUrl) return null;

    if (lesson.videoType === "YOUTUBE") {
      // Parse YouTube ID
      let videoId = "";
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = lesson.videoUrl.match(regExp);
      if (match && match[2].length === 11) {
        videoId = match[2];
      }

      return (
        <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/5 bg-[#09090b]">
          {videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
              className="w-full h-full"
              allowFullScreen
              title={lesson.title}
            ></iframe>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              Invalid YouTube link format.
            </div>
          )}
        </div>
      );
    }

    if (lesson.videoType === "LOOM") {
      // Parse Loom Embed link
      let loomEmbedUrl = lesson.videoUrl;
      if (lesson.videoUrl.includes("loom.com/share")) {
        loomEmbedUrl = lesson.videoUrl.replace("loom.com/share", "loom.com/embed");
      }

      return (
        <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/5 bg-[#09090b]">
          <iframe
            src={loomEmbedUrl}
            className="w-full h-full"
            allowFullScreen
            title={lesson.title}
          ></iframe>
        </div>
      );
    }

    // Direct Mp4 URL or CDN links
    return (
      <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/5 bg-[#09090b]">
        <video
          ref={nativeVideoRef}
          src={lesson.videoUrl}
          controls
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          className="w-full h-full"
        ></video>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-screen border-t border-white/5">
      {/* 1. Left Outline Sidebar (Discord/Notion Style) */}
      <aside className="w-full lg:w-72 bg-[#0c0c10]/95 backdrop-blur border-b lg:border-b-0 lg:border-r border-white/5 p-5 flex flex-col justify-between shrink-0 max-h-[85vh] overflow-y-auto">
        <div className="space-y-6">
          <div>
            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Curriculum Outline</span>
            <h3 className="text-sm font-bold text-white leading-tight mt-1 truncate">{lesson.courseTitle}</h3>
          </div>

          <div className="space-y-4">
            {courseOutline.modules.map((m: any, mIdx: number) => (
              <div key={m.id} className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="h-4 w-4 bg-white/5 rounded flex items-center justify-center text-[8px] font-bold text-gray-400">{mIdx + 1}</span>
                  <span className="truncate max-w-[200px]">{m.title}</span>
                </h4>

                <div className="space-y-0.5 pl-2 border-l border-white/5 ml-2">
                  {m.lessons.map((l: any) => {
                    const isCurrent = l.id === lesson.id;
                    return (
                      <a
                        key={l.id}
                        href={`/courses/${lesson.courseSlug}/lessons/${l.id}`}
                        className={`flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${isCurrent ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20" : "text-gray-400 hover:text-white hover:bg-white/[0.02]"}`}
                      >
                        <span className="text-sm shrink-0">🎥</span>
                        <span className="truncate">{l.title}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* 2. Right Workspace Classroom */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
        {/* Lesson Lecture Banner Header */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{lesson.title}</h1>
            <p className="text-xs text-gray-400 mt-1">Classroom lecture module under {lesson.courseTitle}.</p>
          </div>

          {/* Mark completed tracker */}
          <button
            onClick={handleManualCompletion}
            className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${completed ? "bg-emerald-600/10 border-emerald-500/20 text-emerald-400" : "bg-indigo-600/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20"}`}
          >
            {completed ? "✓ Lesson Completed" : "Mark as Complete"}
          </button>
        </div>

        {/* Dynamic Video Player */}
        {renderVideoPlayer()}

        {/* Workspace details & Tab Selection */}
        <div className="space-y-4 pt-4">
          <div className="flex border-b border-white/5 space-x-6 text-sm font-semibold">
            <button
              onClick={() => setActiveTab("reading")}
              className={`pb-3 transition-colors cursor-pointer ${activeTab === "reading" ? "border-b-2 border-indigo-500 text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              📖 Reading Materials
            </button>
            <button
              onClick={() => setActiveTab("resources")}
              className={`pb-3 transition-colors cursor-pointer ${activeTab === "resources" ? "border-b-2 border-indigo-500 text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              📚 Slide Resources ({lesson.resources.length})
            </button>
            <button
              onClick={() => setActiveTab("assignment")}
              className={`pb-3 transition-colors cursor-pointer ${activeTab === "assignment" ? "border-b-2 border-indigo-500 text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              📝 Assignment Submissions
            </button>
          </div>

          {/* Tab 1: Reading Documentation Markdown */}
          {activeTab === "reading" && (
            <div className="glass-panel p-6 rounded-xl border border-white/5 bg-[#0c0c10]/40 prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed font-sans space-y-4">
              <div className="border-b border-white/5 pb-2">
                <h4 className="font-bold text-white">Lecture Core Notes</h4>
              </div>
              <p className="whitespace-pre-wrap">{lesson.content}</p>

              {/* Linked quiz check card */}
              {lesson.quiz && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 flex justify-between items-center mt-6">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-white">Interactive Assessment Attachment</h5>
                    <p className="text-[11px] text-gray-400">Complete the quiz "{lesson.quiz.title}" ({lesson.quiz.totalQuestions} questions) to test your module mastery!</p>
                  </div>
                  <a
                    href={`/quiz/${lesson.quiz.id}`}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-900/10 transition-colors"
                  >
                    Start Quiz
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Downloadable Resources list */}
          {activeTab === "resources" && (
            <div className="glass-panel p-6 rounded-xl border border-white/5 space-y-4 bg-[#0c0c10]/40">
              <h3 className="text-xs font-bold text-white">Curriculum Resources</h3>
              {lesson.resources.length === 0 ? (
                <p className="text-xs text-gray-500">No additional study slides uploaded for this lesson module.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lesson.resources.map((res: any) => (
                    <div key={res.id} className="border border-white/5 bg-white/[0.01] p-3 rounded-lg flex justify-between items-center hover:border-white/10 transition-colors">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-base">📁</span>
                        <span className="text-white font-medium truncate max-w-[200px]">{res.name}</span>
                      </div>
                      <a
                        href={res.url}
                        download
                        className="text-[10px] bg-white/5 hover:bg-white/10 text-white border border-white/10 px-2.5 py-1 rounded transition-colors"
                      >
                        Download File
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Assignments Submission details */}
          {activeTab === "assignment" && (
            <div className="space-y-6">
              {lesson.assignments.length === 0 ? (
                <div className="glass-panel p-6 rounded-xl border border-white/5 text-center text-xs text-gray-500">
                  No homework assignments are registered for this lesson module.
                </div>
              ) : (
                lesson.assignments.map((assignment: any) => {
                  const sub = assignment.studentSubmission;

                  return (
                    <div key={assignment.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: Assignment Instructions */}
                      <div className="glass-panel p-6 rounded-xl border border-white/5 bg-[#0c0c10]/40 space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-white">{assignment.title}</h4>
                          {assignment.dueDate && (
                            <p className="text-[10px] text-gray-500 mt-0.5">Deadline: <span className="text-indigo-400 font-semibold">{new Date(assignment.dueDate).toLocaleDateString()}</span></p>
                          )}
                        </div>
                        <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed bg-black/30 p-3 rounded-lg border border-white/5">
                          {assignment.description}
                        </p>
                      </div>

                      {/* Right: Submission dropzone portal */}
                      <div className="glass-panel p-6 rounded-xl border border-white/5 bg-[#0c0c10]/40 space-y-4">
                        <h4 className="text-xs font-bold text-white border-b border-white/5 pb-2">Your Homework Submission</h4>

                        {/* Existing Submission Details card */}
                        {sub && (
                          <div className="border border-white/5 bg-white/[0.01] p-3.5 rounded-lg text-xs space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">Status Check:</span>
                              <span className={`px-2 py-0.5 font-bold uppercase tracking-wider text-[9px] rounded ${sub.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : sub.status === "REJECTED" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"}`}>
                                {sub.status}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-gray-500">Submitted file:</span>
                              <a href={sub.fileUrl} download="submission.pdf" className="text-indigo-400 hover:underline">Download file attachment</a>
                            </div>
                            {sub.feedback && (
                              <div className="bg-indigo-500/5 p-2.5 rounded border border-indigo-500/10 mt-1">
                                <p className="font-bold text-[10px] text-gray-400">Teacher Evaluation Feedback:</p>
                                <p className="text-xs text-indigo-300 italic mt-0.5">"{sub.feedback}"</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Submission upload Form (Allow upload if not approved) */}
                        {(!sub || sub.status !== "APPROVED") && (
                          <form onSubmit={(e) => handleAssignmentSubmit(e, assignment.id)} className="space-y-4">
                            <div className="space-y-3 text-xs text-gray-300">
                              <div className="space-y-1">
                                <label className="block text-gray-400 font-semibold">Select Submission (PDF or Image)</label>
                                <input
                                  type="file"
                                  accept="application/pdf,image/*"
                                  required
                                  onChange={handleFileChange}
                                  className="w-full px-3 py-2 rounded-lg glass-input text-white cursor-pointer"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-gray-400 font-semibold">Short Note (Optional)</label>
                                <textarea
                                  placeholder="Leave optional commentary notes for evaluation reviews..."
                                  className="w-full p-2.5 rounded-lg glass-input text-white min-h-[50px]"
                                  value={assignmentComment}
                                  onChange={(e) => setAssignmentComment(e.target.value)}
                                />
                              </div>
                            </div>

                            {uploadError && <p className="text-xs text-rose-400 font-medium">{uploadError}</p>}
                            {uploadSuccess && <p className="text-xs text-emerald-400 font-medium">✓ Submission successfully uploaded!</p>}

                            <button
                              type="submit"
                              disabled={uploadLoading}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-900/10 transition-colors cursor-pointer"
                            >
                              {uploadLoading ? "Uploading..." : sub ? "Re-submit Homework" : "Submit Homework File"}
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
