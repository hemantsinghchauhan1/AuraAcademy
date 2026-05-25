"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Send, 
  Users, 
  Pin, 
  Plus, 
  BarChart2, 
  Clock, 
  Link2, 
  ShieldCheck, 
  Sparkles, 
  Calendar, 
  BookOpen,
  CheckCircle,
  FileText,
  Bookmark,
  Activity,
  UserCheck,
  Loader2,
  Bot
} from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { sendMessage } from "@/services/chatService";
import { 
  createPinnedResource, 
  createRoomPoll, 
  voteRoomPoll, 
  createStudySession 
} from "@/services/roomService";

interface CurrentUser {
  id: string;
  email: string;
  role: string;
  name: string;
  avatarUrl: string | null;
  isOfficialIITM: boolean;
}

interface RoomDetails {
  id: string;
  name: string;
  description: string;
  type: "SUBJECT" | "PROJECT" | "COMMUNITY" | "PRIVATE_GROUP";
  avatar: string;
  ownerId: string | null;
  subjectName: string | null;
  subjectCode: string | null;
}

interface Participant {
  userId: string;
  role: "OWNER" | "MODERATOR" | "MEMBER";
  username: string;
  name: string;
  avatarUrl: string | null;
  isOfficialIITM: boolean;
  xp: number;
  streak: number;
}

interface Message {
  id: string;
  content: string;
  conversationId: string;
  senderId: string;
  createdAt: Date | string;
  sender: {
    id: string;
    username: string | null;
    profile: {
      name: string;
      avatarUrl: string | null;
    } | null;
  };
}

interface PinnedResource {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
  type: string;
  createdAt: Date | string;
}

interface RoomPollVote {
  userId: string;
  optionIndex: number;
}

interface RoomPoll {
  id: string;
  question: string;
  options: string[];
  votes: RoomPollVote[];
  createdById: string;
  createdAt: Date | string;
}

interface StudySession {
  id: string;
  title: string;
  description: string | null;
  startTime: Date | string;
  endTime: Date | string;
  createdById: string;
}

interface RoomChatClientProps {
  currentUser: CurrentUser;
  roomDetails: RoomDetails;
  participants: Participant[];
  initialMessages: Message[];
  initialPins: PinnedResource[];
  initialPolls: RoomPoll[];
  initialSessions: StudySession[];
}

