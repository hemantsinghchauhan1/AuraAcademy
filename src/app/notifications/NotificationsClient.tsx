"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Settings, 
  MessageSquare, 
  Sparkles, 
  AlertTriangle, 
  Calendar, 
  Award, 
  Globe, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  Loader2,
  Bookmark,
  Volume2,
  VolumeX,
  Compass
} from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { 
  markAsRead, 
  markAllAsRead, 
  updateNotificationPreferences 
} from "@/services/notificationService";

interface CurrentUser {
  id: string;
  email: string;
  role: string;
  name: string;
  avatarUrl: string | null;
  isOfficialIITM: boolean;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  description: string;
  link: string | null;
  read: boolean;
  priority: "CRITICAL" | "IMPORTANT" | "NORMAL" | "SOCIAL";
  metadata: Record<string, any> | null;
  createdAt: Date | string;
}

interface AcademicReminder {
  id: string;
  type: "EVENT" | "STUDY_SESSION";
  category: string;
  title: string;
  description: string;
  time: Date | string;
  subjectName?: string | null;
  subjectCode?: string | null;
  roomName?: string | null;
  roomAvatar?: string | null;
  priority: string;
}

interface NotificationPreference {
  muteDMs: boolean;
  muteRoomMessages: boolean;
  muteSocialAlerts: boolean;
  muteLeaderboardUpdates: boolean;
  muteReminders: boolean;
  mutedRoomIds: string;
}

interface NotificationsClientProps {
  currentUser: CurrentUser;
  initialNotifications: Notification[];
  initialUnreadCount: number;
  initialReminders: AcademicReminder[];
  initialPreferences: NotificationPreference | null;
}

