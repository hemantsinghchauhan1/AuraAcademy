"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPost, votePost } from "@/services/forumService";
import { 
  MessageSquare, 
  Search, 
  Plus, 
  X, 
  Sparkles, 
  Hash, 
  ChevronRight,
  TrendingUp,
  CornerDownRight
} from "lucide-react";

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  userId: string;
  user?: {
    email: string;
    profile?: {
      name: string;
      avatarUrl: string | null;
    }
  };
  communityId: string;
  upvotes: number;
  commentsCount: number;
  createdAt: string;
}

interface CommunityClientProps {
  userId: string;
  activeCommunity: Community;
  communities: Community[];
  posts: Post[];
}

export default function CommunityClient({
  userId,
  activeCommunity,
  communities,
  posts,
}: CommunityClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();

  // Filter posts
  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle new post creation
  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPostTitle || !newPostContent) {
      setError("Please fill in both the title and body text.");
      return;
    }

    startTransition(async () => {
      const res = await createPost(
        userId,
        activeCommunity.slug,
        newPostTitle,
        newPostContent
      );

      if (res.success) {
        setNewPostTitle("");
        setNewPostContent("");
        setShowCreateForm(false);
        router.refresh();
      } else {
        setError(res.error || "Failed to submit post.");
      }
    });
  };

  // Handle active voting action
  const handleVote = (postId: string, value: number) => {
    startTransition(async () => {
      const res = await votePost(userId, postId, value);
      if (res.success) {
        router.refresh();
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* 1. CHANNEL BRAND HEADER */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              r/{activeCommunity.slug}
            </span>
            <h2 className="text-2xl font-extrabold text-white">{activeCommunity.name}</h2>
            <p className="text-xs text-gray-400 max-w-xl">{activeCommunity.description}</p>
          </div>

          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setError(null);
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01]"
          >
            {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{showCreateForm ? "Close Editor" : "Create New Thread"}</span>
          </button>
        </div>
      </div>

      {/* 2. CORE GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COMMUNITIES LIST SIDEBAR (left 4 columns) */}
        <div className="lg:col-span-4 glass-panel p-5 rounded-2xl space-y-4 border border-white/5 order-last lg:order-first">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center space-x-1.5">
              <Hash className="h-4 w-4 text-indigo-400" />
              <span>Academic Communities</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Explore different study sub-channels</p>
          </div>

          <div className="space-y-2">
            {communities.map((c) => {
              const isActive = c.slug === activeCommunity.slug;
              return (
                <a
                  key={c.id}
                  href={`/forum/${c.slug}`}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-xs font-bold border ${
                    isActive
                      ? "bg-indigo-600/10 border-indigo-500 text-white font-extrabold"
                      : "bg-white/3 border-white/5 text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="truncate">r/{c.slug}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </a>
              );
            })}
          </div>
        </div>

        {/* ACTIVE BOARD FEED (right 8 columns) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* COMPOSER EDITOR CARD (collapsible) */}
          {showCreateForm && (
            <div className="glass-panel p-6 rounded-2xl relative border border-white/10 shadow-2xl space-y-4 transition-all">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h4 className="text-sm font-extrabold text-white flex items-center space-x-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <span>Drafting New Academic Thread</span>
                </h4>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handlePostSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Thread Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Help with quantum tunneling wave equations..."
                    disabled={isPending}
                    className="glass-input px-3 py-2 w-full rounded-xl text-xs focus:outline-none"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Content (Markdown Supported)
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Provide equations, context, code blocks, or links here..."
                    disabled={isPending}
                    className="glass-input p-3 w-full rounded-xl text-xs focus:outline-none resize-none font-sans"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full inline-flex items-center justify-center py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isPending ? "Submitting to Board..." : "Publish Discussion Thread"}
                </button>
              </form>
            </div>
          )}

          {/* SEARCH COMPONENT */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder={`Search threads inside r/${activeCommunity.slug}...`}
              className="glass-input pl-9 pr-3 py-2.5 w-full rounded-xl text-xs focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* POSTS TIMELINE LOOP */}
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <div 
                key={post.id} 
                className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-white/10 hover:bg-white/2 transition-all flex items-start space-x-4 relative group"
              >
                
                {/* UPVOTE COLUMN */}
                <div className="flex flex-col items-center space-y-1 bg-white/3 border border-white/5 p-1.5 rounded-xl flex-shrink-0">
                  <button
                    onClick={() => handleVote(post.id, 1)}
                    className="text-gray-500 hover:text-indigo-400 transition-colors p-1"
                  >
                    🔺
                  </button>
                  <span className="text-xs font-extrabold text-white">{post.upvotes}</span>
                  <button
                    onClick={() => handleVote(post.id, -1)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                  >
                    🔻
                  </button>
                </div>

                {/* THREAD INFO DETAILS */}
                <div className="flex-1 space-y-3 min-w-0">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2 text-[10px] text-gray-500 font-medium truncate">
                      <div className="h-4.5 w-4.5 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-[8px] text-white uppercase font-bold">
                        {post.user?.profile?.name?.[0] || post.user?.email?.[0] || "U"}
                      </div>
                      <span className="text-gray-300 font-semibold truncate">
                        {post.user?.profile?.name || "Student"}
                      </span>
                      <span>•</span>
                      <span>{post.createdAt}</span>
                    </div>

                    <a 
                      href={`/forum/post/${post.id}`} 
                      className="block text-sm sm:text-base font-bold text-white hover:text-indigo-400 transition-colors truncate"
                    >
                      {post.title}
                    </a>
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {post.content}
                  </p>

                  <div className="flex justify-between items-center text-[10px] border-t border-white/5 pt-3 mt-4 text-gray-500 font-bold">
                    <a
                      href={`/forum/post/${post.id}`}
                      className="inline-flex items-center space-x-1 hover:text-indigo-400 transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{post.commentsCount} Comments</span>
                    </a>
                    
                    <a
                      href={`/forum/post/${post.id}`}
                      className="inline-flex items-center text-indigo-400 hover:text-indigo-300 transition-colors group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Join Discussion</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </a>
                  </div>

                </div>

              </div>
            ))}

            {filteredPosts.length === 0 && (
              <div className="glass-panel py-16 rounded-2xl text-center space-y-3">
                <span className="text-3xl">📭</span>
                <h4 className="text-sm font-bold text-white">No Threads Found</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Be the first to post inside **r/{activeCommunity.slug}**! Click **Create New Thread** above to launch a peer discussion.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
