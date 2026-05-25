"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createConversation, sendMessage } from "@/services/chatService";
import { 
  Award, 
  Flame, 
  BookOpen, 
  Clock, 
  Calendar,
  Shield, 
  Sparkles,
  Trophy,
  CheckCircle,
  ExternalLink,
  UserCheck,
  Activity,
  ShieldAlert,
  Brain,
  MessageSquare,
  Copy,
  TrendingUp,
  X,
  Send
} from "lucide-react";

// --- TYPES & INTERFACES ---

interface ProfileUser {
  id: string;
  username: string;
  email: string;
  role: string;
  name: string;
  avatarUrl: string | null;
  streak: number;
  xp: number;
  rollNumber: string;
  degreeTrack: string;
  isOfficialIITM: boolean;
  createdAt: string;
  bio: string;
}

interface LevelInfo {
  currentLevel: number;
  title: string;
  xp: number;
  minXp: number;
  maxXp: number;
  progressPercentage: number;
}

interface Achievement {
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  rarity: string;
}

interface Badge {
  name: string;
  description: string;
  icon: string;
}

interface Certificate {
  id: string;
  certificateCode: string;
  issuedAt: string;
  course: { title: string };
}

interface XPLog {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

interface SelectedSubject {
  code: string | null;
  name: string;
  icon: string;
}

interface Attempt {
  id: string;
  score: number;
  totalQuestions: number;
  timeSpent: number;
  completedAt: string;
  quiz?: { title: string };
}

interface Analytics {
  weakTopics: string;
  overallAccuracy: number;
  totalQuizzesTaken: number;
}

interface StudentProfileClientProps {
  profileUser: ProfileUser;
  levelInfo: LevelInfo;
  rank: number;
  userAchievements: Array<{ id: string; achievement: Achievement }>;
  userBadges: Array<{ id: string; badge: Badge }>;
  certificates: Certificate[];
  xpLogs: XPLog[];
  selectedSubjects: SelectedSubject[];
  attempts: Attempt[];
  analytics: Analytics | null;
  enrolledCourses: any[];
  heatmap: Record<string, number>;
  sharedSubjects: Array<{ code: string | null; name: string }>;
  isOwnProfile: boolean;
  viewerId: string | null;
}

export default function StudentProfileClient({
  profileUser,
  levelInfo,
  rank,
  userAchievements,
  userBadges,
  certificates,
  xpLogs,
  selectedSubjects,
  attempts,
  analytics,
  enrolledCourses,
  heatmap,
  sharedSubjects,
  isOwnProfile,
  viewerId,
}: StudentProfileClientProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const router = useRouter();
  
  // Quick Message Modal State
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  // Parse weak topics from analytics
  let weakTopicsList: Array<{ topic: string; accuracy: number; questionsSolved: number }> = [];
  if (analytics?.weakTopics) {
    try {
      weakTopicsList = JSON.parse(analytics.weakTopics);
    } catch (_) {
      weakTopicsList = [];
    }
  }

  // Copy Profile Link function
  const handleCopyProfileLink = () => {
    const url = `${window.location.origin}/u/${profileUser.username}`;
    navigator.clipboard.writeText(url);
    setToastMessage("📋 Profile URL copied to clipboard!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Chat conversation and message note dispatcher
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    if (!viewerId) {
      alert("You must be logged in to send a note.");
      return;
    }

    setSending(true);
    try {
      // 1. Create or retrieve active DM conversation
      const convRes = await createConversation(viewerId, {
        userIds: [viewerId, profileUser.id],
        isGroup: false,
      });

      if (!convRes.success || !convRes.conversation) {
        alert(convRes.error || "Failed to create conversation.");
        return;
      }

      // 2. Dispatch message content note
      const msgRes = await sendMessage(convRes.conversation.id, viewerId, messageText);
      if (!msgRes.success) {
        alert(msgRes.error || "Failed to send message note.");
        return;
      }

      // 3. Clear modal and redirect to inbox
      setMessageText("");
      setMessageOpen(false);
      setToastMessage("✉️ Message dispatched! Redirecting to inbox...");
      
      setTimeout(() => {
        setToastMessage(null);
        router.push(`/messages?conversationId=${convRes.conversation!.id}`);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      alert("Failed to send message note: " + err.message);
    } finally {
      setSending(false);
    }
  };

  // Heatmap generation helpers
  const heatmapDays = [];
  const heatmapToday = new Date();
  for (let i = 120; i >= 0; i--) {
    const d = new Date(heatmapToday);
    d.setDate(heatmapToday.getDate() - i);
    const dateString = d.toISOString().split("T")[0] || "";
    heatmapDays.push({
      date: dateString,
      count: heatmap[dateString] || 0
    });
  }

  const getHeatmapColor = (count: number) => {
    if (count === 0) return "bg-white/[0.03]";
    if (count <= 1) return "bg-emerald-500/20";
    if (count <= 3) return "bg-emerald-500/40";
    if (count <= 5) return "bg-emerald-500/60";
    return "bg-emerald-500/90 filter drop-shadow-[0_0_4px_rgba(16,185,129,0.3)]";
  };

  const rarityColor = (rarity: string) => {
    switch (rarity) {
      case "LEGENDARY": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "EPIC": return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "RARE": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      default: return "text-gray-400 bg-gray-500/10 border-gray-500/10";
    }
  };

  // Render SVG quiz analytics trend chart
  const renderQuizAnalyticsGraph = () => {
    if (attempts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-28 text-center text-[10px] text-gray-500 italic bg-white/[0.01] rounded-xl border border-white/5 border-dashed p-4">
          <Brain className="h-6 w-6 text-gray-600 mb-1" />
          <span>No quiz statistics found. Scholar has not taken practice exams yet.</span>
        </div>
      );
    }

    const sortedAttempts = [...attempts]
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
      .slice(-6); // Last 6 quiz logs

    const height = 90;
    const width = 240;
    const padding = 15;

    const points = sortedAttempts.map((att, index) => {
      const scorePct = (att.score / att.totalQuestions) * 100;
      const x = padding + (index * (width - 2 * padding)) / (sortedAttempts.length - 1 || 1);
      const y = height - padding - (scorePct * (height - 2 * padding)) / 100;
      return { x, y, scorePct, title: att.quiz?.title || "Quiz" };
    });

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
              <linearGradient id="profile-glow-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0" />
              </linearGradient>
            </defs>

            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <line x1={padding} y1={(height) / 2} x2={width - padding} y2={(height) / 2} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

            {fillD && <path d={fillD} fill="url(#profile-glow-gradient)" />}

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

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Toast notifications */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#09090b] border-2 border-indigo-500/30 text-indigo-400 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce font-medium text-xs">
          <span>🏆</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. MOCK MESSAGING OVERLAY MODAL */}
      {messageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full glass-panel border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl space-y-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Secure Peer Connection</span>
                <h3 className="text-lg font-bold text-white">Send Message to {profileUser.name}</h3>
              </div>
              <button 
                onClick={() => setMessageOpen(false)}
                className="p-1 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Your Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder={`Hi ${profileUser.name}, I noticed we share subjects. Would you like to collaborate on practice quizzes?`}
                  className="glass-input p-3.5 rounded-xl text-sm w-full focus:outline-none focus:border-indigo-500/50 min-h-[100px] resize-none"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-500">
                <span>Direct Workspace Ingestion</span>
                <span>Max 250 characters</span>
              </div>

              <div className="pt-2 flex justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setMessageOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-purple-900/15"
                >
                  {sending ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <span>Transmit Note</span>
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PROFILE HERO CARD WITH GREETINGS */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left z-10">
          <div className="relative">
            <div className="h-24 w-24 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-1 shadow-lg shadow-purple-900/20 flex items-center justify-center">
              {profileUser.avatarUrl ? (
                <img 
                  src={profileUser.avatarUrl} 
                  alt={profileUser.name} 
                  className="h-full w-full rounded-[14px] object-cover bg-neutral-900"
                />
              ) : (
                <div className="h-full w-full rounded-[14px] bg-[#0c0c14] flex items-center justify-center text-3xl text-white font-extrabold">
                  {profileUser.name[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-tr from-yellow-500 to-orange-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border-2 border-[#040406]">
              Lvl {levelInfo.currentLevel}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{profileUser.name}</h1>
              {profileUser.isOfficialIITM && (
                <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                  <UserCheck className="h-3 w-3" />
                  <span>IITM Official Scholar</span>
                </span>
              )}
              {isOwnProfile && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-md">
                  You
                </span>
              )}
            </div>
            
            <p className="text-gray-400 text-xs sm:text-sm font-medium font-mono leading-none">/u/{profileUser.username}</p>
            
            <p className="text-gray-400 text-xs sm:text-sm font-medium italic max-w-md mt-1">
              "{profileUser.bio || "AuraAcademy Scholar in active learning progression."}"
            </p>
            
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 text-[10px] sm:text-xs text-gray-500 pt-1 font-medium font-mono">
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-purple-400" />
                <span>{levelInfo.title}</span>
              </span>
              <span>•</span>
              <span>Roll: {profileUser.rollNumber}</span>
              <span>•</span>
              <span>Joined {profileUser.createdAt}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Metric pills */}
        <div className="flex gap-4 z-10 w-full md:w-auto justify-center">
          {/* Flame streak */}
          <div className="bg-[#09090b]/60 border border-white/5 px-5 py-4 rounded-2xl text-center space-y-1 min-w-[90px] flex-1 md:flex-none">
            <span className="text-lg">🔥</span>
            <p className="text-[9px] text-gray-500 uppercase font-semibold">Streak</p>
            <p className="text-sm sm:text-base font-bold text-orange-400">{profileUser.streak} Days</p>
          </div>
          {/* Local XP */}
          <div className="bg-[#09090b]/60 border border-white/5 px-5 py-4 rounded-2xl text-center space-y-1 min-w-[90px] flex-1 md:flex-none">
            <span className="text-lg">⭐</span>
            <p className="text-[9px] text-gray-500 uppercase font-semibold">XP Score</p>
            <p className="text-sm sm:text-base font-bold text-indigo-400">{profileUser.xp} XP</p>
          </div>
          {/* Rank */}
          <div className="bg-[#09090b]/60 border border-white/5 px-5 py-4 rounded-2xl text-center space-y-1 min-w-[90px] flex-1 md:flex-none">
            <span className="text-lg">🏆</span>
            <p className="text-[9px] text-gray-500 uppercase font-semibold">Rank</p>
            <p className="text-sm sm:text-base font-bold text-purple-400">#{rank}</p>
          </div>
        </div>
      </div>

      {/* 3. SHARED SUBJECT INTELLIGENCE & SOCIAL ACTIONS ROW */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-[#09090b]/30 p-4 border border-white/5 rounded-2xl">
        
        {/* Course Overlap summary */}
        <div className="flex items-center gap-2">
          <span className="text-xl">🤝</span>
          <div className="space-y-0.5">
            {isOwnProfile ? (
              <>
                <p className="text-xs font-bold text-white">This is your public scholar profile</p>
                <p className="text-[10px] text-gray-500 font-medium">Configure course configurations in your onboarding setups.</p>
              </>
            ) : sharedSubjects.length > 0 ? (
              <>
                <p className="text-xs font-bold text-white">You share subjects with this scholar!</p>
                <p className="text-[10px] text-indigo-400 font-bold uppercase font-mono">
                  Shared: {sharedSubjects.map((s) => s.name).join(", ")}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-white">No active course overlaps</p>
                <p className="text-[10px] text-gray-500 font-medium">Compare degree tracks and selected semester papers.</p>
              </>
            )}
          </div>
        </div>

        {/* Social actions buttons */}
        <div className="flex gap-2 text-xs">
          <button 
            onClick={handleCopyProfileLink}
            className="flex-1 sm:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy Link</span>
          </button>
          {!isOwnProfile && (
            <button 
              onClick={() => setMessageOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Send Note</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. LEVEL PROGRESS CARD */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-gray-400">Level {levelInfo.currentLevel} ({levelInfo.title})</span>
          <span className="text-indigo-400 font-mono">{levelInfo.xp} / {levelInfo.maxXp} XP</span>
        </div>
        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${levelInfo.progressPercentage}%` }}
          ></div>
        </div>
        <p className="text-[10px] text-gray-500 text-right">
          {levelInfo.maxXp - levelInfo.xp} XP remaining to Level {levelInfo.currentLevel + 1}
        </p>
      </div>

      {/* 5. DYNAMIC MATRIX CO-PILOT SOCIAL COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN (7 COLS): HEATMAP, GRAPHS, BADGES, CERTIFICATES */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* DAILY HEATMAP MATRIX */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-indigo-400" />
                <span>Scholar Study Consistency matrix</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Study grid mapping experience logs and lessons completions</p>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2 select-none justify-start">
              {heatmapDays.map((item, idx) => (
                <div
                  key={idx}
                  title={`${item.date} : ${item.count} activity log(s)`}
                  className={`h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-sm transition-all hover:scale-125 ${getHeatmapColor(item.count)}`}
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

          {/* SVG QUIZ ANALYTICS TREND */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-purple-400" />
              <span>Quiz Analytics Score Trajectory</span>
            </h3>
            
            {renderQuizAnalyticsGraph()}
          </div>

          {/* BADGES HUB */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
                <span>Interactive Unlocked Badges ({userBadges.length})</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Special badges earned for outstanding platform accomplishments</p>
            </div>

            {userBadges.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500 italic bg-white/[0.01] rounded-xl border border-white/5">
                No badges unlocked yet by this scholar.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {userBadges.map((ub) => (
                  <div key={ub.id} className="bg-[#09090b]/40 border border-white/5 p-4 rounded-xl flex flex-col items-center text-center space-y-2 hover:border-white/10 transition-colors">
                    <span className="text-3xl filter drop-shadow-[0_4px_8px_rgba(139,92,246,0.25)]">{ub.badge.icon}</span>
                    <p className="text-xs font-bold text-white leading-tight">{ub.badge.name}</p>
                    <p className="text-[9px] text-gray-500 leading-normal line-clamp-2">{ub.badge.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COURSE COMPLETIONS CERTIFICATES */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-purple-400" />
                <span>Verified Syllabus Credentials ({certificates.length})</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Downloadable verifiable secure course completion certificates</p>
            </div>

            {certificates.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500 italic bg-white/[0.01] rounded-xl border border-white/5">
                No courses completed yet by this scholar. Complete all modules in a syllabus track to claim!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {certificates.map((cert) => (
                  <div key={cert.id} className="border border-white/5 bg-[#09090b]/40 p-4 rounded-xl flex flex-col justify-between hover:border-white/10 transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-lg"></div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>VERIFIED</span>
                        </span>
                        <span className="text-[9px] text-gray-500 font-mono">{cert.certificateCode}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-purple-400 transition-colors">{cert.course.title}</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">Issued on {cert.issuedAt}</p>
                      </div>
                    </div>

                    <div className="pt-4 flex">
                      <a 
                        href={`/verify/${cert.certificateCode}`}
                        className="flex-1 inline-flex justify-center items-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition-all"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Verify &amp; Share</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN (5 COLS): PROGRESSION, WEAK TOPICS, TROPHIES, XP LOGS */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* ENROLLED SUBJECT PROGRESS */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-indigo-400" />
              <span>Syllabus Track Progression</span>
            </h3>

            <div className="space-y-3.5">
              {selectedSubjects.map((sub, idx) => {
                const enrolled = enrolledCourses.find((c) => c.title.toLowerCase().includes(sub.name.toLowerCase()));
                const progressPct = enrolled ? enrolled.progressPercentage : 0;
                
                return (
                  <div key={idx} className="p-3 bg-[#09090b]/40 border border-white/5 rounded-xl space-y-2">
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

          {/* WEAK TOPICS DIAGNOSTIC */}
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
                <p><strong>Perfect accuracy:</strong> No weak topic segments catalogued. High performance profile.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {weakTopicsList.map((wt, i) => (
                  <div key={i} className="flex justify-between items-center p-3.5 bg-red-500/5 border border-red-500/10 rounded-xl text-xs">
                    <div>
                      <p className="font-bold text-white">{wt.topic}</p>
                      <p className="text-[10px] text-gray-500 font-mono">Solved: {wt.questionsSolved} questions</p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-extrabold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        {wt.accuracy}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACHIEVEMENTS TROPHIES */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Trophy className="h-4.5 w-4.5 text-yellow-400" />
                <span>Scholar Achievements Unlocks ({userAchievements.length})</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Special game trophies unlocked dynamically</p>
            </div>

            {userAchievements.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500 italic bg-white/[0.01] rounded-xl border border-white/5">
                No achievements unlocked yet.
              </div>
            ) : (
              <div className="space-y-3.5">
                {userAchievements.map((ua) => (
                  <div key={ua.id} className="flex gap-3.5 p-3 bg-[#09090b]/40 border border-white/5 rounded-xl">
                    <span className="text-2xl mt-0.5 filter drop-shadow-[0_2px_4px_rgba(234,179,8,0.2)]">{ua.achievement.icon}</span>
                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <p className="text-xs font-bold text-white leading-tight">{ua.achievement.title}</p>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${rarityColor(ua.achievement.rarity)}`}>
                          {ua.achievement.rarity}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-normal">{ua.achievement.description}</p>
                      <p className="text-[9px] text-indigo-400 font-bold">+{ua.achievement.xpReward} XP Reward</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* XP HISTORY LOG TIMELINE */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-indigo-400" />
              <span>Recent Activity Feed</span>
            </h3>

            {xpLogs.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-2">No active timeline events recorded yet.</p>
            ) : (
              <div className="space-y-3.5 pt-1">
                {xpLogs.slice(0, 5).map((log, idx) => (
                  <div key={log.id || idx} className="flex gap-3 text-xs items-start border-l border-white/5 pl-3 relative ml-1.5 pb-2 font-mono">
                    <div className="absolute h-2 w-2 rounded-full bg-indigo-500 -left-[4.5px] top-1.5 filter drop-shadow-[0_0_2px_rgba(99,102,241,0.5)]"></div>
                    <div className="space-y-0.5 flex-1">
                      <p className="text-gray-300 font-sans">
                        {log.reason.replace(/_/g, " ")}{" "}
                        <span className="text-indigo-400 font-bold">+{log.amount} XP</span>
                      </p>
                      <p className="text-[9px] text-gray-500">{log.createdAt}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
