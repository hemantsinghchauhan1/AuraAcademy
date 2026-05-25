"use client";

import React, { useState } from "react";
import { VideoType } from "@prisma/client";
import {
  createAdminModuleAction,
  createAdminLessonAction,
  createAdminAssignmentAction,
  addLessonResourceAction
} from "@/services/courseAdminActions";

interface OutlineBuilderProps {
  course: any;
  quizzes: any[];
}

export default function OutlineBuilder({ course: initialCourse, quizzes }: OutlineBuilderProps) {
  const [course, setCourse] = useState(initialCourse);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modals visibility toggles
  const [activeModal, setActiveModal] = useState<"module" | "lesson" | "assignment" | "resource" | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");

  // 1. Module Form State
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");

  // 2. Lesson Form State
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonVideoType, setLessonVideoType] = useState<VideoType>("YOUTUBE");
  const [lessonQuizId, setLessonQuizId] = useState("");

  // 3. Assignment Form State
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");

  // 4. Resource Form State
  const [resName, setResName] = useState("");
  const [resUrl, setResUrl] = useState("");

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle.trim()) {
      setError("Module title is required.");
      return;
    }

    setLoading(true);
    setError("");

    const order = course.modules.length + 1;
    const res = await createAdminModuleAction({
      courseId: course.id,
      title: moduleTitle,
      description: moduleDesc || undefined,
      order,
      courseSlug: course.slug
    });

    setLoading(false);
    if (res.success && res.data) {
      setCourse({
        ...course,
        modules: [...course.modules, { ...res.data, lessons: [] }]
      });
      setActiveModal(null);
      setModuleTitle("");
      setModuleDesc("");
    } else {
      setError(res.error || "Failed to append module.");
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim() || !lessonContent.trim() || !selectedModuleId) {
      setError("Please complete Lesson Title and Reading Content.");
      return;
    }

    setLoading(true);
    setError("");

    const moduleItem = course.modules.find((m: any) => m.id === selectedModuleId);
    const order = (moduleItem?.lessons.length || 0) + 1;

    const res = await createAdminLessonAction({
      moduleId: selectedModuleId,
      title: lessonTitle,
      content: lessonContent,
      videoUrl: lessonVideoUrl.trim() || undefined,
      videoType: lessonVideoUrl.trim() ? lessonVideoType : undefined,
      order,
      quizId: lessonQuizId === "" ? undefined : lessonQuizId,
      courseSlug: course.slug
    });

    setLoading(false);
    if (res.success && res.data) {
      // Append lesson into state locally
      const updatedModules = course.modules.map((m: any) => {
        if (m.id === selectedModuleId) {
          return {
            ...m,
            lessons: [...m.lessons, { ...res.data, resources: [], assignments: [] }]
          };
        }
        return m;
      });

      setCourse({ ...course, modules: updatedModules });
      setActiveModal(null);
      setLessonTitle("");
      setLessonContent("");
      setLessonVideoUrl("");
      setLessonQuizId("");
    } else {
      setError(res.error || "Failed to add lesson.");
    }
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle.trim() || !assignDesc.trim() || !selectedLessonId) {
      setError("Please complete Assignment Title and Instructions body.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await createAdminAssignmentAction({
      lessonId: selectedLessonId,
      title: assignTitle,
      description: assignDesc,
      dueDate: assignDueDate ? new Date(assignDueDate) : undefined,
      courseSlug: course.slug,
      lessonIdStr: selectedLessonId
    });

    setLoading(false);
    if (res.success && res.data) {
      alert("Assignment successfully attached!");
      setActiveModal(null);
      setAssignTitle("");
      setAssignDesc("");
      setAssignDueDate("");
    } else {
      setError(res.error || "Failed to attach assignment.");
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resName.trim() || !resUrl.trim() || !selectedLessonId) {
      setError("Please specify Resource Name and download URL link.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await addLessonResourceAction({
      lessonId: selectedLessonId,
      name: resName,
      url: resUrl,
      courseSlug: course.slug
    });

    setLoading(false);
    if (res.success && res.data) {
      alert("Study slide resource successfully attached to lesson!");
      setActiveModal(null);
      setResName("");
      setResUrl("");
    } else {
      setError(res.error || "Failed to upload resource link.");
    }
  };

  return (
    <div className="space-y-8">
      {/* CMS Header details */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Course Builder</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">{course.title}</h1>
          <p className="text-gray-400 mt-1">Slug: {course.slug} • Premium status: {course.isPremium ? "TRUE" : "FALSE"}</p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <a
            href="/admin/courses"
            className="px-4 py-2 border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-colors"
          >
            Cancel & Exit
          </a>
          <button
            onClick={() => {
              setActiveModal("module");
              setError("");
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-md shadow-indigo-900/10 transition-colors cursor-pointer"
          >
            + Append Module Outline
          </button>
        </div>
      </div>

      {/* Modules Syllabus outline tree layout */}
      <div className="space-y-6">
        {course.modules.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-xl border border-white/5 space-y-3">
            <p className="text-gray-500 text-sm">No modules have been configured for this course track yet.</p>
            <button
              onClick={() => setActiveModal("module")}
              className="text-indigo-400 hover:underline text-xs"
            >
              Add the first module outline now →
            </button>
          </div>
        ) : (
          course.modules.map((m: any, mIdx: number) => {
            return (
              <div key={m.id} className="glass-panel rounded-xl border border-white/5 overflow-hidden">
                {/* Module Bar */}
                <div className="bg-white/[0.01] px-5 py-4 border-b border-white/5 flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <span className="h-5 w-5 bg-indigo-500/10 rounded flex items-center justify-center text-[10px] text-indigo-400 font-bold border border-indigo-500/20">{mIdx + 1}</span>
                      <span>{m.title}</span>
                    </h3>
                    {m.description && <p className="text-xs text-gray-500 mt-1 max-w-2xl">{m.description}</p>}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedModuleId(m.id);
                      setActiveModal("lesson");
                      setError("");
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    + Add Lesson to Module
                  </button>
                </div>

                {/* Lessons listings */}
                {m.lessons.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500">
                    No lessons configured under this module track yet.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 text-xs text-gray-300">
                    {m.lessons.map((l: any) => (
                      <div key={l.id} className="flex flex-wrap justify-between items-center px-6 py-4 gap-4 hover:bg-white/[0.005]">
                        <div className="space-y-1">
                          <h4 className="font-bold text-white flex items-center space-x-2">
                            <span>🎥</span>
                            <span>{l.title}</span>
                          </h4>
                          {l.videoUrl && (
                            <p className="text-[10px] text-gray-500">Video: <span className="font-mono text-gray-400">{l.videoUrl}</span> ({l.videoType})</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2.5">
                          <button
                            onClick={() => {
                              setSelectedLessonId(l.id);
                              setActiveModal("resource");
                              setError("");
                            }}
                            className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg font-medium transition-colors cursor-pointer"
                          >
                            + Attach Resource
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLessonId(l.id);
                              setActiveModal("assignment");
                              setError("");
                            }}
                            className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg font-medium transition-colors cursor-pointer"
                          >
                            + Attach Assignment
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: ADD MODULE OVERLAY */}
      {activeModal === "module" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <form onSubmit={handleAddModule} className="w-full max-w-md bg-[#0c0c10] border border-white/10 p-6 rounded-xl space-y-4 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Append Module outline</h3>
              <p className="text-xs text-gray-400 mt-1">Spin up a new module section under {course.title}.</p>
            </div>

            <div className="space-y-3 text-xs text-gray-300">
              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Module Title</label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 1: Introduction"
                  required
                  className="w-full px-3 py-2 rounded-lg glass-input text-white"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Overview Description (Optional)</label>
                <textarea
                  placeholder="e.g. Groundworks concepts of linear collections and binary outlines..."
                  className="w-full p-2.5 rounded-lg glass-input text-white min-h-[60px]"
                  value={moduleDesc}
                  onChange={(e) => setModuleDesc(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

            <div className="flex justify-end space-x-3 text-xs pt-1">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-md shadow-indigo-900/10 transition-colors cursor-pointer"
              >
                {loading ? "Adding..." : "Add Module"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: ADD LESSON OVERLAY */}
      {activeModal === "lesson" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <form onSubmit={handleAddLesson} className="w-full max-w-xl bg-[#0c0c10] border border-white/10 p-6 rounded-xl space-y-4 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Add Lesson</h3>
              <p className="text-xs text-gray-400 mt-1">Spin up a new lecture lesson card inside this module outlining guidelines.</p>
            </div>

            <div className="space-y-3 text-xs text-gray-300">
              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Lesson Title</label>
                <input
                  type="text"
                  placeholder="e.g. Lesson 1.2: Binary trees traversals"
                  required
                  className="w-full px-3 py-2 rounded-lg glass-input text-white"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                />
              </div>

              {/* Video configurations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-gray-400 font-semibold">Video URL Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 rounded-lg glass-input text-white"
                    value={lessonVideoUrl}
                    onChange={(e) => setLessonVideoUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400 font-semibold">Video Host Type</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg glass-input text-white cursor-pointer"
                    value={lessonVideoType}
                    onChange={(e) => setLessonVideoType(e.target.value as VideoType)}
                  >
                    <option value="YOUTUBE">YouTube</option>
                    <option value="LOOM">Loom</option>
                    <option value="URL">Direct URL (MP4/CDN)</option>
                  </select>
                </div>
              </div>

              {/* Quiz Selection & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3 space-y-1">
                  <label className="block text-gray-400 font-semibold">Interactive Quiz Attachment (Optional)</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg glass-input text-white cursor-pointer"
                    value={lessonQuizId}
                    onChange={(e) => setLessonQuizId(e.target.value)}
                  >
                    <option value="">None</option>
                    {quizzes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Reading Documentation Notes (Markdown Supported)</label>
                <textarea
                  placeholder="Master BST traversals (Pre-order, In-order, Post-order)..."
                  required
                  className="w-full p-2.5 rounded-lg glass-input text-white min-h-[110px] font-sans"
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

            <div className="flex justify-end space-x-3 text-xs pt-1">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-md shadow-indigo-900/10 transition-colors cursor-pointer"
              >
                {loading ? "Adding..." : "Add Lesson"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: ATTACH ASSIGNMENT OVERLAY */}
      {activeModal === "assignment" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <form onSubmit={handleAddAssignment} className="w-full max-w-md bg-[#0c0c10] border border-white/10 p-6 rounded-xl space-y-4 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Create Assignment Task</h3>
              <p className="text-xs text-gray-400 mt-1">Draft a custom homework task to evaluate lesson comprehension.</p>
            </div>

            <div className="space-y-3 text-xs text-gray-300">
              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Assignment Title</label>
                <input
                  type="text"
                  placeholder="e.g. Trees traversal worksheet homework"
                  required
                  className="w-full px-3 py-2 rounded-lg glass-input text-white"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Instructions Details</label>
                <textarea
                  placeholder="e.g. Implement pre-order recursive algorithms in Java. Submit full source code sheets..."
                  required
                  className="w-full p-2.5 rounded-lg glass-input text-white min-h-[90px]"
                  value={assignDesc}
                  onChange={(e) => setAssignDesc(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Due Date (Optional)</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 rounded-lg glass-input text-white cursor-pointer"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

            <div className="flex justify-end space-x-3 text-xs pt-1">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-md shadow-indigo-900/10 transition-colors cursor-pointer"
              >
                {loading ? "Saving..." : "Attach Assignment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: UPLOAD RESOURCE LINK OVERLAY */}
      {activeModal === "resource" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <form onSubmit={handleAddResource} className="w-full max-w-md bg-[#0c0c10] border border-white/10 p-6 rounded-xl space-y-4 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Upload Lesson Resource</h3>
              <p className="text-xs text-gray-400 mt-1">Add links to presentation slide decks, slides PDF documents, or textbooks.</p>
            </div>

            <div className="space-y-3 text-xs text-gray-300">
              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Resource File Name</label>
                <input
                  type="text"
                  placeholder="e.g. BST Traversal Slides PDF"
                  required
                  className="w-full px-3 py-2 rounded-lg glass-input text-white"
                  value={resName}
                  onChange={(e) => setResName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">File URL Link</label>
                <input
                  type="url"
                  placeholder="e.g. https://www.google.drive/..."
                  required
                  className="w-full px-3 py-2 rounded-lg glass-input text-white"
                  value={resUrl}
                  onChange={(e) => setResUrl(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

            <div className="flex justify-end space-x-3 text-xs pt-1">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-md shadow-indigo-900/10 transition-colors cursor-pointer"
              >
                {loading ? "Saving..." : "Save Resource Link"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
