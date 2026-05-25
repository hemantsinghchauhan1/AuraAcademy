"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, Sparkles, MessageSquare, AlertTriangle, Calendar, Award } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

interface NotificationToast {
  id: string;
  type: string;
  title: string;
  description: string;
}

interface NotificationBellClientProps {
  userId: string;
  initialUnreadCount: number;
}

export default function NotificationBellClient({
  userId,
  initialUnreadCount,
}: NotificationBellClientProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);

  // 1. Establish stateful Socket.IO connection
  const { socket, isConnected } = useSocket(userId);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join notifications specific room
    socket.emit("room:join", { conversationId: `user:${userId}:notifications` });

    // Listen to new realtime notifications
    socket.on("notification:new", ({ notification }) => {
      if (!notification) return;
      
      // Increment unread badge
      setUnreadCount((prev) => prev + 1);

      // Trigger a premium glassmorphic toast notification
      const newToast: NotificationToast = {
        id: notification.id || Math.random().toString(),
        type: notification.type,
        title: notification.title,
        description: notification.description,
      };

      setToasts((prev) => [...prev, newToast]);

      // Play soft audio ping safely
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav");
        audio.volume = 0.25;
        audio.play();
      } catch (e) {
        // Audio playback might be blocked by browser policies
      }

      // Dismiss toast automatically after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 5000);
    });

    // Listen for global unread counter synchronization
    socket.on("notification:unread_count", ({ unreadCount: count }) => {
      if (typeof count === "number") {
        setUnreadCount(count);
      }
    });

    return () => {
      socket.off("notification:new");
      socket.off("notification:unread_count");
    };
  }, [socket, isConnected, userId]);

  const handleBellClick = () => {
    router.push("/notifications");
  };

  const getToastIcon = (type: string) => {
    switch (type) {
      case "DIRECT_MESSAGE":
      case "ROOM_MESSAGE":
        return <MessageSquare className="h-4 w-4 text-indigo-400" />;
      case "ROOM_MENTION":
        return <Sparkles className="h-4 w-4 text-purple-400" />;
      case "ASSIGNMENT_DEADLINE":
      case "QUIZ_REMINDER":
        return <AlertTriangle className="h-4 w-4 text-rose-400" />;
      case "STUDY_SESSION":
        return <Calendar className="h-4 w-4 text-teal-400" />;
      case "ACHIEVEMENT_UNLOCK":
        return <Award className="h-4 w-4 text-amber-400" />;
      default:
        return <Bell className="h-4 w-4 text-indigo-400" />;
    }
  };

  return (
    <div className="relative flex items-center">
      {/* Sleek Glassmorphic Navbar Bell Button */}
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition-all transform hover:-translate-y-0.5"
        title="View Notifications"
      >
        <Bell className="h-4 w-4" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-indigo-600 px-1 text-[9px] font-extrabold text-white ring-2 ring-[#09090b]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ─── REALTIME GLASSMORPHIC TOAST OUTLET ─── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-80 max-w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto w-full flex items-start gap-3 p-4 rounded-xl bg-[#09090e]/80 border border-white/10 backdrop-blur-xl shadow-2xl animate-slide-in transition-all duration-300"
          >
            {/* Glass Icon Capsule */}
            <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
              {getToastIcon(toast.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-extrabold text-white truncate">
                {toast.title}
              </h4>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
                {toast.description}
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-gray-500 hover:text-white shrink-0 focus:outline-none transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