export default function RoomChatClient({
  currentUser,
  roomDetails,
  participants,
  initialMessages,
  initialPins,
  initialPolls,
  initialSessions,
}: RoomChatClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 1. Establish stateful Socket.IO connection
  const { socket, isConnected } = useSocket(currentUser.id);

  // States
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [pins, setPins] = useState<PinnedResource[]>(initialPins);
  const [polls, setPolls] = useState<RoomPoll[]>(initialPolls);
  const [sessions, setSessions] = useState<StudySession[]>(initialSessions);
  const [composerText, setComposerText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Active Sidebar Tabs: "collab", "ai", or "people"
  const [sidebarTab, setSidebarTab] = useState<"collab" | "ai" | "people">("collab");
  // Collaborative sub-view: "polls" | "pins" | "sessions"
  const [collabView, setCollabView] = useState<"polls" | "pins" | "sessions">("polls");

  // AI Summary states
  const [aiSummaryContent, setAiSummaryContent] = useState<string | null>(null);
  const [aiSummaryTakeaways, setAiSummaryTakeaways] = useState<string[]>([]);
  const [aiSummaryUpdatedAt, setAiSummaryUpdatedAt] = useState<string | null>(null);
  const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);

  const fetchAiSummary = async (force = false) => {
    setIsAiSummaryLoading(true);
    try {
      const res = await fetch("/api/ai/rooms/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: roomDetails.id, forceRefresh: force }),
      });
      const data = await res.json();
      if (data.success) {
        setAiSummaryContent(data.content);
        setAiSummaryTakeaways(data.keyTakeaways || []);
        setAiSummaryUpdatedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null);
      }
    } catch (e) {
      console.error("AI Summary fetch failed:", e);
    } finally {
      setIsAiSummaryLoading(false);
    }
  };

  // Presence and typing indicators
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [activeTypingUsers, setActiveTypingUsers] = useState<Record<string, string>>({});
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sub-modals for creating pins, polls, and sessions
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinTitle, setPinTitle] = useState("");
  const [pinUrl, setPinUrl] = useState("");
  const [pinDesc, setPinDesc] = useState("");
  const [pinType, setPinType] = useState("LINK");

  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDesc, setSessionDesc] = useState("");
  const [sessionStart, setSessionStart] = useState("");
  const [sessionDuration, setSessionDuration] = useState("60");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  // 2. Direct Socket connection configuration for Rooms
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join room channel
    socket.emit("room:join", { conversationId: roomDetails.id });

    return () => {
      socket.emit("room:leave", { conversationId: roomDetails.id });
    };
  }, [socket, isConnected, roomDetails.id]);

  // Scroll to bottom on initial message load
  useEffect(() => {
    scrollToBottom("auto");
  }, []);

  // 3. Socket event listener registers
  useEffect(() => {
    if (!socket) return;

    // A. Online presence
    socket.on("presence:initial", (userIds: string[]) => {
      setOnlineUsers(new Set(userIds));
    });

    socket.on("user:online", ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
    });

    socket.on("user:offline", ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    // B. Realtime group text chats
    socket.on("message:new", ({ conversationId, message }) => {
      if (conversationId === roomDetails.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        setTimeout(() => scrollToBottom("smooth"), 50);
      }
    });

    // C. Realtime typing indicators
    socket.on("typing:start", ({ conversationId, userId, userName }) => {
      if (conversationId === roomDetails.id) {
        setActiveTypingUsers((prev) => ({ ...prev, [userId]: userName }));
      }
    });

    socket.on("typing:stop", ({ conversationId, userId }) => {
      if (conversationId === roomDetails.id) {
        setActiveTypingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    });

    // D. Realtime interactive group components
    socket.on("poll:new", ({ conversationId, poll }) => {
      if (conversationId === roomDetails.id) {
        setPolls((prev) => {
          if (prev.some((p) => p.id === poll.id)) return prev;
          return [poll, ...prev];
        });
      }
    });

    socket.on("poll:vote", ({ conversationId, pollId, userId: voterId, optionIndex }) => {
      if (conversationId === roomDetails.id) {
        setPolls((prev) =>
          prev.map((poll) => {
            if (poll.id !== pollId) return poll;
            const cleanVotes = poll.votes.filter((v) => v.userId !== voterId);
            return {
              ...poll,
              votes: [...cleanVotes, { userId: voterId, optionIndex }],
            };
          })
        );
      }
    });

    socket.on("session:new", ({ conversationId, session }) => {
      if (conversationId === roomDetails.id) {
        setSessions((prev) => {
          if (prev.some((s) => s.id === session.id)) return prev;
          return [...prev, session].sort(
            (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
        });
      }
    });

    socket.on("resource:pin", ({ conversationId, resource }) => {
      if (conversationId === roomDetails.id) {
        setPins((prev) => {
          if (prev.some((r) => r.id === resource.id)) return prev;
          return [resource, ...prev];
        });
      }
    });

    return () => {
      socket.off("presence:initial");
      socket.off("user:online");
      socket.off("user:offline");
      socket.off("message:new");
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("poll:new");
      socket.off("poll:vote");
      socket.off("session:new");
      socket.off("resource:pin");
    };
  }, [socket, roomDetails.id]);

  // 4. Chat interactions
  const handleComposerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComposerText(e.target.value);
    
    if (!socket || !isConnected) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing:start", { 
        conversationId: roomDetails.id, 
        userName: currentUser.name 
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("typing:stop", { conversationId: roomDetails.id });
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim() || isSending) return;

    const textToSend = composerText.trim();
    setComposerText("");
    setIsSending(true);

    if (socket && isConnected) {
      socket.emit("typing:stop", { conversationId: roomDetails.id });
      setIsTyping(false);
    }

    // Optimistic Timeline Render
    const tempId = `optimistic-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      content: textToSend,
      conversationId: roomDetails.id,
      senderId: currentUser.id,
      createdAt: new Date(),
      sender: {
        id: currentUser.id,
        username: currentUser.name,
        profile: {
          name: currentUser.name,
          avatarUrl: currentUser.avatarUrl,
        },
      },
    };

    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => scrollToBottom("smooth"), 50);

    const res = await sendMessage(roomDetails.id, currentUser.id, textToSend);

    setIsSending(false);
    if (res.success && res.message) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (res.message as Message) : m))
      );
      
      // Emit via Sockets
      if (socket && isConnected) {
        socket.emit("message:new", {
          conversationId: roomDetails.id,
          message: res.message,
        });
      }
    } else {
      // Revert optimistic if error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("Failed to deliver message. Check database connection.");
    }
  };

  // 5. Collaborative Interactive Handlers
  const handleVotePoll = async (pollId: string, optionIndex: number) => {
    const res = await voteRoomPoll(currentUser.id, pollId, optionIndex);
    if (res.success) {
      // Local state adjustment
      setPolls((prev) =>
        prev.map((p) => {
          if (p.id !== pollId) return p;
          const filtered = p.votes.filter((v) => v.userId !== currentUser.id);
          return {
            ...p,
            votes: [...filtered, { userId: currentUser.id, optionIndex }],
          };
        })
      );

      // Socket broadcast
      if (socket && isConnected) {
        socket.emit("poll:vote", {
          conversationId: roomDetails.id,
          pollId,
          userId: currentUser.id,
          optionIndex,
        });
      }
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOptions = pollOptions.filter((opt) => opt.trim() !== "");
    if (!pollQuestion.trim() || cleanOptions.length < 2) {
      alert("Question and at least 2 options are required.");
      return;
    }

    startTransition(async () => {
      const res = await createRoomPoll(currentUser.id, {
        roomId: roomDetails.id,
        question: pollQuestion,
        options: cleanOptions,
      });

      if (res.success && res.poll) {
        setIsPollModalOpen(false);
        setPollQuestion("");
        setPollOptions(["", ""]);

        const mappedPoll: RoomPoll = {
          id: res.poll.id,
          question: res.poll.question,
          options: JSON.parse(res.poll.options) as string[],
          votes: [],
          createdById: res.poll.createdById,
          createdAt: res.poll.createdAt,
        };

        setPolls((prev) => [mappedPoll, ...prev]);

        // Socket broadcast
        if (socket && isConnected) {
          socket.emit("poll:new", {
            conversationId: roomDetails.id,
            poll: mappedPoll,
          });
        }
      }
    });
  };

  const handleCreatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinTitle.trim()) return;

    startTransition(async () => {
      const res = await createPinnedResource(currentUser.id, {
        roomId: roomDetails.id,
        title: pinTitle,
        url: pinUrl || undefined,
        description: pinDesc || undefined,
        type: pinType,
      });

      if (res.success && res.resource) {
        setIsPinModalOpen(false);
        setPinTitle("");
        setPinUrl("");
        setPinDesc("");
        setPinType("LINK");

        const mappedPin: PinnedResource = {
          id: res.resource.id,
          title: res.resource.title,
          url: res.resource.url,
          description: res.resource.description,
          type: res.resource.type,
          createdAt: res.resource.createdAt,
        };

        setPins((prev) => [mappedPin, ...prev]);

        // Socket broadcast
        if (socket && isConnected) {
          socket.emit("resource:pin", {
            conversationId: roomDetails.id,
            resource: mappedPin,
          });
        }
      }
    });
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle.trim() || !sessionStart) return;

    const startDate = new Date(sessionStart);
    const durationMin = parseInt(sessionDuration) || 60;
    const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);

    startTransition(async () => {
      const res = await createStudySession(currentUser.id, {
        roomId: roomDetails.id,
        title: sessionTitle,
        description: sessionDesc || undefined,
        startTime: startDate,
        endTime: endDate,
      });

      if (res.success && res.session) {
        setIsSessionModalOpen(false);
        setSessionTitle("");
        setSessionDesc("");
        setSessionStart("");
        setSessionDuration("60");

        const mappedSession: StudySession = {
          id: res.session.id,
          title: res.session.title,
          description: res.session.description,
          startTime: res.session.startTime,
          endTime: res.session.endTime,
          createdById: res.session.createdById,
        };

        setSessions((prev) => [...prev, mappedSession].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        ));

        // Socket broadcast
        if (socket && isConnected) {
          socket.emit("session:new", {
            conversationId: roomDetails.id,
            session: mappedSession,
          });
        }
      }
    });
  };

  // Helper arrays
  const typingUserNames = Object.values(activeTypingUsers);
  const activeOnlineCount = participants.filter((p) => onlineUsers.has(p.userId) || p.userId === currentUser.id).length;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] text-white overflow-hidden">
      
      {/* ─── CHAT PANEL (LEFT & MAIN) ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#06060c] relative">
        {/* Dynamic Glass Topbar Header */}
        <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01] backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center space-x-4 min-w-0">
            <button
              onClick={() => router.push("/rooms")}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl">
              {roomDetails.avatar}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                  {roomDetails.name}
                </h2>
                {roomDetails.subjectCode && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                    {roomDetails.subjectCode}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 truncate max-w-[240px] sm:max-w-md hidden sm:block">
                {roomDetails.description || "Active digital campus study space."}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Connection Indicator */}
            <div className="flex items-center space-x-1.5 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-full">
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
              <span className="text-[10px] font-medium text-gray-400">
                {isConnected ? "Sockets Live" : "Offline"}
              </span>
            </div>

            {/* Quick Active Count */}
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-bold text-white">{activeOnlineCount}</span>
              <span className="text-[10px] text-gray-500">/ {participants.length}</span>
            </div>
          </div>
        </div>

        {/* Timeline body */}
        <div 
          ref={timelineContainerRef}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-xl mb-4 border border-indigo-500/20">
                {roomDetails.avatar}
              </div>
              <h3 className="text-base font-semibold text-gray-300">Welcome to {roomDetails.name}!</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                This is the beginning of the collaborative study session. Schedule meetups or pin syllabus guidelines to start!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => {
                const isMe = msg.senderId === currentUser.id;
                const nextMsg = messages[index + 1];
                const isGrouped = nextMsg && nextMsg.senderId === msg.senderId;

                return (
                  <div 
                    key={msg.id}
                    className={`flex items-start gap-3 ${isMe ? "justify-end" : "justify-start"} ${isGrouped ? "mb-1" : "mb-4"}`}
                  >
                    {!isMe && !isGrouped && (
                      <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold shrink-0">
                        {msg.sender.profile?.avatarUrl ? (
                          <img 
                            src={msg.sender.profile.avatarUrl} 
                            alt={msg.sender.username || "student"} 
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          (msg.sender.username || "student").substring(0, 2).toUpperCase()
                        )}
                      </div>
                    )}
                    {!isMe && isGrouped && <div className="w-8 shrink-0" />}

                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[70%]`}>
                      {!isMe && !isGrouped && (
                        <span className="text-[10px] text-gray-500 font-semibold mb-1">
                          {msg.sender.profile?.name || msg.sender.username || "Student"}
                        </span>
                      )}
                      <div className={`px-4 py-2 text-sm leading-relaxed ${
                        isMe 
                          ? "bg-indigo-600 rounded-2xl rounded-tr-none text-white shadow-sm" 
                          : "bg-white/[0.03] border border-white/5 rounded-2xl rounded-tl-none text-gray-200"
                      }`}>
                        {msg.content}
                      </div>
                      {!isGrouped && (
                        <span className="text-[9px] text-gray-600 font-medium mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer section */}
        <div className="p-4 bg-white/[0.01] border-t border-white/5 shrink-0 z-10">
          {typingUserNames.length > 0 && (
            <div className="text-[10px] text-indigo-400 italic mb-2 ml-2 animate-pulse">
              {typingUserNames.join(", ")} {typingUserNames.length === 1 ? "is" : "are"} typing...
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              placeholder={`Send message to #${roomDetails.name.toLowerCase()}...`}
              value={composerText}
              onChange={handleComposerChange}
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <button
              type="submit"
              disabled={!composerText.trim() || isSending}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow shadow-indigo-600/20 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* ─── SIDEBAR PANEL (RIGHT) ─── */}
      <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-white/5 bg-[#0a0a10] flex flex-col shrink-0">
        {/* Toggle tabs header */}
        <div className="flex border-b border-white/5 bg-white/[0.01] shrink-0">
          <button
            onClick={() => setSidebarTab("collab")}
            className={`flex-1 py-3 text-[10px] font-semibold uppercase tracking-wider text-center border-b ${
              sidebarTab === "collab"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-500 hover:text-white"
            }`}
          >
            Collaboration
          </button>
          <button
            onClick={() => { setSidebarTab("ai"); if (!aiSummaryContent) fetchAiSummary(); }}
            className={`flex-1 py-3 text-[10px] font-semibold uppercase tracking-wider text-center border-b flex items-center justify-center gap-1 ${
              sidebarTab === "ai"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-500 hover:text-white"
            }`}
          >
            <Bot className="h-3 w-3" />
            AI Summary
          </button>
          <button
            onClick={() => setSidebarTab("people")}
            className={`flex-1 py-3 text-[10px] font-semibold uppercase tracking-wider text-center border-b ${
              sidebarTab === "people"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-500 hover:text-white"
            }`}
          >
            Class ({participants.length})
          </button>
        </div>

        {/* Scrollable container */}
        <div className="flex-1 overflow-y-auto">
          {sidebarTab === "collab" ? (
            <div className="p-5 space-y-6">
              {/* Collaboration Views Filter */}
              <div className="flex gap-1.5 p-1 rounded-lg bg-black/40 border border-white/5">
                {[
                  { id: "polls", label: "Polls", icon: BarChart2 },
                  { id: "pins", label: "Pins", icon: Pin },
                  { id: "sessions", label: "Sessions", icon: Calendar },
                ].map((view) => {
                  const Icon = view.icon;
                  const isActive = collabView === view.id;
                  return (
                    <button
                      key={view.id}
                      onClick={() => setCollabView(view.id as any)}
                      className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-all ${
                        isActive
                          ? "bg-indigo-600/25 border border-indigo-500/40 text-indigo-300"
                          : "text-gray-500 hover:text-white"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {view.label}
                    </button>
                  );
                })}
              </div>

              {/* A. CAMPUS POLLS COLLABORATION */}
              {collabView === "polls" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Interactive Polls ({polls.length})
                    </h3>
                    <button
                      onClick={() => setIsPollModalOpen(true)}
                      className="p-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-indigo-400 hover:text-indigo-300 transition-colors"
                      title="Create Poll"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {polls.length === 0 ? (
                    <div className="text-center py-8 rounded-lg border border-dashed border-white/5 bg-white/[0.005]">
                      <BarChart2 className="h-8 w-8 mx-auto text-gray-700 mb-2" />
                      <p className="text-[10px] text-gray-500">No active polls inside room.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {polls.map((poll) => {
                        const totalVotes = poll.votes.length;
                        const myVote = poll.votes.find((v) => v.userId === currentUser.id);

                        return (
                          <div 
                            key={poll.id}
                            className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors"
                          >
                            <h4 className="text-xs font-bold text-white mb-3">
                              {poll.question}
                            </h4>
                            <div className="space-y-2">
                              {poll.options.map((option, idx) => {
                                const optionVotes = poll.votes.filter((v) => v.optionIndex === idx).length;
                                const pct = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                                const isSelected = myVote?.optionIndex === idx;

                                return (
                                  <button
                                    key={idx}
                                    onClick={() => handleVotePoll(poll.id, idx)}
                                    className={`w-full text-left relative overflow-hidden p-2.5 rounded-lg border text-xs font-medium transition-all group ${
                                      isSelected
                                        ? "border-indigo-500/40 bg-indigo-950/20 text-indigo-200"
                                        : "border-white/5 bg-black/20 text-gray-400 hover:text-white"
                                    }`}
                                  >
                                    {/* Animated Progress Bar */}
                                    <div 
                                      className={`absolute inset-y-0 left-0 transition-all duration-500 pointer-events-none ${
                                        isSelected ? "bg-indigo-600/15" : "bg-white/[0.02]"
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                    <div className="flex justify-between items-center relative z-10">
                                      <span className="truncate pr-4">{option}</span>
                                      <span className="text-[10px] font-bold text-gray-500 shrink-0">
                                        {pct}% ({optionVotes})
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="text-[9px] text-gray-600 mt-2.5 flex items-center justify-between">
                              <span>Total Votes: {totalVotes}</span>
                              <span>Asked by: Room Admin</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* B. PINNED RESOURCES */}
              {collabView === "pins" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Pinned Materials ({pins.length})
                    </h3>
                    <button
                      onClick={() => setIsPinModalOpen(true)}
                      className="p-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-indigo-400 hover:text-indigo-300 transition-colors"
                      title="Pin Resource"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {pins.length === 0 ? (
                    <div className="text-center py-8 rounded-lg border border-dashed border-white/5 bg-white/[0.005]">
                      <Pin className="h-8 w-8 mx-auto text-gray-700 mb-2 rotate-45" />
                      <p className="text-[10px] text-gray-500">No materials pinned inside room.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pins.map((pin) => (
                        <div 
                          key={pin.id}
                          className="p-3.5 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] flex items-start gap-3 transition-colors"
                        >
                          <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs shrink-0">
                            {pin.type === "PYQ" ? <FileText className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-white truncate">
                              {pin.title}
                            </h4>
                            {pin.description && (
                              <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                                {pin.description}
                              </p>
                            )}
                            {pin.url && (
                              <a
                                href={pin.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center text-[10px] text-indigo-400 hover:underline mt-1.5"
                              >
                                Link URL
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* C. STUDY SESSIONS */}
              {collabView === "sessions" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Study Sessions ({sessions.length})
                    </h3>
                    <button
                      onClick={() => setIsSessionModalOpen(true)}
                      className="p-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-indigo-400 hover:text-indigo-300 transition-colors"
                      title="Schedule Session"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="text-center py-8 rounded-lg border border-dashed border-white/5 bg-white/[0.005]">
                      <Calendar className="h-8 w-8 mx-auto text-gray-700 mb-2" />
                      <p className="text-[10px] text-gray-500">No future study rooms scheduled.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((sess) => {
                        const start = new Date(sess.startTime);
                        return (
                          <div 
                            key={sess.id}
                            className="p-3.5 rounded-lg border border-indigo-500/10 bg-indigo-950/5 hover:bg-indigo-950/10 transition-colors flex items-start gap-3"
                          >
                            <div className="p-2 rounded bg-indigo-500/10 text-indigo-400 text-xs shrink-0">
                              <Calendar className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white">
                                {sess.title}
                              </h4>
                              {sess.description && (
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                  {sess.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-1.5 text-[9px] text-gray-500 mt-2">
                                <Clock className="h-3 w-3 text-indigo-400" />
                                <span>
                                  {start.toLocaleDateString()} at {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : sidebarTab === "ai" ? (
            /* E. AI SUMMARY PANEL */
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Discussion Summary</h3>
                </div>
                <button
                  onClick={() => fetchAiSummary(true)}
                  disabled={isAiSummaryLoading}
                  className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[9px] font-bold text-indigo-400 hover:bg-white/10 transition-all flex items-center gap-1 cursor-pointer"
                >
                  {isAiSummaryLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {isAiSummaryLoading ? "Generating..." : "Refresh"}
                </button>
              </div>

              {isAiSummaryLoading && !aiSummaryContent ? (
                <div className="flex flex-col items-center justify-center py-14 space-y-3 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                  <p className="text-[10px] text-gray-500">Analyzing chat history and generating AI insights...</p>
                </div>
              ) : aiSummaryContent ? (
                <div className="space-y-4">
                  {aiSummaryUpdatedAt && (
                    <p className="text-[8px] text-gray-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last generated at {aiSummaryUpdatedAt}
                    </p>
                  )}

                  {/* Key Takeaways */}
                  {aiSummaryTakeaways.length > 0 && (
                    <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/10 space-y-2.5">
                      <h4 className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Key Takeaways
                      </h4>
                      <ul className="space-y-1.5">
                        {aiSummaryTakeaways.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-[10px] text-gray-300">
                            <span className="text-indigo-400 font-bold mt-0.5 shrink-0">•</span>
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Full Summary */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Discussion Summary
                    </h4>
                    <div className="text-[10px] text-gray-400 leading-relaxed whitespace-pre-wrap">
                      {aiSummaryContent.replace(/#{1,3}\s/g, "").replace(/\*\*/g, "").trim()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-14 space-y-3 rounded-xl border border-dashed border-white/5 bg-white/[0.005]">
                  <Bot className="h-8 w-8 mx-auto text-gray-700" />
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">No AI summary generated yet.</p>
                    <p className="text-[9px] text-gray-600 mt-1 max-w-[200px] mx-auto">Click "Refresh" above to trigger the AI discussion summarizer for this room.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* D. MEMBERS LISTING */
            <div className="p-5 space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                All Room Participants ({participants.length})
              </h3>
              <div className="space-y-3">
                {participants.map((person) => {
                  const isOnline = onlineUsers.has(person.userId) || person.userId === currentUser.id;
                  return (
                    <div 
                      key={person.userId}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/[0.01] hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Avatar glowing based on online states */}
                        <div className="relative">
                          <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold shrink-0">
                            {person.avatarUrl ? (
                              <img 
                                src={person.avatarUrl} 
                                alt={person.username} 
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              person.username.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0a0a10]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold text-white truncate max-w-[100px]">
                              {person.name}
                            </span>
                            {person.isOfficialIITM && (
                              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 truncate block">
                            @{person.username}
                          </span>
                        </div>
                      </div>

                      {/* Role & Badges */}
                      <div className="flex items-center space-x-2 text-[10px]">
                        {person.role !== "MEMBER" && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold tracking-wider uppercase text-[8px]">
                            {person.role}
                          </span>
                        )}
                        <span className="text-orange-400 font-semibold shrink-0">
                          🔥 {person.streak}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── CREATION SUB MODALS ─── */}

      {/* 1. POLL MODAL */}
      {isPollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-xl bg-[#0d0d14] border border-white/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center">
                <BarChart2 className="h-4 w-4 mr-2 text-indigo-400" />
                Launch Room Poll
              </h3>
              <button onClick={() => setIsPollModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreatePoll} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Poll Question</label>
                <input
                  type="text"
                  placeholder="e.g. When should we schedule the next study session?"
                  required
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Options</label>
                {pollOptions.map((opt, idx) => (
                  <input
                    key={idx}
                    type="text"
                    placeholder={`Option ${idx + 1}`}
                    required={idx < 2}
                    value={opt}
                    onChange={(e) => {
                      const next = [...pollOptions];
                      next[idx] = e.target.value;
                      setPollOptions(next);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 text-xs focus:outline-none"
                  />
                ))}
                {pollOptions.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    className="text-[10px] text-indigo-400 hover:underline inline-flex items-center"
                  >
                    + Add Option
                  </button>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/5 mt-4">
                <button
                  type="button"
                  onClick={() => setIsPollModalOpen(false)}
                  className="px-3 py-1.5 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow"
                >
                  Launch Poll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PIN RESOURCE MODAL */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-xl bg-[#0d0d14] border border-white/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center">
                <Pin className="h-4 w-4 mr-2 text-indigo-400" />
                Pin Campus Resource
              </h3>
              <button onClick={() => setIsPinModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreatePin} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Resource Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Unit 3 Programming Guide"
                  required
                  value={pinTitle}
                  onChange={(e) => setPinTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Resource Link URL</label>
                <input
                  type="url"
                  placeholder="e.g. https://github.com/..."
                  value={pinUrl}
                  onChange={(e) => setPinUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Resource Description</label>
                <textarea
                  placeholder="Summarize this attachment..."
                  rows={2}
                  value={pinDesc}
                  onChange={(e) => setPinDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 text-xs focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Type</label>
                <select
                  value={pinType}
                  onChange={(e) => setPinType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none"
                >
                  <option value="LINK">External Link</option>
                  <option value="NOTE">Lecture Notes</option>
                  <option value="PYQ">Past Year Question Paper</option>
                  <option value="ANNOUNCEMENT">Announcement</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/5 mt-4">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-3 py-1.5 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow"
                >
                  Pin Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SESSION SCHEDULE MODAL */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-xl bg-[#0d0d14] border border-white/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-indigo-400" />
                Schedule Study Session
              </h3>
              <button onClick={() => setIsSessionModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateSession} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Session Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Unit 3 Live Problem Solving"
                  required
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Topic Details</label>
                <textarea
                  placeholder="What is the objective of this session?"
                  rows={2}
                  value={sessionDesc}
                  onChange={(e) => setSessionDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 text-xs focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={sessionStart}
                    onChange={(e) => setSessionStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Duration (Min)</label>
                  <select
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none"
                  >
                    <option value="30">30 Minutes</option>
                    <option value="60">1 Hour</option>
                    <option value="90">1.5 Hours</option>
                    <option value="120">2 Hours</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/5 mt-4">
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                  className="px-3 py-1.5 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow"
                >
                  Schedule Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
