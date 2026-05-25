"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  MessageSquare, 
  Send, 
  Search, 
  ArrowLeft, 
  CheckCircle, 
  Check, 
  CheckCheck, 
  Loader2, 
  Sparkles, 
  UserCheck,
  Shield,
  Circle,
  HelpCircle,
  ExternalLink,
  Users
} from "lucide-react";
import { sendMessage, getMessages, getUserConversations } from "@/services/chatService";
import { useSocket } from "@/hooks/useSocket";

interface CurrentUser {
  id: string;
  email: string;
  role: string;
  name: string;
  avatarUrl: string | null;
  isOfficialIITM: boolean;
}

interface MessagesClientProps {
  currentUser: CurrentUser;
  initialConversations: any[];
  initialConversationId: string | null;
  initialMessages: any[];
}

export default function MessagesClient({
  currentUser,
  initialConversations,
  initialConversationId,
  initialMessages,
}: MessagesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Establish stateful Socket.IO connection
  const { socket, isConnected } = useSocket(currentUser.id);

  // Local state management
  const [conversations, setConversations] = useState<any[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<any[]>(initialMessages);
  const [composerText, setComposerText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Presence and typing indicator states
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
  const [activeTypingUsers, setActiveTypingUsers] = useState<Record<string, string>>({});
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mobile navigation visibility states
  const [mobileShowSidebar, setMobileShowSidebar] = useState<boolean>(!initialConversationId);

  // References for timeline scroll anchors
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Automatic scrolling helpers
  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  // Sync state if query parameter conversationId updates externally
  useEffect(() => {
    if (!searchParams) return;
    const qId = searchParams.get("conversationId");
    if (qId && qId !== activeId) {
      handleConversationSelect(qId);
    }
  }, [searchParams]);

  // Trigger initial scroll bottom on active conversation load
  useEffect(() => {
    if (activeId && messages.length > 0) {
      scrollToBottom("auto");
    }
  }, [activeId]);

  // Proactive read seen emission on conversation load
  useEffect(() => {
    if (socket && isConnected && activeId) {
      socket.emit("message:seen", { conversationId: activeId });
    }
  }, [socket, isConnected, activeId, messages.length]);

  // 2. Direct message bulk-subscription hooks
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join user-specific alerts channel
    socket.emit("rooms:join", { conversationIds: conversations.map(c => c.id) });

    // Instantly request/join active DMs
    if (activeId) {
      socket.emit("room:join", { conversationId: activeId });
    }

    return () => {
      if (activeId) {
        socket.emit("room:leave", { conversationId: activeId });
      }
    };
  }, [socket, isConnected, activeId, conversations.length]);

  // 3. Setup Socket.IO Event Listeners
  useEffect(() => {
    if (!socket) return;

    // A. Realtime online presence updates
    socket.on("presence:initial", (userIds: string[]) => {
      setOnlineUsers(new Set(userIds));
    });

    socket.on("user:online", ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
      setLastSeenMap((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    socket.on("user:offline", ({ userId, lastSeen }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      if (lastSeen) {
        setLastSeenMap((prev) => ({
          ...prev,
          [userId]: formatSidebarTime(lastSeen),
        }));
      }
    });

    // B. Realtime incoming messages delivery
    socket.on("message:new", ({ conversationId, message }) => {
      if (conversationId === activeId) {
        // Timeline append
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          // Filter out matching optimistic messages
          const filtered = prev.filter(m => !(m.sending && m.content === message.content));
          return [...filtered, message];
        });

        // Trigger seen receipt instantly back to the sender
        socket.emit("message:seen", { conversationId });

        setTimeout(() => scrollToBottom("smooth"), 80);
      } else {
        // Inbox sidebar card updates (unread badge count, snippets, float card)
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === conversationId);
          if (idx === -1) return prev;
          const updatedCard = {
            ...prev[idx],
            unreadCount: prev[idx].unreadCount + 1,
            updatedAt: new Date(message.createdAt),
            messages: [message],
          };
          const rest = prev.filter((c) => c.id !== conversationId);
          return [updatedCard, ...rest];
        });
      }
    });

    // C. Realtime typing indicators
    socket.on("typing:start", ({ conversationId, userId, userName }) => {
      if (conversationId === activeId) {
        setActiveTypingUsers((prev) => ({ ...prev, [userId]: userName }));
      }
    });

    socket.on("typing:stop", ({ conversationId, userId }) => {
      if (conversationId === activeId) {
        setActiveTypingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    });

    // D. Realtime green glowing read receipts
    socket.on("message:seen", ({ conversationId, userId }) => {
      if (conversationId === activeId && userId !== currentUser.id) {
        setMessages((prev) =>
          prev.map((msg) => (msg.senderId === currentUser.id ? { ...msg, seen: true } : msg))
        );
      }
    });

    return () => {
      socket.off("presence:initial");
      socket.off("user:online");
      socket.off("user:offline");
      socket.off("message:new");
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("message:seen");
    };
  }, [socket, activeId, currentUser.id]);

  // Clean typing states when active conversation shifts
  useEffect(() => {
    setActiveTypingUsers({});
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [activeId]);

  // Periodic offline synchronization loader (fallback every 30 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const convsRes = await getUserConversations(currentUser.id);
        if (convsRes.success && convsRes.conversations) {
          // Keep unread badges and snippets correct in case of socket disconnects
          setConversations(convsRes.conversations);
        }
      } catch (err) {
        console.error("Slow polling sync error:", err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser.id]);

  // Filter conversations matching query details
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const displayDetails = getConversationDisplay(c, currentUser.id);
      const searchLower = searchQuery.toLowerCase().trim();
      return (
        displayDetails.name.toLowerCase().includes(searchLower) ||
        displayDetails.username.toLowerCase().includes(searchLower)
      );
    });
  }, [conversations, searchQuery, currentUser.id]);

  // Extract other user profile metadata from a conversation entity
  function getOtherParticipant(participants: any[], currentUserId: string) {
    const other = participants.find((p) => p.userId !== currentUserId);
    return other?.user || {
      id: "unknown",
      username: "unknown",
      isOfficialIITM: false,
      profile: { name: "AuraAcademy Student", avatarUrl: null }
    };
  }

  // Create helper to render display parameters of a conversation card
  function getConversationDisplay(conversation: any, currentUserId: string) {
    if (conversation.isGroup) {
      return {
        id: conversation.id,
        name: conversation.name || "Study Group",
        avatarUrl: null,
        username: "group_chat",
        isOfficialIITM: false,
      };
    }
    const otherUser = getOtherParticipant(conversation.participants, currentUserId);
    return {
      id: otherUser.id,
      name: otherUser.profile?.name || "Student",
      avatarUrl: otherUser.profile?.avatarUrl || null,
      username: otherUser.username,
      isOfficialIITM: otherUser.isOfficialIITM || false,
    };
  }

  // Extract active display meta parameters
  const activeConversationMeta = useMemo(() => {
    if (!activeId) return null;
    const activeConv = conversations.find((c) => c.id === activeId);
    if (!activeConv) return null;
    return getConversationDisplay(activeConv, currentUser.id);
  }, [activeId, conversations, currentUser.id]);

  // Process message streams into sender groups
  const messageGroups = useMemo(() => {
    const groups: any[] = [];
    let currentGroup: any = null;

    messages.forEach((msg, index) => {
      const msgTime = new Date(msg.createdAt).getTime();
      const prevMsg = index > 0 ? messages[index - 1] : null;
      const prevTime = prevMsg ? new Date(prevMsg.createdAt).getTime() : 0;
      
      // Determine consecutive threshold (same sender AND difference under 2 mins)
      const isConsecutive = 
        prevMsg && 
        prevMsg.senderId === msg.senderId && 
        (msgTime - prevTime) < 120000;

      if (isConsecutive && currentGroup) {
        currentGroup.messages.push(msg);
      } else {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = {
          senderId: msg.senderId,
          sender: msg.sender,
          createdAt: msg.createdAt,
          messages: [msg],
        };
      }
    });

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups;
  }, [messages]);

  // Handle click transitions for choosing active inbox conversations
  const handleConversationSelect = async (convId: string) => {
    // Leave previous room proactively
    if (socket && isConnected && activeId) {
      socket.emit("room:leave", { conversationId: activeId });
    }

    setActiveId(convId);
    setLoadingMessages(true);
    setMobileShowSidebar(false);
    
    // Optimistic unread reduction locally
    setConversations(prev => 
      prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c)
    );

    try {
      // Sync URL parameters
      router.push(`/messages?conversationId=${convId}`, { scroll: false });
      
      const msgsRes = await getMessages(convId, currentUser.id);
      if (msgsRes.success && msgsRes.messages) {
        setMessages(msgsRes.messages);
        setTimeout(() => scrollToBottom("auto"), 100);
      }
    } catch (err) {
      console.error("Failed to load conversation timeline:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Submit new composer inputs securely
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!composerText.trim() || !activeId || sending) return;

    const messageContent = composerText.trim();
    setComposerText(""); // Clear composer instantly

    // Stop typing indicator on message submission
    handleTypingStop();

    // 1. Prepare optimistic message object
    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      conversationId: activeId,
      senderId: currentUser.id,
      content: messageContent,
      createdAt: new Date(),
      seen: false,
      sending: true, // Special rendering attribute
      sender: {
        id: currentUser.id,
        username: "",
        profile: {
          name: currentUser.name,
          avatarUrl: currentUser.avatarUrl,
        }
      }
    };

    // 2. Append optimistic note and scroll down smoothly
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom("smooth"), 50);

    // 3. Floating the active thread card to top of the sidebar list
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === activeId);
      if (idx === -1) return prev;
      const updatedCard = {
        ...prev[idx],
        updatedAt: new Date(),
        messages: [
          {
            id: tempId,
            content: messageContent,
            createdAt: new Date(),
            sender: {
              id: currentUser.id,
              username: "",
              profile: { name: currentUser.name },
            },
          },
        ],
      };
      const remaining = prev.filter((c) => c.id !== activeId);
      return [updatedCard, ...remaining];
    });

    try {
      const sendRes = await sendMessage(activeId, currentUser.id, messageContent);
      if (sendRes.success && sendRes.message) {
        // A. Replace temporary optimistic details with actual DB entry
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? sendRes.message : msg))
        );

        // B. Emit realtime delivery broadcast
        if (socket && isConnected) {
          socket.emit("message:send", {
            conversationId: activeId,
            message: sendRes.message,
          });
        }
      } else {
        alert(sendRes.error || "Failed to dispatch message.");
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to sync message: " + err.message);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    }
  };

  // Keyboard typing triggers
  const handleComposerChange = (text: string) => {
    setComposerText(text);

    if (!socket || !isConnected || !activeId) return;

    // Typing start emit (if not already in typing state)
    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing:start", {
        conversationId: activeId,
        userName: currentUser.name,
      });
    }

    // Auto-stop typing debouncing trigger
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 2500); // Stop after 2.5 seconds of silence
  };

  const handleTypingStop = () => {
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (socket && isConnected && activeId) {
      socket.emit("typing:stop", { conversationId: activeId });
    }
  };

  // Allow Enter submit, shift+enter new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Timestamp formatting functions matching Linear aesthetics
  function formatSidebarTime(dateInput: Date | string) {
    const date = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffHours < 48) return "Yest";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function formatBubbleTime(dateInput: Date | string) {
    const date = new Date(dateInput);
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  function formatGroupHeaderTime(dateInput: Date | string) {
    const date = new Date(dateInput);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    if (isToday) {
      return `Today at ${timeStr}`;
    }
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();
    if (isYesterday) {
      return `Yesterday at ${timeStr}`;
    }
    return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at ${timeStr}`;
  }

  return (
    <div className="flex w-full h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] overflow-hidden text-gray-200">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* LEFT INBOX SIDEBAR                                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-white/5 bg-[#09090b]/50 backdrop-blur-xl ${mobileShowSidebar ? "flex" : "hidden md:flex"} shrink-0`}>
        
        {/* Workspace title & filter composer */}
        <div className="p-4 border-b border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-400" />
              <span>Inbox Space</span>
            </h1>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} title={isConnected ? "Realtime Socket Connected" : "Connecting..."}></span>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-mono font-bold">
                {conversations.length} Active DMs
              </span>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full bg-[#0c0c14]/80 border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Scrollable inbox card list */}
        <div className="flex-1 overflow-y-auto space-y-1 p-2 custom-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 mt-12 space-y-3">
              <div className="h-12 w-12 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/5">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">No active connections</p>
                <p className="text-[10px] text-gray-500 leading-normal max-w-[200px] mx-auto">
                  {searchQuery ? "No matches in active list." : "Search peers in the discovery directory to start messaging."}
                </p>
              </div>
              <button 
                onClick={() => router.push("/students")}
                className="mt-4 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold rounded-lg text-white transition-all flex items-center gap-1 mx-auto"
              >
                <span>Find Peer Scholars</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const display = getConversationDisplay(conv, currentUser.id);
              const isSelected = activeId === conv.id;
              const lastMsg = conv.messages?.[0];
              const dateToUse = conv.updatedAt || conv.createdAt;
              const isOnline = onlineUsers.has(display.id);

              return (
                <button
                  key={conv.id}
                  onClick={() => handleConversationSelect(conv.id)}
                  className={`w-full text-left p-3.5 rounded-xl transition-all flex items-center gap-3 relative border ${
                    isSelected
                      ? "bg-indigo-600/10 border-indigo-500/30 text-white"
                      : "bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5"
                  }`}
                >
                  {/* Avatar wrapper */}
                  <div className="relative shrink-0">
                    <div className={`h-11 w-11 rounded-xl bg-gradient-to-tr ${isSelected ? "from-purple-500 to-indigo-500" : "from-[#0c0c14] to-[#181824]"} p-0.5 flex items-center justify-center shadow-lg border border-white/5`}>
                      {display.avatarUrl ? (
                        <img
                          src={display.avatarUrl}
                          alt={display.name}
                          className="h-full w-full object-cover rounded-[10px] bg-neutral-900"
                        />
                      ) : (
                        <div className="h-full w-full rounded-[10px] bg-[#0c0c14] flex items-center justify-center font-bold text-sm text-gray-300">
                          {display.name[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    {/* Glowing presence placeholder */}
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#09090b] flex items-center justify-center ${isOnline ? "bg-emerald-500" : "bg-neutral-700"}`}>
                      {isOnline && <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping absolute"></span>}
                    </span>
                  </div>

                  {/* Body elements */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-gray-200"}`}>
                          {display.name}
                        </span>
                        {display.isOfficialIITM && (
                          <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0 filter drop-shadow-[0_0_2px_rgba(52,211,153,0.3)]" />
                        )}
                      </div>
                      <span className="text-[9px] font-medium font-mono text-gray-500 shrink-0">
                        {formatSidebarTime(dateToUse)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-1">
                      <p className="text-[11px] text-gray-500 truncate min-w-0">
                        {lastMsg 
                          ? `${lastMsg.senderId === currentUser.id ? "You: " : ""}${lastMsg.content}`
                          : "No messages yet."}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="h-5 min-w-5 px-1.5 bg-indigo-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center shrink-0 filter drop-shadow-[0_0_4px_rgba(99,102,241,0.5)]">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Current logged user metadata footer */}
        <div className="p-4 border-t border-white/5 bg-[#07070b]/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="h-full w-full object-cover rounded-[6px]"
                />
              ) : (
                <div className="h-full w-full rounded-[6px] bg-[#0c0c14] flex items-center justify-center font-bold text-xs text-white">
                  {currentUser.name[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate leading-none">{currentUser.name}</p>
              <span className="text-[9px] text-indigo-400 font-bold uppercase font-mono tracking-wider leading-none">Scholar</span>
            </div>
          </div>
          <button 
            onClick={() => router.push(`/u/${currentUser.name.toLowerCase().replace(/\s+/g, "")}`)}
            className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors"
            title="My Public Profile"
          >
            <Shield className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RIGHT CHAT ROOM TIMELINE                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col h-full bg-[#050508]/40 ${!mobileShowSidebar ? "flex" : "hidden md:flex"}`}>
        
        {activeId && activeConversationMeta ? (
          <>
            {/* Chat room header */}
            <div className="h-16 px-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#09090b]/40 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                {/* Mobile Back control */}
                <button
                  onClick={() => setMobileShowSidebar(true)}
                  className="md:hidden p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                {/* Receiver Info */}
                <div className="relative">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 flex items-center justify-center">
                    {activeConversationMeta.avatarUrl ? (
                      <img
                        src={activeConversationMeta.avatarUrl}
                        alt={activeConversationMeta.name}
                        className="h-full w-full object-cover rounded-[9px]"
                      />
                    ) : (
                      <div className="h-full w-full rounded-[9px] bg-[#0c0c14] flex items-center justify-center font-bold text-xs text-white">
                        {activeConversationMeta.name[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#09090b] ${onlineUsers.has(activeConversationMeta.id) ? "bg-emerald-500" : "bg-neutral-700"}`}></span>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold text-white">{activeConversationMeta.name}</h2>
                    {activeConversationMeta.isOfficialIITM && (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400 filter drop-shadow-[0_0_2px_rgba(52,211,153,0.3)]" />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono">
                    /u/{activeConversationMeta.username} • {
                      onlineUsers.has(activeConversationMeta.id)
                        ? "Active Online"
                        : lastSeenMap[activeConversationMeta.id] 
                          ? `Last seen ${lastSeenMap[activeConversationMeta.id]} ago`
                          : "Offline"
                    }
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => router.push(`/u/${activeConversationMeta.username}`)}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                >
                  <span>View Metrics</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable message timeline */}
            <div 
              ref={timelineContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.02),transparent)]"
            >
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full space-y-3">
                  <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                  <p className="text-xs text-gray-500">Decrypting message logs...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 max-w-sm mx-auto">
                  <span className="text-4xl animate-bounce">👋</span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Wave at {activeConversationMeta.name}!</h3>
                    <p className="text-xs text-gray-500 leading-normal">
                      Initiate academic collaborations, exchange mock question papers, or plan study milestones.
                    </p>
                  </div>
                </div>
              ) : (
                messageGroups.map((group, groupIdx) => {
                  const isOwnGroup = group.senderId === currentUser.id;
                  
                  return (
                    <div 
                      key={groupIdx} 
                      className={`flex gap-3 max-w-[85%] ${isOwnGroup ? "ml-auto justify-end flex-row-reverse" : "mr-auto"}`}
                    >
                      {/* Show avatar only for other user's consecutive groups */}
                      {!isOwnGroup && (
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#161622] to-[#252538] border border-white/5 p-0.5 flex items-center justify-center shrink-0 mt-1">
                          {activeConversationMeta.avatarUrl ? (
                            <img
                              src={activeConversationMeta.avatarUrl}
                              alt={activeConversationMeta.name}
                              className="h-full w-full object-cover rounded-[9px]"
                            />
                          ) : (
                            <div className="h-full w-full rounded-[9px] bg-[#0c0c14] flex items-center justify-center font-extrabold text-[10px] text-white">
                              {activeConversationMeta.name[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-1">
                        {/* Group sender headers */}
                        <div className={`flex items-center gap-2 text-[10px] ${isOwnGroup ? "justify-end text-right flex-row-reverse" : "text-left"}`}>
                          <span className="font-extrabold text-gray-300">
                            {isOwnGroup ? "You" : activeConversationMeta.name}
                          </span>
                          <span className="text-gray-500 font-medium font-mono">
                            {formatGroupHeaderTime(group.createdAt)}
                          </span>
                        </div>

                        {/* Grouped message bubble stack */}
                        <div className={`space-y-1.5 flex flex-col ${isOwnGroup ? "items-end" : "items-start"}`}>
                          {group.messages.map((msg: any) => {
                            return (
                              <div key={msg.id} className="group relative">
                                <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed max-w-lg ${
                                  isOwnGroup
                                    ? `bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none ${
                                        msg.sending ? "opacity-60 shadow-none" : "shadow-lg shadow-purple-900/10"
                                      }`
                                    : "bg-[#0f0f18]/80 border border-white/5 backdrop-blur text-gray-100 rounded-tl-none"
                                }`}>
                                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                </div>

                                {/* Dynamic Seen checkmarks for own messages */}
                                {isOwnGroup && (
                                  <div className="flex justify-end items-center gap-1 mt-1 text-[8px] text-gray-500 font-mono leading-none">
                                    <span>{formatBubbleTime(msg.createdAt)}</span>
                                    {msg.sending ? (
                                      <Loader2 className="h-2.5 w-2.5 animate-spin text-indigo-400" />
                                    ) : msg.seen ? (
                                      <CheckCheck className="h-2.5 w-2.5 text-emerald-400 filter drop-shadow-[0_0_2px_rgba(52,211,153,0.5)]" />
                                    ) : (
                                      <Check className="h-2.5 w-2.5 text-gray-600" />
                                    )}
                                  </div>
                                )}

                                {!isOwnGroup && (
                                  <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-1.5 py-0.5 rounded bg-[#0c0c14]/90 text-[8px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-mono">
                                    {formatBubbleTime(msg.createdAt)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Bouncing Glass Typing Indicators */}
              {Object.keys(activeTypingUsers).length > 0 && (
                <div className="flex gap-3 max-w-[85%] mr-auto items-end animate-pulse">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#161622] to-[#252538] border border-white/5 p-0.5 flex items-center justify-center shrink-0">
                    {activeConversationMeta.avatarUrl ? (
                      <img
                        src={activeConversationMeta.avatarUrl}
                        alt={activeConversationMeta.name}
                        className="h-full w-full object-cover rounded-[9px]"
                      />
                    ) : (
                      <div className="h-full w-full rounded-[9px] bg-[#0c0c14] flex items-center justify-center font-extrabold text-[10px] text-white">
                        {activeConversationMeta.name[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-gray-500">{activeConversationMeta.name} is typing</span>
                    <div className="px-4 py-3 bg-[#0f0f18]/80 border border-white/5 backdrop-blur rounded-2xl rounded-tl-none flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce delay-75"></span>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce delay-150"></span>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce delay-300"></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Multiline composer input */}
            <div className="p-4 border-t border-white/5 bg-[#09090b]/40 backdrop-blur-xl shrink-0">
              <div className="relative flex items-end gap-2">
                <textarea
                  rows={1}
                  value={composerText}
                  onChange={(e) => handleComposerChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${activeConversationMeta.name}...`}
                  className="w-full bg-[#0c0c14]/80 border border-white/5 rounded-2xl pl-4 pr-12 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 resize-none max-h-32 overflow-y-auto"
                />
                
                <button
                  onClick={() => handleSend()}
                  disabled={!composerText.trim() || sending}
                  className={`absolute right-2.5 bottom-2 p-2 rounded-xl transition-all ${
                    composerText.trim()
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-900/20 cursor-pointer"
                      : "bg-white/[0.02] text-gray-600 cursor-not-allowed"
                  }`}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="flex justify-between items-center text-[9px] text-gray-600 px-1 pt-1.5">
                <span>Enter submits message. Shift+Enter creates a new line.</span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Active Realtime Secure Pipeline</span>
                </span>
              </div>
            </div>
          </>
        ) : (
          /* Empty Chat state (No active conversation selected) */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.01),transparent)]">
            <div className="h-16 w-16 bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 rounded-3xl shadow-xl flex items-center justify-center animate-pulse">
              <div className="h-full w-full bg-[#040406] rounded-[22px] flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-indigo-400" />
              </div>
            </div>

            <div className="max-w-md space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Your Scholar Collaboration Center</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                Connect with official IITM students, coordinate mock quiz prep, sync revision streaks, and collaborate on syllabus lessons inside an isolated communication workspace.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 text-xs w-full max-w-xs justify-center pt-2">
              <button 
                onClick={() => router.push("/students")}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-900/15"
              >
                Find Collaborative Peers
              </button>
              <button 
                onClick={() => setMobileShowSidebar(true)}
                className="md:hidden px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl transition-all"
              >
                View Active DMs
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
