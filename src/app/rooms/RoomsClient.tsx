"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  Search, 
  Plus, 
  Compass, 
  Sparkles, 
  ArrowRight, 
  LogOut, 
  MessageSquare, 
  Hash, 
  Bookmark, 
  CheckCircle,
  HelpCircle,
  FileText,
  UserCheck
} from "lucide-react";
import { joinRoom, leaveRoom, createGroupRoom } from "@/services/roomService";

interface Room {
  id: string;
  name: string;
  description: string;
  type: "SUBJECT" | "PROJECT" | "COMMUNITY" | "PRIVATE_GROUP";
  avatar: string;
  subjectId?: string | null;
  subjectName?: string | null;
  subjectCode?: string | null;
  memberCount: number;
  messagesCount: number;
  isMember: boolean;
}

interface RoomsClientProps {
  currentUser: {
    id: string;
    email: string;
    role: string;
    name: string;
    avatarUrl: string | null;
    isOfficialIITM: boolean;
  };
  initialJoined: Room[];
  initialRecommended: Room[];
  initialDiscoverable: Room[];
}

export default function RoomsClient({
  currentUser,
  initialJoined,
  initialRecommended,
  initialDiscoverable,
}: RoomsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local state for lists to update immediately when joining/leaving
  const [joinedRooms, setJoinedRooms] = useState<Room[]>(initialJoined);
  const [recommendedRooms, setRecommendedRooms] = useState<Room[]>(initialRecommended);
  const [discoverableRooms, setDiscoverableRooms] = useState<Room[]>(initialDiscoverable);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "joined" | "recommended" | "discover">("all");

  // Create Room Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDesc, setNewRoomDesc] = useState("");
  const [newRoomType, setNewRoomType] = useState<"PROJECT" | "COMMUNITY">("PROJECT");
  const [newRoomAvatar, setNewRoomAvatar] = useState("📚");
  const [createError, setCreateError] = useState("");

  const handleJoin = async (room: Room) => {
    startTransition(async () => {
      const res = await joinRoom(currentUser.id, room.id);
      if (res.success) {
        // Move room from recommended or discoverable to joined
        const updatedRoom = { ...room, isMember: true, memberCount: room.memberCount + 1 };
        setJoinedRooms((prev) => [updatedRoom, ...prev]);
        setRecommendedRooms((prev) => prev.filter((r) => r.id !== room.id));
        setDiscoverableRooms((prev) => prev.filter((r) => r.id !== room.id));
        
        router.refresh();
      }
    });
  };

  const handleLeave = async (room: Room) => {
    if (!confirm(`Are you sure you want to leave ${room.name}?`)) return;
    
    startTransition(async () => {
      const res = await leaveRoom(currentUser.id, room.id);
      if (res.success) {
        const updatedRoom = { ...room, isMember: false, memberCount: Math.max(0, room.memberCount - 1) };
        setJoinedRooms((prev) => prev.filter((r) => r.id !== room.id));
        
        if (room.subjectId) {
          setRecommendedRooms((prev) => [updatedRoom, ...prev]);
        } else {
          setDiscoverableRooms((prev) => [updatedRoom, ...prev]);
        }
        
        router.refresh();
      }
    });
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    
    if (!newRoomName.trim()) {
      setCreateError("Room name is required");
      return;
    }

    startTransition(async () => {
      const res = await createGroupRoom(currentUser.id, {
        name: newRoomName,
        description: newRoomDesc,
        type: newRoomType,
        avatarUrl: newRoomAvatar,
      });

      if (res.success && res.roomId) {
        setIsCreateModalOpen(false);
        setNewRoomName("");
        setNewRoomDesc("");
        setNewRoomAvatar("📚");
        router.push(`/rooms/${res.roomId}`);
      } else {
        setCreateError(res.error || "Failed to create study room");
      }
    });
  };

  // Filter lists based on search and selected tab
  const filterBySearch = (list: Room[]) => {
    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        (r.subjectName && r.subjectName.toLowerCase().includes(query)) ||
        (r.subjectCode && r.subjectCode.toLowerCase().includes(query))
    );
  };

  const visibleJoined = filterBySearch(joinedRooms);
  const visibleRecommended = filterBySearch(recommendedRooms);
  const visibleDiscoverable = filterBySearch(discoverableRooms);

  const totalJoinedCount = joinedRooms.length;
  const totalRecommendedCount = recommendedRooms.length;
  const totalDiscoverableCount = discoverableRooms.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Dynamic Animated Glow Headers */}
      <div className="relative mb-12 p-8 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950/40 border border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-sm font-semibold tracking-wider uppercase mb-1">
              <Sparkles className="h-4 w-4 animate-spin-slow" />
              <span>Academic Collaboration Hub</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Study Rooms & Spaces
            </h1>
            <p className="text-gray-400 mt-2 max-w-2xl text-sm md:text-base leading-relaxed">
              Connect with classmates, join group study squads, participate in subject communities,
              and collaborate in real-time. Boost your IITM learning journey together.
            </p>
          </div>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all transform hover:-translate-y-0.5 active:translate-y-0 self-start md:self-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Study Squad
          </button>
        </div>
      </div>

      {/* Discovery Toolbelt: Search and Tabs */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8 p-4 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
        {/* Search */}
        <div className="relative w-full lg:w-96">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
            <Search className="h-5 w-5" />
          </span>
          <input
            type="text"
            placeholder="Search rooms, subjects, codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Workspace Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {[
            { id: "all", label: "All Spaces", icon: Compass },
            { id: "joined", label: `My Rooms (${totalJoinedCount})`, icon: Bookmark },
            { id: "recommended", label: `Recommended (${totalRecommendedCount})`, icon: Sparkles },
            { id: "discover", label: `Discover Communities (${totalDiscoverableCount})`, icon: Users }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600/25 border border-indigo-500/40 text-indigo-200"
                    : "bg-white/[0.01] hover:bg-white/[0.04] border border-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Decks */}
      <div className="space-y-12">
        {/* 1. MY JOINED ROOMS */}
        {(activeTab === "all" || activeTab === "joined") && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Bookmark className="h-5 w-5 text-indigo-400" />
                <h2 className="text-xl font-bold text-white">Joined Rooms</h2>
              </div>
              <span className="text-xs text-gray-500 bg-white/5 px-2.5 py-1 rounded-full font-medium">
                {visibleJoined.length} active
              </span>
            </div>

            {visibleJoined.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
                <MessageSquare className="h-10 w-10 mx-auto text-gray-600 mb-3" />
                <h3 className="text-base font-semibold text-gray-300">No rooms joined yet</h3>
                <p className="text-gray-500 text-xs mt-1 max-w-sm mx-auto">
                  Browse the recommended tabs below to discover group hubs matching your syllabus.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleJoined.map((room) => (
                  <RoomCard 
                    key={room.id} 
                    room={room} 
                    onJoin={handleJoin} 
                    onLeave={handleLeave} 
                    router={router}
                    isPending={isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. RECOMMENDED CHANNELS */}
        {(activeTab === "all" || activeTab === "recommended") && (
          <div>
            <div className="flex items-center justify-between mb-4 pt-4 border-t border-white/5">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Recommended for Your Subjects</h2>
              </div>
              <span className="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/25 px-2.5 py-1 rounded-full font-semibold">
                Syllabus Match
              </span>
            </div>

            {visibleRecommended.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
                <CheckCircle className="h-10 w-10 mx-auto text-indigo-500 mb-3" />
                <h3 className="text-base font-semibold text-gray-300">You're all caught up!</h3>
                <p className="text-gray-500 text-xs mt-1 max-w-sm mx-auto">
                  You have joined all recommended study rooms corresponding to your enrolled courses.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleRecommended.map((room) => (
                  <RoomCard 
                    key={room.id} 
                    room={room} 
                    onJoin={handleJoin} 
                    onLeave={handleLeave} 
                    router={router}
                    isPending={isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. DISCOVERABLE SPACES */}
        {(activeTab === "all" || activeTab === "discover") && (
          <div>
            <div className="flex items-center justify-between mb-4 pt-4 border-t border-white/5">
              <div className="flex items-center space-x-2">
                <Compass className="h-5 w-5 text-teal-400" />
                <h2 className="text-xl font-bold text-white">Discover Campus Communities</h2>
              </div>
              <span className="text-xs text-gray-500 bg-white/5 px-2.5 py-1 rounded-full font-medium">
                Explore squads
              </span>
            </div>

            {visibleDiscoverable.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
                <Users className="h-10 w-10 mx-auto text-gray-600 mb-3" />
                <h3 className="text-base font-semibold text-gray-300">No other channels found</h3>
                <p className="text-gray-500 text-xs mt-1 max-w-sm mx-auto">
                  Create a new study squad to start collaborating with students now!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleDiscoverable.map((room) => (
                  <RoomCard 
                    key={room.id} 
                    room={room} 
                    onJoin={handleJoin} 
                    onLeave={handleLeave} 
                    router={router}
                    isPending={isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE SQUAD MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#0d0d14] border border-white/10 shadow-2xl overflow-hidden transform transition-all">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Plus className="h-5 w-5 mr-2 text-indigo-400" />
                Provision Custom Study Squad
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors focus:outline-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                  {createError}
                </div>
              )}

              {/* Room Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Squad / Room Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. System Dynamics Study Group"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  placeholder="What is this squad collaborating on?"
                  rows={3}
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                />
              </div>

              {/* Grid selectors */}
              <div className="grid grid-cols-2 gap-4">
                {/* Room Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Room Type
                  </label>
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="PROJECT">Project Squad</option>
                    <option value="COMMUNITY">General Community</option>
                  </select>
                </div>

                {/* Avatar / Emoji Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Avatar Emoji
                  </label>
                  <select
                    value={newRoomAvatar}
                    onChange={(e) => setNewRoomAvatar(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {["📚", "💻", "🧠", "🔬", "📈", "🎨", "🌍", "🚀", "💡", "🎯", "🤖", "⚡"].map((emoji) => (
                      <option key={emoji} value={emoji}>
                        {emoji}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/5 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
                >
                  {isPending ? "Provisioning..." : "Launch Space"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface RoomCardProps {
  room: Room;
  onJoin: (room: Room) => void;
  onLeave: (room: Room) => void;
  router: any;
  isPending: boolean;
}

function RoomCard({ room, onJoin, onLeave, router, isPending }: RoomCardProps) {
  const getBadgeStyle = (type: string) => {
    switch (type) {
      case "SUBJECT":
        return "bg-indigo-500/10 border-indigo-500/30 text-indigo-400";
      case "PROJECT":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      case "COMMUNITY":
      default:
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    }
  };

  const getBadgeName = (type: string) => {
    switch (type) {
      case "SUBJECT":
        return "Official Class";
      case "PROJECT":
        return "Study Squad";
      case "COMMUNITY":
      default:
        return "Community";
    }
  };

  return (
    <div className="flex flex-col rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.04] p-5 shadow-lg backdrop-blur-md transition-all duration-300 group">
      {/* Upper row: Avatar & Room Type Badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="h-12 w-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition-transform duration-300">
          {room.avatar}
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded ${getBadgeStyle(room.type)}`}>
          {getBadgeName(room.type)}
        </span>
      </div>

      {/* Main room details */}
      <div className="flex-1">
        {room.subjectCode && (
          <span className="text-[10px] font-semibold text-indigo-400 tracking-wider">
            {room.subjectCode}
          </span>
        )}
        <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors mt-0.5 truncate">
          {room.name}
        </h3>
        <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 h-8 leading-relaxed">
          {room.description || "No description provided for this campus space."}
        </p>
      </div>

      {/* Room Meta (Members Count, Messages Count) */}
      <div className="flex items-center space-x-4 my-4 py-3 border-y border-white/5 text-xs text-gray-500">
        <div className="flex items-center">
          <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
          <span>{room.memberCount} members</span>
        </div>
        <div className="flex items-center">
          <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
          <span>{room.messagesCount} chats</span>
        </div>
      </div>

      {/* Action triggers */}
      <div className="flex items-center space-x-2 mt-auto">
        {room.isMember ? (
          <>
            <button
              onClick={() => router.push(`/rooms/${room.id}`)}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow shadow-indigo-600/10 hover:shadow-indigo-600/30 transition-all"
            >
              Enter Room
              <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => onLeave(room)}
              disabled={isPending}
              title="Leave Room"
              className="inline-flex items-center justify-center p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 text-gray-400 hover:text-red-400 transition-all disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => onJoin(room)}
            disabled={isPending}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-white/10 rounded-lg text-xs font-semibold text-indigo-400 hover:text-white bg-white/[0.01] hover:bg-indigo-600/15 hover:border-indigo-500/30 transition-all disabled:opacity-50"
          >
            {isPending ? "Joining..." : "Join Study Space"}
          </button>
        )}
      </div>
    </div>
  );
}
