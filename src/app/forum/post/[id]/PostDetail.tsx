"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createComment } from "@/services/forumService";
import { 
  ArrowLeft, 
  MessageSquare, 
  Send, 
  Sparkles, 
  User 
} from "lucide-react";

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user?: {
    email: string;
    profile?: {
      name: string;
      avatarUrl: string | null;
    }
  };
}

interface PostDetailProps {
  userId: string;
  post: {
    id: string;
    title: string;
    content: string;
    upvotes: number;
    communitySlug: string;
    communityName: string;
    createdAt: string;
    user?: {
      email: string;
      profile?: {
        name: string;
        avatarUrl: string | null;
      }
    };
    comments: Comment[];
  };
}

export default function PostDetail({ userId, post }: PostDetailProps) {
  const router = useRouter();
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();

  // Handle comment submissions
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!commentText.trim()) {
      setError("Please write a comment first.");
      return;
    }

    startTransition(async () => {
      const res = await createComment(userId, post.id, commentText);

      if (res.success) {
        setCommentText("");
        router.refresh();
      } else {
        setError(res.error || "Failed to submit comment.");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Back button */}
      <div>
        <a
          href={`/forum/${post.communitySlug}`}
          className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to r/{post.communitySlug}</span>
        </a>
      </div>

      {/* 1. THREAD MAIN CONTENT CARD */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl relative border border-white/5 space-y-5">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>

        {/* User metadata */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div className="flex items-center space-x-3 text-xs">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-xs text-white uppercase font-bold">
              {post.user?.profile?.name?.[0] || post.user?.email?.[0] || "U"}
            </div>
            <div>
              <p className="font-bold text-white leading-tight">
                {post.user?.profile?.name || "Student"}
              </p>
              <p className="text-[10px] text-gray-500">
                Posted on {post.createdAt} in <span className="text-indigo-400 font-bold">r/{post.communitySlug}</span>
              </p>
            </div>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-lg text-xs font-bold text-indigo-400 flex items-center space-x-1.5">
            <span>🔺</span>
            <span>{post.upvotes} Score</span>
          </div>
        </div>

        {/* Post Title & Text */}
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
            {post.title}
          </h2>
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-normal whitespace-pre-wrap">
            {post.content}
          </p>
        </div>

      </div>

      {/* 2. DISCUSSION TIMELINE HEADER */}
      <div className="space-y-6 pt-4">
        <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-indigo-400" />
          <span>Discussion Thread ({post.comments.length} Comments)</span>
        </h3>

        {/* COMMENTS COMPOSER BOX */}
        <div className="glass-panel p-5 rounded-2xl relative border border-white/5 space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center space-x-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Share Your Thoughts</span>
          </h4>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleCommentSubmit} className="flex gap-3">
            <textarea
              rows={3}
              placeholder="Post a helpful explanation, upvote solution, or link references..."
              disabled={isPending}
              className="glass-input p-3 flex-1 rounded-xl text-xs focus:outline-none resize-none font-sans"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button
              type="submit"
              disabled={isPending}
              className="px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all active:scale-95 disabled:opacity-50 flex flex-col justify-center items-center gap-1 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Submit</span>
            </button>
          </form>
        </div>

        {/* TIMELINE LOG LIST */}
        <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
          {post.comments.map((c) => (
            <div 
              key={c.id} 
              className="glass-panel p-4 rounded-2xl border border-white/5 relative hover:border-white/10 hover:bg-white/2 transition-colors space-y-3"
            >
              {/* Timeline marker node */}
              <div className="absolute left-[-29px] top-4.5 h-3.5 w-3.5 rounded-full border border-indigo-500 bg-[#09090b]"></div>
              
              {/* Comment Header metadata */}
              <div className="flex items-center space-x-2 text-[10px] text-gray-500 font-medium">
                <div className="h-4 w-4 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-[8px] text-white uppercase font-bold font-mono">
                  {c.user?.profile?.name?.[0] || c.user?.email?.[0] || "U"}
                </div>
                <span className="text-gray-300 font-semibold">
                  {c.user?.profile?.name || "Student"}
                </span>
                <span>•</span>
                <span>{c.createdAt}</span>
              </div>

              {/* Comment Text */}
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-normal whitespace-pre-wrap">
                {c.text}
              </p>

            </div>
          ))}

          {post.comments.length === 0 && (
            <div className="glass-panel py-12 rounded-2xl text-center space-y-2 border border-white/5 ml-[-24px]">
              <span className="text-2xl">💬</span>
              <h4 className="text-xs font-bold text-white">No Comments Yet</h4>
              <p className="text-[10px] text-gray-500 max-w-xs mx-auto">
                There are no replies on this thread. Be the first to start the conversation!
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
