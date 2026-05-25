"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Award, 
  Flame, 
  Target, 
  Activity, 
  BookOpen, 
  Brain, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  ShieldAlert, 
  ExternalLink,
  MessageSquare,
  FileText,
  Sparkles,
  Trophy,
  UserCheck,
  Bell,
  ArrowUpRight,
  ChevronUp,
  MapPin,
  Zap,
  TrendingDown,
  X,
  Loader2
} from "lucide-react";
import { claimMissionRewardAction } from "@/services/gamificationActions";

// --- INTERFACES & SCHEMA TYPES ---

interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  code: string | null;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  timeLimit: number | null;
  totalQuestions: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  subject?: { name: string };
}

interface Attempt {
  id: string;
  userId: string;
  quizId: string;
  quiz?: {
    title: string;
    subject?: { name: string };
  };
  score: number;
  totalQuestions: number;
  timeSpent: number;
  answers: Record<string, string>;
  completedAt: string;
}

interface Analytics {
  id: string;
  userId: string;
  weakTopics: string; // JSON string
  overallAccuracy: number;
  totalQuizzesTaken: number;
  updatedAt: string;
}

interface Mission {
  id: string;
  currentCount: number;
  completed: boolean;
  claimed: boolean;
  mission: {
    id: string;
    title: string;
    description: string;
    xpReward: number;
    targetCount: number;
    type: string;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  startTime: string;
  endTime: string;
  eventType: "LIVE_CLASS" | "ASSIGNMENT" | "QUIZ" | "EXAM" | "NOTICE";
  priority: string;
  subject: {
    code: string | null;
    name: string;
    icon: string;
  };
}

interface XPLog {
  id: string;
  amount: number;
  reason: string;
  createdAt: string | Date;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
}

interface UserAchievement {
  id: string;
  achievement: Achievement;
  unlockedAt: string | Date;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface UserBadge {
  id: string;
  badge: Badge;
  unlockedAt: string | Date;
}

interface Certificate {
  id: string;
  certificateCode: string;
  issuedAt: string | Date;
  course: { title: string };
}

interface GamificationProfile {
  id: string;
  email: string;
  role: string;
  profile: {
    name: string;
    xp: number;
    streak: number;
    avatarUrl: string | null;
  } | null;
  userAchievements: UserAchievement[];
  userBadges: UserBadge[];
  certificates: Certificate[];
  xpLogs: XPLog[];
  levelInfo?: {
    currentLevel: number;
    title: string;
    xp: number;
    minXp: number;
    maxXp: number;
    progressPercentage: number;
  };
  rank?: number;
}

interface LeaderboardEntry {
  id: string;
  userId: string;
  name: string;
  xp: number;
  streak: number;
  rank: number;
}

interface CopilotDashboardClientProps {
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
    avatarUrl: string | null;
    streak: number;
    xp: number;
    rollNumber: string;
    degreeTrack: string;
  };
  subjects: Subject[];
  quizzes: Quiz[];
  attempts: Attempt[];
  analytics: Analytics | null;
  enrolledCourses: any[];
  dailyMissions: Mission[];
  academicCalendar: CalendarEvent[];
  todayClasses: CalendarEvent[];
  activityHeatmap: Record<string, number>;
  gamificationProfile: GamificationProfile | null;
  leaderboardStandings: LeaderboardEntry[];
}

export default function CopilotDashboardClient({
  user,
  subjects,
  quizzes,
  attempts,
  analytics,
  enrolledCourses,
  dailyMissions,
  academicCalendar,
  todayClasses,
  activityHeatmap,
  gamificationProfile,
  leaderboardStandings,
}: CopilotDashboardClientProps) {
  const [missions, setMissions] = useState(dailyMissions);
  const [localXp, setLocalXp] = useState(user.xp);
  const [claimLoading, setClaimLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI recommendations state
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setRecsLoading(true);
    try {
      const res = await fetch("/api/ai/recommendations");
      const data = await res.json();
      if (data.success) {
        setRecommendations(data.recommendations);
      }
    } catch (e) {
      console.error("Error fetching AI recommendations:", e);
    } finally {
      setRecsLoading(false);
    }
  };

  const handleDismissRec = async (id: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch("/api/ai/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId: id, action: "dismiss" }),
      });
    } catch (e) {
      console.error("Dismiss AI recommendation failed:", e);
    }
  };

  const handleRecomputeRecs = async () => {
    setRecsLoading(true);
    try {
      const res = await fetch("/api/ai/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recompute" }),
      });
      const data = await res.json();
      if (data.success && data.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (e) {
      console.error("Recompute AI recommendations failed:", e);
    } finally {
      setRecsLoading(false);
    }
  };

  // Calendar States
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0] || ""
  );

  // Time ticker state for live countdown elements (updated every 60 seconds)
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Time-based smart greeting
  const [greeting, setGreeting] = useState("Hello");
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting("Good Morning");
    else if (hr < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  // Parse weak topics from analytics
  let weakTopicsList: Array<{ topic: string; accuracy: number; questionsSolved: number }> = [];
  if (analytics?.weakTopics) {
    try {
      weakTopicsList = JSON.parse(analytics.weakTopics);
    } catch (_) {
      weakTopicsList = [];
    }
  }

  // Handle quest claim rewards
  const handleClaimReward = async (userMissionId: string, xpReward: number) => {
    try {
      setClaimLoading(userMissionId);
      const res = await claimMissionRewardAction(user.id, userMissionId);
      if (res.success) {
        setMissions(prev => prev.map(m => m.id === userMissionId ? { ...m, claimed: true } : m));
        setLocalXp(prev => prev + xpReward);
        setToastMessage(`🎉 Setup Complete! +${xpReward} XP claimed successfully.`);
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        alert(res.error || "Failed to claim reward.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClaimLoading(null);
    }
  };

  // Compile calendar details
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Filter events for the currently highlighted calendar day
  const highlightedDayEvents = academicCalendar.filter(
    (e) => e.startTime.split("T")[0] === selectedDate
  );

  // Heatmap generation helpers
  const heatmapDays = [];
  const heatmapToday = new Date();
  for (let i = 120; i >= 0; i--) {
    const d = new Date(heatmapToday);
    d.setDate(heatmapToday.getDate() - i);
    const dateString = d.toISOString().split("T")[0] || "";
    heatmapDays.push({
      date: dateString,
      count: activityHeatmap[dateString] || 0
    });
  }

  const getHeatmapColor = (count: number) => {
    if (count === 0) return "bg-white/[0.03]";
    if (count <= 1) return "bg-emerald-500/20";
    if (count <= 3) return "bg-emerald-500/40";
    if (count <= 5) return "bg-emerald-500/60";
    return "bg-emerald-500/90 filter drop-shadow-[0_0_4px_rgba(16,185,129,0.3)]";
  };

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case "LIVE_CLASS": return "text-blue-400 bg-blue-500/10 border border-blue-500/20";
      case "ASSIGNMENT": return "text-amber-400 bg-amber-500/10 border border-amber-500/20";
      case "QUIZ": return "text-purple-400 bg-purple-500/10 border border-purple-500/20";
      case "EXAM": return "text-red-400 bg-red-500/10 border border-red-500/20";
      case "NOTICE": return "text-teal-400 bg-teal-500/10 border border-teal-500/20";
      default: return "text-gray-400 bg-white/5 border border-white/10";
    }
  };

  // Dynamic live countdown calculation for Today's Classes and Upcoming Deadlines
  const getCountdownLabel = (startTimeStr: string, endTimeStr: string) => {
    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);
    const diffMs = start.getTime() - now.getTime();
    
    // Ongoing class check
    if (now.getTime() >= start.getTime() && now.getTime() <= end.getTime()) {
      const remainingMs = end.getTime() - now.getTime();
      const remainingMins = Math.ceil(remainingMs / (1000 * 60));
      return {
        label: `ONGOING • ${remainingMins}m left`,
        active: true,
        ended: false,
      };
    }

    if (diffMs <= 0) {
      return {
        label: "Completed",
        active: false,
        ended: true,
      };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.ceil((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours === 0) {
      return {
        label: `Starts in ${diffMins}m`,
        active: true,
        ended: false,
      };
    }

    if (diffHours < 24) {
      return {
        label: `Starts in ${diffHours}h ${diffMins}m`,
        active: true,
        ended: false,
      };
    }

    const diffDays = Math.floor(diffHours / 24);
    return {
      label: `Starts in ${diffDays}d`,
      active: false,
      ended: false,
    };
  };

  const getDeadlineCountdownLabel = (endTimeStr: string) => {
    const end = new Date(endTimeStr);
    const diffMs = end.getTime() - now.getTime();

    if (diffMs <= 0) {
      return {
        label: "Closed",
        critical: false,
        ended: true
      };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.ceil((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours === 0) {
      return {
        label: `due in ${diffMins}m`,
        critical: true,
        ended: false
      };
    }

    if (diffHours < 12) {
      return {
        label: `due in ${diffHours}h ${diffMins}m`,
        critical: true,
        ended: false
      };
    }

    if (diffHours < 24) {
      return {
        label: `due in ${diffHours}h`,
        critical: false,
        ended: false
      };
    }

    const diffDays = Math.floor(diffHours / 24);
    return {
      label: `due in ${diffDays}d`,
      critical: false,
      ended: false
    };
  };

  // Filter Upcoming Deadlines from calendar events (quizzes, assignments, exams happening next)
  const upcomingDeadlines = academicCalendar
    .filter((e) => {
      const isDeadlineType = e.eventType === "ASSIGNMENT" || e.eventType === "QUIZ" || e.eventType === "EXAM";
      const isInFuture = new Date(e.startTime).getTime() > now.getTime();
      return isDeadlineType && isInFuture;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 4);

  // Filter Notices from events
  const noticesEvents = academicCalendar.filter((e) => e.eventType === "NOTICE");

  // Format level credentials
  const levelInfo = gamificationProfile?.levelInfo || {
    currentLevel: 1,
    title: "Aura Initiate",
    xp: localXp,
    minXp: 0,
    maxXp: 1000,
    progressPercentage: Math.min(100, Math.round((localXp / 1000) * 100)),
  };

  // Compile line graph SVG coordinates from quiz attempt scores
  const renderQuizAnalyticsGraph = () => {
    if (attempts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-28 text-center text-[10px] text-gray-500 italic bg-white/[0.01] rounded-xl border border-white/5 border-dashed p-4">
          <Brain className="h-6 w-6 text-gray-600 mb-1" />
          <span>No quiz statistics found. Solve a quiz to plot accuracy charts!</span>
        </div>
      );
    }

    // Sort attempts chronologically
    const sortedAttempts = [...attempts]
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
      .slice(-6); // Plot last 6 attempts for cleanliness

    const height = 90;
    const width = 240;
    const padding = 15;

    // Map attempts to X/Y coordinates
    const points = sortedAttempts.map((att, index) => {
      const scorePct = (att.score / att.totalQuestions) * 100;
      const x = padding + (index * (width - 2 * padding)) / (sortedAttempts.length - 1 || 1);
      const y = height - padding - (scorePct * (height - 2 * padding)) / 100;
      return { x, y, scorePct, title: att.quiz?.title || "Quiz" };
    });

    // SVG Polyline Path d
    let pathD = "";
    let fillD = "";
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
      fillD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    }

    return (
      <div className="space-y-3">
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible select-none">
            <defs>
              <linearGradient id="glow-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <line x1={padding} y1={(height) / 2} x2={width - padding} y2={(height) / 2} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

            {/* Filled Area */}
            {fillD && <path d={fillD} fill="url(#glow-gradient)" />}

            {/* Line Path */}
            {pathD && (
              <path 
                d={pathD} 
                fill="none" 
                stroke="rgb(139, 92, 246)" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="filter drop-shadow-[0_0_2px_rgba(139,92,246,0.5)]"
              />
            )}

            {/* Glowing nodes */}
            {points.map((p, idx) => (
              <g key={idx} className="group cursor-pointer">
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="3.5" 
                  fill="rgb(99, 102, 241)" 
                  stroke="#09090b" 
                  strokeWidth="1.5"
                  className="transition-all duration-300 hover:scale-150 hover:fill-purple-400"
                />
                <title>{`${p.title}: ${Math.round(p.scorePct)}% accuracy`}</title>
              </g>
            ))}
          </svg>
        </div>

        <div className="flex justify-between items-center text-[8px] text-gray-500 font-mono px-1">
          <span>Oldest Attempt</span>
          <span className="text-purple-400 font-bold">Accuracy Trend %</span>
          <span>Latest Quiz</span>
        </div>
      </div>
    );
  };

  // Compile Leaderboard top 4 snapshot + highlighted current user
  const renderLeaderboardSnapshot = () => {
    const top4 = leaderboardStandings.slice(0, 4);
    const currentUserRank = leaderboardStandings.find((s) => s.userId === user.id) || {
      id: "local",
      userId: user.id,
      name: user.name,
      xp: localXp,
      streak: user.streak,
      rank: gamificationProfile?.rank || 999
    };

    const isUserInTop4 = top4.some((s) => s.userId === user.id);

    return (
      <div className="space-y-2.5">
        {top4.map((entry, idx) => {
          const isSelf = entry.userId === user.id;
          const medals = ["🥇", "🥈", "🥉", "🎓"];

          return (
            <div 
              key={entry.id} 
              className={`p-2.5 rounded-xl border transition-colors flex items-center justify-between text-xs ${
                isSelf 
                  ? "bg-indigo-500/10 border-indigo-500/30 text-white" 
                  : "bg-[#09090b]/30 border-white/5 hover:border-white/10 text-gray-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{medals[idx] || "👤"}</span>
                <div>
                  <p className={`font-bold leading-none ${isSelf ? "text-white" : "text-gray-200"}`}>
                    {entry.name} {isSelf && <span className="text-[9px] text-indigo-400 uppercase font-mono">(You)</span>}
                  </p>
                  <p className="text-[9px] text-gray-500 mt-0.5">{entry.streak} day streak</p>
                </div>
              </div>
              <div className="text-right font-mono">
                <p className="font-bold text-white text-[11px]">{entry.xp} XP</p>
                <p className="text-[9px] text-indigo-400">Rank #{idx + 1}</p>
              </div>
            </div>
          );
        })}

        {/* If user is outside top 4, render divider & user rank at bottom */}
        {!isUserInTop4 && (
          <>
            <div className="flex justify-center my-1">
              <span className="text-[10px] text-gray-600 tracking-widest">• • •</span>
            </div>
            <div className="p-2.5 rounded-xl border bg-indigo-500/10 border-indigo-500/40 text-white flex items-center justify-between text-xs shadow-[0_0_10px_rgba(99,102,241,0.1)] animate-pulse">
              <div className="flex items-center gap-2">
                <span className="text-sm">⚡</span>
                <div>
                  <p className="font-bold leading-none text-white">
                    {currentUserRank.name} <span className="text-[9px] text-indigo-400 uppercase font-mono">(You)</span>
                  </p>
                  <p className="text-[9px] text-indigo-300 mt-0.5">{currentUserRank.streak} day streak</p>
                </div>
              </div>
              <div className="text-right font-mono">
                <p className="font-bold text-white text-[11px]">{currentUserRank.xp} XP</p>
                <p className="text-[9px] text-indigo-300">Rank #{currentUserRank.rank}</p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Compile dynamic smart insight strings
  const getSmartInsights = () => {
    const todayCount = todayClasses.length;
    const dbmsStreakActive = user.streak > 1;

    let insightText = "";
    if (todayCount === 0) {
      insightText = "Nice job! You have no live classes today. Check weak topics or attempt a practice quiz.";
    } else if (todayCount === 1) {
      insightText = "You have 1 interactive live lecture scheduled today. Stay focused!";
    } else {
      insightText = `You have ${todayCount} classes scheduled today. Check the timetable timeline below.`;
    }

    let motivationalText = "";
    if (dbmsStreakActive) {
      motivationalText = `Your active study streak is at ${user.streak} days. Keep this fire burning! 🔥`;
    } else {
      motivationalText = "Start solving quizzes or read coursework lessons today to kickstart a high study streak! ⚡";
    }

    return { insightText, motivationalText };
  };

  const { insightText, motivationalText } = getSmartInsights();

  return (
    <div className="space-y-8">
      {/* Dynamic toast notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#09090b] border-2 border-emerald-500/30 text-emerald-400 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="text-lg">🏆</span>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* 1. SMART GREETING HEADER (Operating System Style) */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5" />
              <span>IITM Verified Scholar</span>
            </span>
            <span className="text-[10px] text-gray-500 font-mono">Roll: {user.rollNumber}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {greeting}, {user.name} 👋
          </h1>
          <div className="space-y-1 mt-1 text-xs text-gray-400 font-medium">
            <p className="flex items-center gap-1.5 text-indigo-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
              {insightText}
            </p>
            <p className="text-orange-400/90 font-semibold">{motivationalText}</p>
          </div>
          
          <div className="flex items-center gap-3 pt-2 text-xs text-gray-500">
            <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
              {user.degreeTrack === "BS_DATA_SCIENCE" ? "BS in Data Science" : "BS in Electronic Systems"}
            </span>
            <span>•</span>
            <span className="text-gray-400 font-bold">{subjects.length} Selected subjects</span>
          </div>
        </div>

        {/* METRICS & STREAKS WIDGETS */}
        <div className="flex gap-4 z-10 w-full md:w-auto">
          {/* Flame streak */}
          <div className="bg-[#09090b]/60 border border-white/5 p-4 rounded-2xl flex-1 md:flex-initial text-center min-w-[100px] space-y-1 relative group hover:border-orange-500/20 transition-all">
            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
            <span className="text-2xl inline-block animate-pulse">🔥</span>
            <p className="text-[9px] text-gray-500 uppercase font-semibold">Streak</p>
            <p className="text-sm font-extrabold text-orange-400">{user.streak} Days</p>
            <p className="text-[8px] text-gray-600 italic">keep it going!</p>
          </div>

          {/* XP & LEVEL CARD */}
          <div className="bg-[#09090b]/60 border border-white/5 p-4 rounded-2xl flex-1 md:flex-initial text-center min-w-[140px] space-y-1 relative group hover:border-purple-500/20 transition-all">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
            <span className="text-2xl inline-block">🎓</span>
            <p className="text-[9px] text-gray-500 uppercase font-semibold">Level {levelInfo.currentLevel}</p>
            <p className="text-xs font-extrabold text-purple-400 truncate max-w-[120px]">{levelInfo.title}</p>
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-1.5">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${levelInfo.progressPercentage}%` }}></div>
            </div>
            <p className="text-[8px] text-gray-500 font-mono mt-0.5">{levelInfo.xp} XP total</p>
          </div>
        </div>
      </div>

      {/* 2. GITHUB-STYLE STUDY HEATMAP MATRIX */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-4.5 w-4.5 text-indigo-400" />
            <span>Student Study Consistency Matrix</span>
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">Visual representation of daily experience logs, lesson completions, and quiz solutions over the last 120 days</p>
        </div>

        {/* Heatmap Grid */}
        <div className="flex flex-wrap gap-1.5 pt-2 select-none justify-start">
          {heatmapDays.map((item, idx) => (
            <div
              key={idx}
              title={`${item.date} : ${item.count} activity log(s)`}
              className={`h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-sm transition-all hover:scale-125 hover:z-10 ${getHeatmapColor(item.count)}`}
            />
          ))}
        </div>
        <div className="flex justify-between items-center text-[10px] text-gray-500 px-1 pt-1.5 border-t border-white/[0.02]">
          <span>Less Active</span>
          <div className="flex gap-1.5 items-center">
            <span className="h-2.5 w-2.5 rounded-sm bg-white/[0.03]"></span>
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/20"></span>
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/40"></span>
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/60"></span>
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/90"></span>
            <span className="ml-1">More Active</span>
          </div>
        </div>
      </div>

      {/* 3. CORE CO-PILOT GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT SIDE COLUMN (7 COLS) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* TODAY'S CLASSES TIMETABLE WIDGET */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-blue-400" />
                <span>Today's Classes Schedule</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Live sessions timetables mapped strictly to your selected subjects</p>
            </div>

            {todayClasses.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500 italic bg-white/[0.01] rounded-xl border border-white/5">
                No classes scheduled today. Utilize this time to complete lessons or solve practice quizzes!
              </div>
            ) : (
              <div className="space-y-3.5">
                {todayClasses.map((cl) => {
                  const startTimeStr = new Date(cl.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  const endTimeStr = new Date(cl.endTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  const countdown = getCountdownLabel(cl.startTime, cl.endTime);
                  
                  return (
                    <div 
                      key={cl.id} 
                      className={`p-4 bg-[#09090b]/40 border rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors ${
                        countdown.active 
                          ? "border-blue-500/30 bg-blue-500/[0.02]" 
                          : "border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded ${getEventBadgeColor(cl.eventType)}`}>
                            {cl.subject.code || "IITM"}
                          </span>
                          <span className="text-[9px] font-bold text-indigo-400 uppercase">{cl.eventType.replace(/_/g, " ")}</span>
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-white leading-snug">{cl.title}</h4>
                        <p className="text-[11px] text-gray-400 leading-normal">{cl.description}</p>
                      </div>
                      
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 gap-2 font-mono">
                        <div className="text-left sm:text-right font-medium text-xs text-gray-400">
                          <p>{startTimeStr}</p>
                          <p className="text-[10px] text-gray-500">to {endTimeStr}</p>
                        </div>
                        {countdown.active ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 animate-pulse">
                            {countdown.label}
                          </span>
                        ) : countdown.ended ? (
                          <span className="text-[9px] font-bold uppercase text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                            Ended
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                            {countdown.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* UPCOMING DEADLINES WIDGET */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Target className="h-4.5 w-4.5 text-amber-500" />
                <span>Upcoming Deadlines Cockpit</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Critical homework assignments, quizzes, and examinations sorted by urgency</p>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500 italic bg-white/[0.01] rounded-xl border border-white/5">
                No upcoming assignments or assessments scheduled in the next 7 days. Excellent coverage!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {upcomingDeadlines.map((e) => {
                  const deadlineCountdown = getDeadlineCountdownLabel(e.startTime);
                  const dateLabel = new Date(e.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                  return (
                    <div 
                      key={e.id} 
                      className={`p-3.5 bg-[#09090b]/40 border rounded-xl flex flex-col justify-between hover:border-white/10 transition-colors ${
                        deadlineCountdown.critical ? "border-amber-500/30" : "border-white/5"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded ${getEventBadgeColor(e.eventType)}`}>
                            {e.subject.code || "IITM"}
                          </span>
                          <span className="text-[9px] font-mono text-gray-500">{dateLabel}</span>
                        </div>
                        <h4 className="font-bold text-xs text-white leading-snug line-clamp-1">{e.title}</h4>
                        <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{e.description}</p>
                      </div>

                      <div className="pt-3 flex justify-between items-center border-t border-white/[0.02] mt-3">
                        <span className="text-[9px] text-indigo-400 font-bold uppercase">{e.eventType}</span>
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${
                          deadlineCountdown.critical 
                            ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" 
                            : "bg-white/5 text-gray-400"
                        }`}>
                          {deadlineCountdown.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DYNAMIC ACADEMIC CALENDAR ENGINE */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CalendarIcon className="h-4.5 w-4.5 text-purple-400" />
                  <span>Personal Academic Calendar</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Explore monthly schedule events filtered strictly to active semester courses</p>
              </div>

              {/* Month Switcher */}
              <div className="flex gap-2 items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                <button onClick={prevMonth} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-bold text-white min-w-[90px] text-center">
                  {currentDate.toLocaleString(undefined, { month: "long", year: "numeric" })}
                </span>
                <button onClick={nextMonth} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid Matrix */}
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty padding offsets for first week */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`offset-${i}`} className="aspect-square bg-transparent"></div>
                ))}

                {/* Calendar Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayDateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                  const dayDateStr = dayDateObj.toISOString().split("T")[0] || "";

                  // Find if day holds any active events
                  const dayEvents = academicCalendar.filter((e) => e.startTime.split("T")[0] === dayDateStr);
                  const isSelected = selectedDate === dayDateStr;

                  return (
                    <button
                      key={dayNum}
                      onClick={() => setSelectedDate(dayDateStr)}
                      className={`aspect-square rounded-xl border flex flex-col justify-between p-1.5 sm:p-2 text-xs font-bold transition-all relative ${
                        isSelected
                          ? "bg-indigo-600/10 border-indigo-500 text-indigo-200"
                          : dayEvents.length > 0
                          ? "bg-white/[0.02] border-white/5 hover:bg-white/5 text-white"
                          : "bg-transparent border-transparent text-gray-500 hover:bg-white/[0.005]"
                      }`}
                    >
                      <span>{dayNum}</span>
                      
                      {/* Dots indicators */}
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 justify-center w-full mt-auto">
                          {dayEvents.slice(0, 3).map((e, idx) => (
                            <span 
                              key={idx} 
                              className={`h-1.5 w-1.5 rounded-full ${
                                e.eventType === "EXAM" 
                                  ? "bg-red-500" 
                                  : e.eventType === "ASSIGNMENT" 
                                  ? "bg-amber-500" 
                                  : e.eventType === "LIVE_CLASS"
                                  ? "bg-blue-500"
                                  : "bg-purple-500"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected day audit logs details */}
            <div className="border-t border-white/5 pt-5 space-y-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Selected date schedule : </span>
                <span className="text-white font-mono">{new Date(selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </h4>

              {highlightedDayEvents.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No classes, exams, or homework deadlines mapped to this date.</p>
              ) : (
                <div className="space-y-3">
                  {highlightedDayEvents.map((e) => (
                    <div key={e.id} className="p-3.5 bg-[#09090b]/40 border border-white/5 rounded-xl flex gap-3">
                      <span className="text-xl mt-0.5">🗓️</span>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-white leading-tight">{e.title}</p>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${getEventBadgeColor(e.eventType)}`}>
                            {e.eventType}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400">{e.description}</p>
                        <p className="text-[9px] text-gray-500 font-mono">Time slot: {new Date(e.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* DAILY QUESTS HUB */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="h-4.5 w-4.5 text-yellow-500" />
                  <span>Daily Quests Hub</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Solve timed quiz questions, complete courses, and claim experience points rewards.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {missions.map((m) => {
                const pct = Math.min(100, Math.round((m.currentCount / m.mission.targetCount) * 100));
                const completed = m.completed || m.currentCount >= m.mission.targetCount;
                const claimed = m.claimed;

                return (
                  <div key={m.id} className="border border-white/5 bg-[#09090b]/40 p-4 rounded-xl flex flex-col justify-between hover:border-white/10 transition-colors">
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded uppercase">
                        {m.mission.type} Quest
                      </span>
                      <h4 className="font-bold text-white text-xs leading-snug line-clamp-1">{m.mission.title}</h4>
                      <p className="text-[10px] text-gray-400 leading-normal line-clamp-2">{m.mission.description}</p>
                    </div>

                    <div className="space-y-2.5 pt-3">
                      <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>

                      {claimed ? (
                        <button disabled className="w-full py-1 bg-emerald-500/5 text-emerald-500 border border-emerald-500/10 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>Claimed (+{m.mission.xpReward} XP)</span>
                        </button>
                      ) : completed ? (
                        <button
                          onClick={() => handleClaimReward(m.id, m.mission.xpReward)}
                          disabled={claimLoading === m.id}
                          className="w-full py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-[10px] font-bold transition-all shadow flex items-center justify-center"
                        >
                          {claimLoading === m.id ? <span>Claiming...</span> : <span>⚡ Claim +{m.mission.xpReward} XP</span>}
                        </button>
                      ) : (
                        <button disabled className="w-full py-1 bg-white/5 text-gray-500 rounded-lg text-[10px] font-bold">
                          In Progress ({pct}%)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT SIDE COLUMN (5 COLS) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* AI STUDY COPILOT SUGGESTIONS WIDGET */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 relative overflow-hidden bg-gradient-to-br from-indigo-950/20 via-purple-950/10 to-slate-950/20">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-indigo-500/5 blur-2xl pointer-events-none" />
            
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Brain className="h-4.5 w-4.5 text-indigo-400" />
                <span>AI Copilot Suggestions</span>
              </h3>
              <button
                onClick={handleRecomputeRecs}
                disabled={recsLoading}
                className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[9px] font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center cursor-pointer"
                title="Recalculate AI Recommendations"
              >
                {recsLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Refresh
              </button>
            </div>

            {recommendations.length === 0 ? (
              <div className="text-center py-6 bg-black/20 rounded-xl border border-white/5">
                <p className="text-[10px] text-gray-500 italic">No recommendations. Take quizzes or chat with Copilot to generate suggestions!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex gap-3 hover:bg-black/40 hover:border-white/10 transition-all relative group"
                  >
                    <button
                      onClick={() => handleDismissRec(rec.id)}
                      className="absolute top-2.5 right-2.5 p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Dismiss suggestion"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    <div className="p-2 rounded bg-indigo-600/10 border border-indigo-500/20 text-xs flex items-center justify-center shrink-0 h-8 w-8 text-indigo-400">
                      {rec.type === "QUIZ" && "📝"}
                      {rec.type === "SESSION" && "📅"}
                      {rec.type === "PYQ" && "📂"}
                      {rec.type === "ROOM" && "💬"}
                    </div>

                    <div className="min-w-0 pr-4">
                      <h4 className="text-xs font-bold text-white leading-tight">
                        {rec.title}
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                        {rec.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                          {rec.reason}
                        </span>
                        {rec.itemId && (
                          <a
                            href={
                              rec.type === "QUIZ"
                                ? `/quiz/${rec.itemId}`
                                : rec.type === "ROOM" || rec.type === "SESSION" || rec.type === "PYQ"
                                ? `/rooms/${rec.itemId}`
                                : "#"
                            }
                            className="text-[8px] font-bold text-indigo-400 hover:underline flex items-center gap-0.5"
                          >
                            Jump to Space <ArrowUpRight className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QUICK ACTIONS PANEL */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
              <span>Workspace Cockpit</span>
            </h3>

            <div className="grid grid-cols-2 gap-3.5">
              <a href="/courses" className="p-3 bg-[#09090b]/40 border border-white/5 hover:border-white/10 rounded-xl text-center space-y-1 hover:bg-[#0c0a1c] transition-all group">
                <span className="text-xl group-hover:scale-125 inline-block transition-transform">📚</span>
                <p className="text-[10px] font-bold text-white">Continue Learning</p>
              </a>
              <a href="/quiz" className="p-3 bg-[#09090b]/40 border border-white/5 hover:border-white/10 rounded-xl text-center space-y-1 hover:bg-[#0c0a1c] transition-all group">
                <span className="text-xl group-hover:scale-125 inline-block transition-transform">✏️</span>
                <p className="text-[10px] font-bold text-white">Attempt Quiz</p>
              </a>
              <a href="/courses" className="p-3 bg-[#09090b]/40 border border-white/5 hover:border-white/10 rounded-xl text-center space-y-1 hover:bg-[#0c0a1c] transition-all group">
                <span className="text-xl group-hover:scale-125 inline-block transition-transform">📁</span>
                <p className="text-[10px] font-bold text-white">Open Assignment</p>
              </a>
              <a href="/pyq" className="p-3 bg-[#09090b]/40 border border-white/5 hover:border-white/10 rounded-xl text-center space-y-1 hover:bg-[#0c0a1c] transition-all group">
                <span className="text-xl group-hover:scale-125 inline-block transition-transform">📂</span>
                <p className="text-[10px] font-bold text-white">View PYQs</p>
              </a>
            </div>
            <a href="/forums" className="w-full p-2.5 bg-[#0d0d15] border border-indigo-500/10 hover:border-indigo-500/30 rounded-xl text-center text-[10px] font-bold text-indigo-400 block transition-all">
              💬 Open Forums & Peer Discussion
            </a>
          </div>

          {/* PERSONALIZED LEADERBOARD SNAPSHOT */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Trophy className="h-4.5 w-4.5 text-yellow-400" />
                <span>Leaderboard Standing</span>
              </h3>
              <a href="/leaderboard" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-0.5">
                <span>View All</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>

            {renderLeaderboardSnapshot()}
          </div>

          {/* QUIZ ANALYTICS GRAPH WIDGET */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-purple-400" />
              <span>Quiz Analytics Trend</span>
            </h3>
            
            {renderQuizAnalyticsGraph()}
          </div>

          {/* SUBJECT PROGRESS OVERVIEW */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-indigo-400" />
              <span>Syllabus Track Progression</span>
            </h3>

            <div className="space-y-3.5">
              {subjects.slice(0, 4).map((sub) => {
                const enrolled = enrolledCourses.find((c) => c.title.toLowerCase().includes(sub.name.toLowerCase()));
                const progressPct = enrolled ? enrolled.progressPercentage : 0;
                
                return (
                  <div key={sub.id} className="p-3 bg-[#09090b]/40 border border-white/5 rounded-xl space-y-2 hover:border-white/10 transition-colors">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">{sub.code || "IITM"}</span>
                        <span className="font-bold text-white truncate max-w-[140px]">{sub.name}</span>
                      </div>
                      <span className="text-gray-400 font-semibold">{progressPct}% Complete</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WEAK TOPICS DIAGNOSTIC ALERTS */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-red-400" />
                <span>Weak Topics Diagnostics</span>
              </h3>
              <p className="text-[11px] text-gray-500">Subject chapters currently calculated below 70% proficiency index</p>
            </div>

            {weakTopicsList.length === 0 ? (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-start gap-2 text-xs text-emerald-400">
                <span className="text-base mt-0.5">✨</span>
                <p><strong>Perfect accuracy:</strong> No weak topic segments catalogued. Complete quizzes to calibrate diagnostics.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {weakTopicsList.map((wt, i) => (
                  <div key={i} className="flex justify-between items-center p-3.5 bg-red-500/5 border border-red-500/10 rounded-xl text-xs">
                    <div>
                      <p className="font-bold text-white">{wt.topic}</p>
                      <p className="text-[10px] text-gray-500">Solved: {wt.questionsSolved} questions</p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
                        {wt.accuracy}% Accuracy
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* IMPORTANT NOTICES CENTER */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-teal-400" />
              <span>Academic Notice Pinboard</span>
            </h3>

            {noticesEvents.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-2">No urgent alerts or notice board notifications published.</p>
            ) : (
              <div className="space-y-3">
                {noticesEvents.map((note) => (
                  <div key={note.id} className="p-3 bg-teal-500/[0.02] border border-teal-500/10 rounded-xl text-xs space-y-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-teal-500/[0.02] rounded-full blur-xl pointer-events-none"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold font-mono text-teal-400 uppercase">Alert Notice</span>
                      <span className="text-[8px] text-gray-500">{new Date(note.startTime).toLocaleDateString()}</span>
                    </div>
                    <h5 className="font-bold text-white text-xs">{note.title}</h5>
                    <p className="text-[10px] text-gray-400 leading-normal">{note.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RECENT ACTIVITY TIMELINE FEED */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-indigo-400" />
              <span>Scholar Activity Feed</span>
            </h3>

            {(!gamificationProfile?.xpLogs || gamificationProfile.xpLogs.length === 0) ? (
              <p className="text-xs text-gray-500 italic py-2">No active timeline events recorded yet.</p>
            ) : (
              <div className="space-y-3.5 pt-1">
                {gamificationProfile.xpLogs.slice(0, 5).map((log, idx) => {
                  const dateStr = new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={log.id || idx} className="flex gap-3 text-xs items-start border-l border-white/5 pl-3 relative ml-1.5 pb-2">
                      <div className="absolute h-2 w-2 rounded-full bg-indigo-500 -left-[4.5px] top-1.5 filter drop-shadow-[0_0_2px_rgba(99,102,241,0.5)]"></div>
                      <div className="space-y-0.5 flex-1">
                        <p className="text-gray-300">
                          {log.reason.replace(/_/g, " ")}{" "}
                          <span className="text-indigo-400 font-bold font-mono">+{log.amount} XP</span>
                        </p>
                        <p className="text-[9px] text-gray-500 font-mono">{dateStr}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