export default function NotificationsClient({
  currentUser,
  initialNotifications,
  initialUnreadCount,
  initialReminders,
  initialPreferences,
}: NotificationsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Socket Connection
  const { socket, isConnected } = useSocket(currentUser.id);

  // States
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [reminders] = useState<AcademicReminder[]>(initialReminders);
  
  // Preference States
  const [prefs, setPrefs] = useState<NotificationPreference | null>(initialPreferences);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  // Live Socket Alerts hook
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join user-specific notifications room
    socket.emit("room:join", { conversationId: `user:${currentUser.id}:notifications` });

    // Stream realtime alerts
    socket.on("notification:new", ({ notification }) => {
      if (!notification) return;

      const parsed: Notification = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        description: notification.description,
        link: notification.link,
        read: notification.read,
        priority: notification.priority,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
      };

      setNotifications((prev) => [parsed, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    socket.on("notification:unread_count", ({ unreadCount: count }) => {
      if (typeof count === "number") {
        setUnreadCount(count);
      }
    });

    return () => {
      socket.off("notification:new");
      socket.off("notification:unread_count");
    };
  }, [socket, isConnected, currentUser.id]);

  // Actions
  const handleMarkAsRead = async (id: string) => {
    // Optimistic Update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    const res = await markAsRead(currentUser.id, id);
    if (res.success && socket && isConnected) {
      // Sync unread status across active connections
      socket.emit("notification:unread_count", { 
        targetUserId: currentUser.id, 
        unreadCount: res.unreadCount 
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    // Optimistic Update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    const res = await markAllAsRead(currentUser.id);
    if (res.success && socket && isConnected) {
      socket.emit("notification:unread_count", { 
        targetUserId: currentUser.id, 
        unreadCount: 0 
      });
    }
  };

  const handleTogglePreference = async (key: keyof Omit<NotificationPreference, "mutedRoomIds">) => {
    if (!prefs) return;

    const nextVal = !prefs[key];
    const updatedPrefs = { ...prefs, [key]: nextVal };
    setPrefs(updatedPrefs);

    startTransition(async () => {
      await updateNotificationPreferences(currentUser.id, {
        [key]: nextVal,
      });
    });
  };

  // Date Grouping Helper
  const groupNotificationsByDate = (list: Notification[]) => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const older: Notification[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    list.forEach((n) => {
      const time = new Date(n.createdAt).getTime();
      if (time >= todayStart) {
        today.push(n);
      } else if (time >= yesterdayStart) {
        yesterday.push(n);
      } else {
        older.push(n);
      }
    });

    return { today, yesterday, older };
  };

  const { today, yesterday, older } = groupNotificationsByDate(notifications);

  // Styled priority mappings
  const getPriorityStyle = (priority: string, read: boolean) => {
    if (read) return "border-white/5 bg-white/[0.01]";
    
    switch (priority) {
      case "CRITICAL":
        return "border-l-4 border-l-rose-500 bg-rose-500/5 shadow-inner shadow-rose-950/20 border-white/10";
      case "IMPORTANT":
        return "border-l-4 border-l-purple-500 bg-purple-500/5 border-white/10";
      case "SOCIAL":
        return "border-l-4 border-l-amber-500 bg-amber-500/5 border-white/10";
      case "NORMAL":
      default:
        return "border-white/10 bg-white/[0.02]";
    }
  };

  const getPriorityIcon = (type: string) => {
    switch (type) {
      case "DIRECT_MESSAGE":
      case "ROOM_MESSAGE":
        return <MessageSquare className="h-4 w-4 text-indigo-400" />;
      case "ROOM_MENTION":
        return <Sparkles className="h-4 w-4 text-purple-400" />;
      case "ASSIGNMENT_DEADLINE":
      case "QUIZ_REMINDER":
        return <AlertTriangle className="h-4 w-4 text-rose-400 animate-pulse" />;
      case "STUDY_SESSION":
        return <Calendar className="h-4 w-4 text-teal-400" />;
      case "ACHIEVEMENT_UNLOCK":
        return <Award className="h-4 w-4 text-amber-400" />;
      case "LEADERBOARD_UPDATE":
        return <Globe className="h-4 w-4 text-sky-400" />;
      default:
        return <Bell className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatRelativeTime = (dateStr: Date | string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ─── DYNAMIC HEADER ─── */}
      <div className="relative mb-10 p-8 rounded-2xl bg-gradient-to-r from-indigo-950/20 via-purple-950/25 to-slate-950/20 border border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/5 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-sm font-semibold tracking-wider uppercase mb-1">
              <Bell className="h-4 w-4" />
              <span>Central Realtime Awareness</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center">
              Campus Notifications
              {unreadCount > 0 && (
                <span className="ml-4 px-3 py-1 rounded-full bg-gradient-to-r from-rose-500 to-indigo-600 text-xs font-black text-white shadow shadow-rose-600/25">
                  {unreadCount} Unread
                </span>
              )}
            </h1>
            <p className="text-gray-400 mt-2 max-w-2xl text-xs sm:text-sm">
              Manage live messaging threads, prioritized room mentions, course quiz reminders, 
              study squad meetups, and unlocked achievements inside AuraAcademy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl text-white bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition-all cursor-pointer"
            >
              <CheckCheck className="h-4 w-4 mr-2 text-emerald-400" />
              Mark All Read
            </button>
            <button
              onClick={() => setIsPreferencesOpen(true)}
              className="inline-flex items-center justify-center p-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-600/20 transition-all cursor-pointer"
              title="Notification Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── DUAL PANEL GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: NOTIFICATION TIMELINE TIMELINE FEED */}
        <div className="lg:col-span-2 space-y-8">
          {notifications.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-white/10 bg-white/[0.005] p-6">
              <div className="h-12 w-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl mx-auto mb-4">
                🔔
              </div>
              <h3 className="text-base font-bold text-gray-200">Inbox is empty</h3>
              <p className="text-gray-500 text-xs mt-1.5 max-w-xs mx-auto">
                You've cleared all alerts! When peer activities, assignments, or study room polls launch, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* TODAY */}
              {today.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2" />
                    Today
                  </h3>
                  <div className="space-y-4">
                    {today.map((notif) => (
                      <NotificationCard 
                        key={notif.id} 
                        notif={notif} 
                        onRead={handleMarkAsRead}
                        getPriorityStyle={getPriorityStyle}
                        getPriorityIcon={getPriorityIcon}
                        formatRelativeTime={formatRelativeTime}
                        router={router}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* YESTERDAY */}
              {yesterday.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600 mr-2" />
                    Yesterday
                  </h3>
                  <div className="space-y-4">
                    {yesterday.map((notif) => (
                      <NotificationCard 
                        key={notif.id} 
                        notif={notif} 
                        onRead={handleMarkAsRead}
                        getPriorityStyle={getPriorityStyle}
                        getPriorityIcon={getPriorityIcon}
                        formatRelativeTime={formatRelativeTime}
                        router={router}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* OLDER */}
              {older.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700 mr-2" />
                    Older Alerts
                  </h3>
                  <div className="space-y-4">
                    {older.map((notif) => (
                      <NotificationCard 
                        key={notif.id} 
                        notif={notif} 
                        onRead={handleMarkAsRead}
                        getPriorityStyle={getPriorityStyle}
                        getPriorityIcon={getPriorityIcon}
                        formatRelativeTime={formatRelativeTime}
                        router={router}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SIDEBAR WIDGETS */}
        <div className="space-y-8">
          {/* WIDGET 1: ACADEMIC EVENT REMINDERS */}
          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-indigo-400" />
              Syllabus Deadlines & Meetups
            </h3>

            {reminders.length === 0 ? (
              <div className="text-center py-6 rounded-lg bg-black/20 border border-white/5">
                <Compass className="h-6 w-6 mx-auto text-gray-600 mb-2" />
                <p className="text-[10px] text-gray-500">No upcoming academic milestones found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map((rem) => {
                  const date = new Date(rem.time);
                  const isHigh = rem.priority === "HIGH";
                  return (
                    <div 
                      key={rem.id}
                      className="p-3.5 rounded-lg bg-black/35 border border-white/5 flex gap-3 hover:bg-black/50 transition-all duration-300"
                    >
                      <div className="p-2 rounded bg-white/5 border border-white/5 text-xs flex items-center justify-center shrink-0 h-8 w-8 text-indigo-400">
                        {rem.category === "STUDY_SESSION" ? "🤝" : "📚"}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white leading-tight">
                          {rem.title}
                        </h4>
                        {rem.description && (
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                            {rem.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                            {rem.subjectCode || "MEETUP"}
                          </span>
                          <span className="text-[8px] text-gray-500 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* WIDGET 2: QUICK INLINE PREFERENCES PREVIEW */}
          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center">
                <ShieldAlert className="h-4 w-4 mr-2 text-purple-400" />
                Muting Preferences
              </h3>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />}
            </div>

            {prefs ? (
              <div className="space-y-3">
                {[
                  { key: "muteDMs", label: "Mute Direct Messages", icon: MessageSquare },
                  { key: "muteRoomMessages", label: "Mute Study Rooms", icon: Bell },
                  { key: "muteSocialAlerts", label: "Mute Achievement Badges", icon: Award },
                  { key: "muteReminders", label: "Mute Course Reminders", icon: Calendar }
                ].map((item) => {
                  const Icon = item.icon;
                  const isMuted = prefs[item.key as keyof NotificationPreference] as boolean;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleTogglePreference(item.key as any)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs font-semibold transition-all ${
                        isMuted 
                          ? "border-red-500/20 bg-red-500/5 text-red-400" 
                          : "border-white/5 bg-black/20 text-gray-400 hover:text-white"
                      }`}
                    >
                      <span className="inline-flex items-center">
                        <Icon className="h-3.5 w-3.5 mr-2" />
                        {item.label}
                      </span>
                      <span className="text-[10px]">
                        {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5 text-emerald-400" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-gray-500">Muting profiles are loading...</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── SETTINGS PREFERENCES PANEL MODAL ─── */}
      {isPreferencesOpen && prefs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#0d0d14] border border-white/10 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white flex items-center">
                <Settings className="h-5 w-5 mr-2 text-indigo-400" />
                Notification Preferences Settings
              </h3>
              <button
                onClick={() => setIsPreferencesOpen(false)}
                className="text-gray-400 hover:text-white focus:outline-none"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Toggle channels to customize how you receive real-time screen toasts and system alerts across the dashboard.
              </p>

              {[
                { key: "muteDMs", title: "Direct Message Notifications", desc: "Realtime alerts when classmate DMs deliver" },
                { key: "muteRoomMessages", title: "Study Room Group Activities", desc: "Discussion alerts inside study squad rooms" },
                { key: "muteSocialAlerts", title: "Social Achievements & XP", desc: "Congratulate and alert unlocked badges, levels, and medals" },
                { key: "muteLeaderboardUpdates", title: "Weekly Leaderboard Rankings", desc: "System syncs when you move ranks or weekly shifts" },
                { key: "muteReminders", title: "Course Assignment Deadlines", desc: "Calendar, quiz timers, and LMS syllabus releases" },
              ].map((row) => {
                const checked = prefs[row.key as keyof NotificationPreference] as boolean;
                return (
                  <div key={row.key} className="flex items-center justify-between p-3.5 rounded-xl bg-black/30 border border-white/5">
                    <div className="pr-4">
                      <h4 className="text-xs font-bold text-white">{row.title}</h4>
                      <p className="text-[9px] text-gray-500 mt-0.5 leading-relaxed">{row.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!checked}
                        onChange={() => handleTogglePreference(row.key as any)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white peer-checked:after:border-transparent" />
                    </label>
                  </div>
                );
              })}

              <div className="flex items-center justify-end pt-4 border-t border-white/5 mt-6">
                <button
                  onClick={() => setIsPreferencesOpen(false)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow shadow-indigo-600/20"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface NotificationCardProps {
  notif: Notification;
  onRead: (id: string) => void;
  getPriorityStyle: (priority: string, read: boolean) => string;
  getPriorityIcon: (type: string) => React.ReactNode;
  formatRelativeTime: (dateStr: Date | string) => string;
  router: any;
}

function NotificationCard({
  notif,
  onRead,
  getPriorityStyle,
  getPriorityIcon,
  formatRelativeTime,
  router,
}: NotificationCardProps) {
  const handleCardClick = () => {
    if (!notif.read) {
      onRead(notif.id);
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  return (
    <div 
      className={`flex items-start gap-4 p-4.5 rounded-xl border transition-all duration-300 group ${getPriorityStyle(
        notif.priority,
        notif.read
      )}`}
    >
      {/* Icon Sphere */}
      <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-xs shrink-0 h-9 w-9">
        {getPriorityIcon(notif.type)}
      </div>

      {/* Main Metadata Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-xs font-extrabold text-white leading-snug group-hover:text-indigo-400 transition-colors">
            {notif.title}
          </h4>
          <span className="text-[9px] text-gray-500 shrink-0 font-medium flex items-center gap-1">
            <Clock className="h-3 w-3 text-indigo-400" />
            {formatRelativeTime(notif.createdAt)}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
          {notif.description}
        </p>

        {/* Quick redirect tag */}
        {notif.link && (
          <button
            onClick={handleCardClick}
            className="inline-flex items-center text-[9px] text-indigo-400 font-bold hover:underline mt-3 cursor-pointer"
          >
            Jump to Space
            <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      {/* Read Status trigger dot */}
      {!notif.read && (
        <button
          onClick={() => onRead(notif.id)}
          className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white shrink-0 self-center"
          title="Mark as Read"
        >
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        </button>
      )}
    </div>
  );
}
