"use client";

import React, { useState } from "react";
import { createAdminCourseAction } from "@/services/courseAdminActions";
import { useRouter } from "next/navigation";

export default function CourseCreator() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Please complete Course Title and Description fields.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await createAdminCourseAction({
      title,
      description,
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      isPremium
    });

    setLoading(false);
    if (res.success && res.data) {
      // Redirect to course edit roadmap outline builder immediately!
      router.push(`/admin/courses/${res.data.id}`);
    } else {
      setError(res.error || "Failed to create course.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl bg-[#0c0c10]/40 p-6 rounded-xl border border-white/5 shadow-2xl">
      <div>
        <h2 className="text-lg font-bold text-white">Create Course</h2>
        <p className="text-xs text-gray-400 mt-1">Spin up a new structured educational track to group modules and lessons.</p>
      </div>

      <div className="space-y-4 text-xs text-gray-300">
        {/* Title */}
        <div className="space-y-1">
          <label className="block text-gray-400 font-semibold">Course Title</label>
          <input
            type="text"
            placeholder="e.g. Advanced Data Structures"
            required
            className="w-full px-3 py-2 rounded-lg glass-input text-white"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="block text-gray-400 font-semibold">Course Description</label>
          <textarea
            placeholder="e.g. Master complex algorithms, balanced binary trees, heaps, graphs, and dynamic programming paradigms..."
            required
            className="w-full p-2.5 rounded-lg glass-input text-white min-h-[90px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Thumbnail Cover URL */}
        <div className="space-y-1">
          <label className="block text-gray-400 font-semibold">Thumbnail Cover image Link (Optional)</label>
          <input
            type="url"
            placeholder="e.g. https://images.unsplash.com/photo-1516321318423-f06f85e504b3"
            className="w-full px-3 py-2 rounded-lg glass-input text-white"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
          />
        </div>

        {/* Premium checkbox */}
        <div className="flex items-center space-x-2 pt-2">
          <input
            type="checkbox"
            id="premium"
            className="h-4 w-4 bg-[#09090b] border-white/10 rounded focus:ring-indigo-500 cursor-pointer"
            checked={isPremium}
            onChange={(e) => setIsPremium(e.target.checked)}
          />
          <label htmlFor="premium" className="text-gray-300 font-semibold cursor-pointer">
            Premium Access Locked (Restricted only to enrolled paid members)
          </label>
        </div>
      </div>

      {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

      <div className="flex justify-end space-x-3 text-xs pt-2">
        <a
          href="/admin/courses"
          className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-colors"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-md shadow-indigo-900/10 transition-colors cursor-pointer"
        >
          {loading ? "Creating..." : "Save Course & Build Outline"}
        </button>
      </div>
    </form>
  );
}
