"use client";

import React, { useState } from "react";
import { updateCoursePublishStateAction, deleteAdminCourseAction } from "@/services/courseAdminActions";

interface CoursesPanelProps {
  courses: any[];
}

export default function CoursesPanel({ courses: initialCourses }: CoursesPanelProps) {
  const [courses, setCourses] = useState(initialCourses);
  const [loading, setLoading] = useState(false);

  const handleTogglePublish = async (courseId: string, currentPublished: boolean, courseSlug: string) => {
    setLoading(true);
    const nextPublished = !currentPublished;
    const res = await updateCoursePublishStateAction(courseId, nextPublished, courseSlug);
    setLoading(false);

    if (res.success) {
      setCourses(courses.map(c => c.id === courseId ? { ...c, isPublished: nextPublished } : c));
    } else {
      alert(res.error || "Failed to update course publishing status.");
    }
  };

  const handleDelete = async (courseId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete the course "${title}" and all its modules, lessons, downloadable resources, and student enrollments?`)) return;

    setLoading(true);
    const res = await deleteAdminCourseAction(courseId);
    setLoading(false);

    if (res.success) {
      setCourses(courses.filter(c => c.id !== courseId));
    } else {
      alert(res.error || "Failed to delete course.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Syllabus CMS Catalog</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-semibold font-mono">
              {courses.length} Courses
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage academic tracks, upload lesson guides, and modify publishing access.</p>
        </div>

        <a
          href="/admin/courses/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-900/10 transition-colors"
        >
          + Create New Course
        </a>
      </div>

      {/* Directory Grid */}
      <div className="glass-panel rounded-xl overflow-hidden border border-white/5">
        {courses.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm space-y-3">
            <p>No curriculum tracks have been created yet.</p>
            <a href="/admin/courses/new" className="inline-block text-indigo-400 hover:underline text-xs">Create the first course track now →</a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-white/[0.01]">
                  <th className="p-4 pl-6">Course Name</th>
                  <th className="p-4">Track Type</th>
                  <th className="p-4">Publishing Status</th>
                  <th className="p-4">Parameters</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {courses.map((c) => {
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.01] transition-colors">
                      {/* Name & Slug */}
                      <td className="p-4 pl-6">
                        <div>
                          <h4 className="font-bold text-white leading-tight">{c.title}</h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1 max-w-sm">Slug: {c.slug}</p>
                        </div>
                      </td>

                      {/* Free / Premium Badge */}
                      <td className="p-4">
                        <span className={`text-xs font-bold uppercase tracking-wider ${c.isPremium ? "text-purple-400" : "text-emerald-400"}`}>
                          {c.isPremium ? "Premium" : "Free Track"}
                        </span>
                      </td>

                      {/* Publish / Draft toggler */}
                      <td className="p-4">
                        <button
                          onClick={() => handleTogglePublish(c.id, c.isPublished, c.slug)}
                          disabled={loading}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${c.isPublished ? "bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20" : "bg-amber-600/10 border-amber-500/20 text-amber-400 hover:bg-amber-600/20"}`}
                        >
                          {c.isPublished ? "✓ Published" : "⚙ Draft Mode"}
                        </button>
                      </td>

                      {/* Modules / Enrollments count */}
                      <td className="p-4 text-xs text-gray-400 space-y-0.5">
                        <p>Modules: <span className="text-white font-medium">{c._count.modules}</span></p>
                        <p>Enrolled: <span className="text-white font-medium">{c._count.enrollments}</span></p>
                      </td>

                      {/* Actions */}
                      <td className="p-4 pr-6 text-right space-x-2">
                        <a
                          href={`/admin/courses/${c.id}`}
                          className="inline-block px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Edit Outline
                        </a>
                        <button
                          disabled={loading}
                          onClick={() => handleDelete(c.id, c.title)}
                          className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          Delete Track
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
    </div>
  );
}
