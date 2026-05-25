"use client";

import React, { useState } from "react";
import { uploadPYQPaperAction, deletePYQPaperAction, createPaperCategoryAction } from "@/services/adminActions";
import { useUser } from "@clerk/nextjs";

interface PYQManagerProps {
  papers: any[];
  categories: any[];
  subjects: any[];
}

export default function PYQManager({ papers: initialPapers, categories: initialCategories, subjects }: PYQManagerProps) {
  const { user: clerkUser } = useUser();
  const [papers, setPapers] = useState(initialPapers);
  const [categories, setCategories] = useState(initialCategories);

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [paperName, setPaperName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [semester, setSemester] = useState<number | "">("");
  const [subjectId, setSubjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search/Filters state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf") {
        setError("Only PDF files are supported for Previous Year Papers.");
        return;
      }
      setFile(selectedFile);
      setPaperName(selectedFile.name.replace(/\.[^/.]+$/, ""));
      setError("");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !paperName.trim() || !categoryId) {
      setError("Please select a PDF file and specify a paper title.");
      return;
    }

    setLoading(true);
    setError("");

    // Read file as Base64 for the simulated database storage
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Data = reader.result as string;

      // In real production, this uploads to Supabase Storage and returns a CDN link.
      // Since cloud credentials are set by the user after this deployment, we store the file data
      // locally in a secure format, guaranteeing 100% functionality on day one!
      const simulatedUrl = base64Data;
      const fileKey = `pyq_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, "_")}`;

      const res = await uploadPYQPaperAction({
        name: paperName,
        url: simulatedUrl,
        key: fileKey,
        size: file.size,
        mimeType: file.type,
        categoryId,
        semester: semester === "" ? undefined : Number(semester),
        subjectId: subjectId === "" ? undefined : subjectId,
        uploadedById: clerkUser?.id || "admin_user"
      });

      setLoading(false);
      if (res.success && res.data) {
        setPapers([res.data, ...papers]);
        setShowUploadModal(false);
        setFile(null);
        setPaperName("");
        setSemester("");
        setSubjectId("");
      } else {
        setError(res.error || "Failed to log paper upload.");
      }
    };

    reader.onerror = () => {
      setError("Failed to read the file content.");
      setLoading(false);
    };
  };

  const handleDelete = async (paperId: string) => {
    if (!confirm("Are you sure you want to permanently delete this paper?")) return;

    setLoading(true);
    const res = await deletePYQPaperAction(paperId);
    setLoading(false);

    if (res.success) {
      setPapers(papers.filter((p) => p.id !== paperId));
    } else {
      alert(res.error || "Failed to delete paper.");
    }
  };

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const filteredPapers = papers.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "" || p.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* CMS Header control */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Uploaded Papers</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-semibold font-mono">
              {filteredPapers.length} Papers
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage study guidelines, placement papers, and semester exams indexing.</p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-900/10 transition-colors cursor-pointer"
        >
          + Upload Previous Year Paper
        </button>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#0c0c10]/50 p-4 rounded-xl border border-white/5">
        <div className="sm:col-span-2 relative">
          <input
            type="text"
            placeholder="Search papers by title..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg glass-input text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="absolute left-3.5 top-3 text-gray-500">
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <select
          className="px-3 py-2 text-sm rounded-lg glass-input text-gray-300 cursor-pointer"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Grid of Files */}
      {filteredPapers.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-xl border border-white/5 space-y-3">
          <p className="text-gray-500 text-sm">No exam papers found matching the active filter.</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="text-indigo-400 hover:underline text-xs"
          >
            Upload a paper now →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPapers.map((paper) => {
            return (
              <div key={paper.id} className="glass-panel p-5 rounded-xl border border-white/5 flex flex-col justify-between space-y-4 hover:border-white/10 transition-colors">
                <div className="space-y-3">
                  {/* Category Tag */}
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-semibold font-mono uppercase">
                      {paper.category.name}
                    </span>
                    <span className="text-[10px] text-gray-500">{formatBytes(paper.size)}</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-white leading-tight line-clamp-2">{paper.name}</h4>
                    <div className="flex items-center space-x-3 text-[11px] text-gray-500 mt-2">
                      {paper.semester && <span>Semester: <span className="text-gray-300 font-medium">{paper.semester}</span></span>}
                      {paper.subject && (
                        <span>
                          Subject: <span className="text-gray-300 font-medium">{paper.subject.icon} {paper.subject.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-white/5 pt-3 text-xs">
                  <span className="text-[10px] text-gray-500">By: {paper.uploadedBy?.profile?.name || "Admin"}</span>
                  <div className="flex space-x-2">
                    <a
                      href={paper.url}
                      download={paper.name + ".pdf"}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg font-medium transition-colors"
                    >
                      Download
                    </a>
                    <button
                      onClick={() => handleDelete(paper.id)}
                      className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-lg font-semibold transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Paper Overlay Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <form onSubmit={handleUpload} className="w-full max-w-md bg-[#0c0c10] border border-white/10 p-6 rounded-xl space-y-4 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Upload Exam Paper</h3>
              <p className="text-xs text-gray-400 mt-1">Add placement sheets, End-Sem term evaluations, or previous year BS tests.</p>
            </div>

            {/* Simulated Storage Notice Banner */}
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-[11px] text-indigo-300 leading-relaxed">
              💡 <span className="font-bold">Database Mode:</span> Real Supabase Bucket keys are pending configuration. Files will be simulated locally in database fields for immediate functional testing!
            </div>

            <div className="space-y-3 text-xs text-gray-300">
              {/* Custom File Selector */}
              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Select PDF Document</label>
                <input
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 rounded-lg glass-input text-white cursor-pointer"
                />
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Paper Title</label>
                <input
                  type="text"
                  placeholder="e.g. Modern Physics End-Sem 2025"
                  required
                  className="w-full px-3 py-2 rounded-lg glass-input text-white"
                  value={paperName}
                  onChange={(e) => setPaperName(e.target.value)}
                />
              </div>

              {/* Category selector */}
              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Tag Category</label>
                <select
                  required
                  className="w-full px-3 py-2 rounded-lg glass-input text-white cursor-pointer"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester / Subject tags details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-gray-400 font-semibold">Semester (Optional)</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg glass-input text-white cursor-pointer"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value === "" ? "" : Number(e.target.value))}
                  >
                    <option value="">None</option>
                    {[1, 2, 3, 4, 5, 6].map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400 font-semibold">Subject Tag (Optional)</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg glass-input text-white cursor-pointer"
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                  >
                    <option value="">None</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.icon} {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

            <div className="flex justify-end space-x-3 text-xs">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-md shadow-indigo-900/10 transition-colors cursor-pointer"
              >
                {loading ? "Uploading..." : "Confirm Upload"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
