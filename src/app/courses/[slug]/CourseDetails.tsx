"use client";

import React, { useState } from "react";
import { enrollInCourseAction, addCourseReviewAction } from "@/services/courseActions";

interface CourseDetailsProps {
  course: any;
  userId?: string;
}

export default function CourseDetails({ course: initialCourse, userId }: CourseDetailsProps) {
  const [course, setCourse] = useState(initialCourse);
  const [loading, setLoading] = useState(false);

  // Review state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const handleEnroll = async () => {
    if (!userId) {
      alert("Please sign in to enroll in curriculum courses.");
      return;
    }

    setLoading(true);
    const res = await enrollInCourseAction(course.id, userId);
    setLoading(false);

    if (res.success) {
      setCourse({ ...course, isEnrolled: true });
    } else {
      alert(res.error || "Failed to register enrollment.");
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      alert("Please sign in to leave reviews.");
      return;
    }

    setReviewLoading(true);
    setReviewError("");

    const res = await addCourseReviewAction({
      courseId: course.id,
      userId,
      rating,
      comment,
      courseSlug: course.slug
    });

    setReviewLoading(false);
    if (res.success && res.data) {
      // Reload or append review
      alert("Thank you for your rating feedback!");
      setComment("");
      // Simple reload to fetch updated reviews or just set state
      window.location.reload();
    } else {
      setReviewError(res.error || "Failed to submit review.");
    }
  };

  const totalLessons = course.modules.reduce((sum: number, m: any) => sum + m.lessons.length, 0);
  const ratingSum = course.reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
  const avgRating = course.reviews.length > 0 ? (ratingSum / course.reviews.length).toFixed(1) : "NEW";

  // Get the first lesson to jump to
  const firstLessonId = course.modules[0]?.lessons[0]?.id;

  return (
    <div className="space-y-8">
      {/* Course Hero Glass Banner */}
      <div className="glass-panel p-8 rounded-2xl relative overflow-hidden border border-white/5 bg-gradient-to-tr from-indigo-950/20 to-purple-950/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-4 max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-[10px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${course.isPremium ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
              {course.isPremium ? "Premium Syllabus" : "Free Syllabus"}
            </span>
            <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10 flex items-center space-x-1">
              <span>★</span>
              <span>{avgRating} ({course.reviews.length} reviews)</span>
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight">{course.title}</h1>
          <p className="text-sm text-gray-400 leading-relaxed">{course.description}</p>

          <div className="flex flex-wrap items-center gap-5 text-xs text-gray-500">
            <span>Modules: <span className="text-white font-medium">{course.modules.length}</span></span>
            <span>Lessons: <span className="text-white font-medium">{totalLessons}</span></span>
          </div>
        </div>

        {/* Enrollment action drawer */}
        <div className="w-full md:w-64 bg-[#0c0c10]/40 p-5 rounded-xl border border-white/5 text-center space-y-4 shrink-0">
          {course.isEnrolled ? (
            <div className="space-y-4">
              <div className="space-y-1.5 text-xs text-left">
                <div className="flex justify-between font-medium">
                  <span className="text-gray-400">Class Progress:</span>
                  <span className="text-white">{course.progressPercentage}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{ width: `${course.progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {firstLessonId ? (
                <a
                  href={`/courses/${course.slug}/lessons/${firstLessonId}`}
                  className="flex justify-center items-center w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-900/10 transition-colors"
                >
                  Enter Classroom
                </a>
              ) : (
                <p className="text-xs text-gray-500">No lessons uploaded yet.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Unlock study roadmaps, video lessons, downloadable slide resources, and assignments channels.</p>
              <button
                disabled={loading}
                onClick={handleEnroll}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-900/10 transition-colors cursor-pointer"
              >
                {loading ? "Registering..." : "Enroll in Syllabus Track"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Syllabus Syllabus Layout on Left, reviews on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Syllabus Outline */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              <span>Syllabus Outline & Lessons</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Comprehensive guide structure partitioned into targeted academic checkpoints.</p>
          </div>

          {course.modules.length === 0 ? (
            <div className="glass-panel p-8 text-center rounded-xl border border-white/5 text-gray-500 text-sm">
              Syllabus draft outline is empty. Curriculum assets are coming soon!
            </div>
          ) : (
            <div className="space-y-4">
              {course.modules.map((m: any, mIdx: number) => (
                <div key={m.id} className="glass-panel rounded-xl border border-white/5 overflow-hidden">
                  {/* Module Header card */}
                  <div className="bg-white/[0.01] px-5 py-4 border-b border-white/5 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                        <span className="h-5 w-5 bg-indigo-500/10 rounded flex items-center justify-center text-[10px] text-indigo-400 font-bold border border-indigo-500/20">{mIdx + 1}</span>
                        <span>{m.title}</span>
                      </h3>
                      {m.description && <p className="text-xs text-gray-500 mt-1 max-w-xl">{m.description}</p>}
                    </div>
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400 font-medium">
                      {m.lessons.length} Lessons
                    </span>
                  </div>

                  {/* Lessons Listing within module */}
                  {m.lessons.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-600">
                      No lessons uploaded in this module.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5 text-xs text-gray-300">
                      {m.lessons.map((l: any) => {
                        const lessonUrl = course.isEnrolled
                          ? `/courses/${course.slug}/lessons/${l.id}`
                          : "#";

                        return (
                          <div
                            key={l.id}
                            className={`flex justify-between items-center px-6 py-3.5 ${course.isEnrolled ? "hover:bg-white/[0.01]" : "opacity-60"}`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-base">🎥</span>
                              <div>
                                <h4 className="font-semibold text-white leading-tight">{l.title}</h4>
                              </div>
                            </div>

                            {course.isEnrolled ? (
                              <a
                                href={lessonUrl}
                                className="text-[10px] bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded transition-colors"
                              >
                                Study Lesson
                              </a>
                            ) : (
                              <span className="text-[10px] text-gray-600 flex items-center space-x-1">
                                <span>🔒</span>
                                <span>Locked</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Reviews & Feedback */}
        <div className="lg:col-span-1 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-purple-500"></span>
              <span>Reviews & Ratings</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Student testimonials and course experience ratings.</p>
          </div>

          {/* Leave a review form */}
          {course.isEnrolled && userId && (
            <form onSubmit={handleReviewSubmit} className="glass-panel p-5 rounded-xl border border-white/5 space-y-4">
              <h4 className="text-xs font-bold text-white">Rate Course Performance</h4>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="block text-gray-400">Star Rating</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg glass-input text-white cursor-pointer"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                  >
                    {[5, 4, 3, 2, 1].map((s) => (
                      <option key={s} value={s}>
                        {s} Stars {"★".repeat(s)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400">Comments</label>
                  <textarea
                    placeholder="Provide constructive syllabus track feedback..."
                    className="w-full p-2.5 rounded-lg glass-input text-white min-h-[60px]"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
              </div>

              {reviewError && <p className="text-xs text-rose-400">{reviewError}</p>}

              <button
                type="submit"
                disabled={reviewLoading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-900/10 transition-colors cursor-pointer"
              >
                {reviewLoading ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          )}

          {/* Testimonials List */}
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {course.reviews.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs italic">
                No course reviews logged yet. Be the first to share your experience!
              </div>
            ) : (
              course.reviews.map((rev: any) => (
                <div key={rev.id} className="glass-panel p-4 rounded-lg space-y-2 border border-white/5 bg-white/[0.01]">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded">
                      {"★".repeat(rev.rating)}
                    </span>
                    <span className="text-[9px] text-gray-500">{new Date(rev.createdAt).toLocaleDateString()}</span>
                  </div>
                  {rev.comment && <p className="text-xs text-gray-300 italic">"{rev.comment}"</p>}
                  <p className="text-[10px] text-gray-500">By: {rev.user.profile?.name || rev.user.email}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
