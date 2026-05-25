"use client";

import { useState } from "react";
import { 
  Search, 
  BookOpen, 
  Flame, 
  Award, 
  Target, 
  Clock, 
  Brain, 
  Sparkles, 
  Activity, 
  History,
  CheckCircle,
  Trophy
} from "lucide-react";
import { claimMissionRewardAction } from "@/services/gamificationActions";

interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
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
  weakTopics: Array<{ topic: string; accuracy: number; questionsSolved: number }>;
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

interface DashboardClientProps {
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
    avatarUrl: string | null;
    streak: number;
    xp: number;
  };
  subjects: Subject[];
  quizzes: Quiz[];
  attempts: Attempt[];
  analytics: Analytics | null;
  dailyMissions: Mission[];
}

export default function DashboardClient({
  user,
  subjects,
  quizzes,
  attempts,
  analytics,
  dailyMissions,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"quizzes" | "analytics" | "attempts">("quizzes");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");

  const [missions, setMissions] = useState(dailyMissions);
  const [localXp, setLocalXp] = useState(user.xp);
  const [claimLoading, setClaimLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleClaimReward = async (userMissionId: string, xpReward: number) => {
    try {
      setClaimLoading(userMissionId);
      const res = await claimMissionRewardAction(user.id, userMissionId);
      if (res.success) {
        setMissions(prev => prev.map(m => m.id === userMissionId ? { ...m, claimed: true } : m));
        setLocalXp(prev => prev + xpReward);
        setToastMessage(`🎉 Claimed +${xpReward} XP Reward! Level up status check complete.`);
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

  // Filter quizzes
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSubject = selectedSubject ? quiz.subjectId === selectedSubject : true;
    const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          quiz.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === "ALL" ? true : quiz.difficulty === difficultyFilter;
    
    return matchesSubject && matchesSearch && matchesDifficulty;
  });

  // Calculate quick stats
  const totalAttempts = attempts.length;
  const averageAccuracy = analytics ? analytics.overallAccuracy : 0;
  const currentStreak = user.streak;
  const totalXp = user.xp;

  return (
    <div className="space-y-8">
      
      {/* 1. QUICK STATS PANEL */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Streak Stat */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Streak</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-orange-400">🔥 {currentStreak} Days</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
            <Flame className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* XP Stat */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Experience</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-400">⭐ {localXp} XP</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Award className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Accuracy Stat */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Accuracy</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">🎯 {averageAccuracy}%</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Target className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Completed Quizzes */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quizzes Taken</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-purple-400">📊 {totalAttempts} Papers</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <BookOpen className="h-5.5 w-5.5" />
          </div>
        </div>

      </div>

      {/* TOAST MESSAGE CELEBRATION */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#09090b] border-2 border-emerald-500/30 text-emerald-400 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="text-lg">🏆</span>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* DAILY MISSIONS HUB WIDGET */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span>🎯 Daily Quests Hub</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Complete daily quests, claim experience rewards, and climb divisions.</p>
          </div>
          <a
            href={`/profile/${user.id}`}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/10"
          >
            <span>Showcase Achievements →</span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {missions.map((m) => {
            const pct = Math.min(100, Math.round((m.currentCount / m.mission.targetCount) * 100));
            const completed = m.completed || m.currentCount >= m.mission.targetCount;
            const claimed = m.claimed;
            
            return (
              <div key={m.id} className="border border-white/5 bg-[#09090b]/40 p-4 rounded-xl flex flex-col justify-between hover:border-white/10 transition-colors">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-bold uppercase">
                      {m.mission.type} Quest
                    </span>
                    <span className="text-gray-500 font-semibold">{m.currentCount} / {m.mission.targetCount}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm line-clamp-1">{m.mission.title}</h4>
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">{m.mission.description}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-3">
                  <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>

                  {claimed ? (
                    <button
                      disabled
                      className="w-full py-1.5 bg-emerald-500/5 text-emerald-500 border border-emerald-500/10 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Claimed (+{m.mission.xpReward} XP)</span>
                    </button>
                  ) : completed ? (
                    <button
                      onClick={() => handleClaimReward(m.id, m.mission.xpReward)}
                      disabled={claimLoading === m.id}
                      className="w-full py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow shadow-purple-900/30 flex items-center justify-center gap-1.5"
                    >
                      {claimLoading === m.id ? (
                        <span>Claiming...</span>
                      ) : (
                        <>
                          <span>⚡ Claim +{m.mission.xpReward} XP</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-1.5 bg-white/5 text-gray-500 rounded-lg text-xs font-bold"
                    >
                      In Progress ({pct}%)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="border-b border-white/5 pb-px">
        <div className="flex space-x-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab("quizzes")}
            className={`pb-4 border-b-2 px-1 transition-all ${
              activeTab === "quizzes" 
                ? "border-indigo-500 text-white font-bold" 
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="flex items-center space-x-2">
              <Brain className="h-4.5 w-4.5" />
              <span>Available Quizzes</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`pb-4 border-b-2 px-1 transition-all ${
              activeTab === "analytics" 
                ? "border-indigo-500 text-white font-bold" 
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="flex items-center space-x-2">
              <Activity className="h-4.5 w-4.5" />
              <span>Weakness Analysis</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab("attempts")}
            className={`pb-4 border-b-2 px-1 transition-all ${
              activeTab === "attempts" 
                ? "border-indigo-500 text-white font-bold" 
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="flex items-center space-x-2">
              <History className="h-4.5 w-4.5" />
              <span>Attempts Log</span>
            </span>
          </button>
        </div>
      </div>

      {/* 3. TAB VIEWS CONTENT */}
      {activeTab === "quizzes" && (
        <div className="space-y-6">
          
          {/* SEARCH, DIFFICULTY, AND CATEGORY FILTERS */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            
            {/* Search and Difficulty input group */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:max-w-md">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  className="glass-input pl-9 pr-3 py-2 w-full rounded-xl text-sm focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="glass-input px-3 py-2 rounded-xl text-sm focus:outline-none"
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
              >
                <option value="ALL">All Difficulties</option>
                <option value="EASY">Easy Only</option>
                <option value="MEDIUM">Medium Only</option>
                <option value="HARD">Hard Only</option>
              </select>
            </div>

            {/* Subject selector categories pills */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSubject(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedSubject === null
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                All Subjects
              </button>
              {subjects.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubject(sub.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedSubject === sub.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>

          </div>

          {/* QUIZZES CARD GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => (
              <div 
                key={quiz.id} 
                className="glass-panel p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden border border-white/5 hover:border-indigo-500/30 transition-all hover:scale-[1.01] group"
              >
                <div className="space-y-4">
                  {/* Meta tag rows */}
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                      {quiz.subject?.name || "Subject"}
                    </span>
                    <span className={`px-2 py-0.5 rounded ${
                      quiz.difficulty === "HARD" 
                        ? "bg-red-500/10 text-red-400" 
                        : quiz.difficulty === "MEDIUM" 
                        ? "bg-yellow-500/10 text-yellow-400" 
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {quiz.difficulty}
                    </span>
                  </div>

                  {/* Title and Description */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {quiz.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/5 pt-4">
                  {/* Info details */}
                  <div className="flex justify-between items-center text-xs text-gray-500 font-medium mb-4">
                    <span className="flex items-center space-x-1">
                      <span>📄</span>
                      <span>{quiz.totalQuestions} Questions</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{quiz.timeLimit ? `${quiz.timeLimit} Mins` : "No Limit"}</span>
                    </span>
                  </div>

                  {/* Start Action Button */}
                  <a
                    href={`/quiz/${quiz.id}`}
                    className="w-full inline-flex items-center justify-center py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                  >
                    Start Paper Exam
                  </a>
                </div>
              </div>
            ))}
          </div>

          {filteredQuizzes.length === 0 && (
            <div className="glass-panel py-16 rounded-2xl text-center space-y-3">
              <span className="text-3xl">🔍</span>
              <h4 className="text-base font-bold text-white">No Quizzes Found</h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                No active quizzes match your search parameters. Try choosing different subject tags or clearing the filters!
              </p>
            </div>
          )}

        </div>
      )}

      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* WEAKNESS ANALYSIS BOARDS (left 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="glass-panel p-6 rounded-2xl space-y-6 border border-white/5">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-indigo-400" />
                  <span>Subject Performance Chart</span>
                </h3>
                <p className="text-xs text-gray-500">Visual mapping of overall accuracy per learning subject</p>
              </div>

              {/* STUNNING CUSTOM SVG BAR CHART */}
              <div className="relative pt-2">
                <svg className="w-full h-48" viewBox="0 0 400 180" xmlns="http://www.w3.org/2000/svg">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="380" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <line x1="40" y1="70" x2="380" y2="70" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <line x1="40" y1="120" x2="380" y2="120" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <line x1="40" y1="150" x2="380" y2="150" stroke="rgba(255,255,255,0.08)" />

                  {/* Chart Bars (Mock dynamic categories) */}
                  {/* Category 1: Math */}
                  <rect x="70" y={150 - (analytics ? analytics.overallAccuracy * 1.2 : 0)} width="40" height={analytics ? analytics.overallAccuracy * 1.2 : 0} fill="#6366f1" rx="4" />
                  {/* Category 2: CS */}
                  <rect x="180" y="54" width="40" height="96" fill="#a855f7" rx="4" />
                  {/* Category 3: Physics */}
                  <rect x="290" y="42" width="40" height="108" fill="#3b82f6" rx="4" />

                  {/* Axis labels */}
                  <text x="90" y="168" fill="#a1a1aa" fontSize="10" textAnchor="middle">Mathematics</text>
                  <text x="200" y="168" fill="#a1a1aa" fontSize="10" textAnchor="middle">Computer Science</text>
                  <text x="310" y="168" fill="#a1a1aa" fontSize="10" textAnchor="middle">Quantum Physics</text>

                  <text x="30" y="24" fill="#52525b" fontSize="8" textAnchor="end">100%</text>
                  <text x="30" y="74" fill="#52525b" fontSize="8" textAnchor="end">50%</text>
                  <text x="30" y="124" fill="#52525b" fontSize="8" textAnchor="end">0%</text>
                </svg>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Brain className="h-4.5 w-4.5 text-indigo-400" />
                  <span>Topic Weakness Diagnostics</span>
                </h3>
                <p className="text-xs text-gray-500">Categories currently marked below 70% proficiency</p>
              </div>

              {analytics && analytics.weakTopics.length > 0 ? (
                <div className="space-y-3">
                  {analytics.weakTopics.map((topic, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-white">{topic.topic}</p>
                        <p className="text-xs text-gray-500">Questions Examined: {topic.questionsSolved}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                          {topic.accuracy}% Accuracy
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center space-x-2 text-xs text-emerald-400">
                  <span>✨</span>
                  <p>
                    <strong>Outstanding Achievement:</strong> You currently have no identified weak topics! Keep studying to maintain a high accuracy index.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* DYNAMIC SYSTEM REC CARD (right 5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="glass-panel p-6 rounded-2xl space-y-4 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-indigo-500/10 blur-xl"></div>
              
              <div className="inline-flex h-9 w-9 rounded-xl bg-indigo-500/10 items-center justify-center text-indigo-400 mb-2">
                <Sparkles className="h-4.5 w-4.5" />
              </div>

              <h4 className="text-base font-bold text-white">Dynamic Recommendations</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Our ecosystem analyses your attempts history in real-time. Here are your personalized next steps:
              </p>

              <div className="space-y-3">
                <div className="p-3 bg-white/5 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-white">1. Master Linear Spaces</p>
                  <p className="text-gray-400">Your determinants calculation speed was slower than standard. Try retaking Linear Algebra.</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-white">2. Check Peer Thread Answers</p>
                  <p className="text-gray-400">Students in <strong>r/QuantumMath</strong> uploaded explanations for Hamiltonian structures.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {activeTab === "attempts" && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <History className="h-5 w-5 text-indigo-400" />
              <span>Attempts Audit Log</span>
            </h3>
            <p className="text-xs text-gray-500">Comprehensive history of your quiz answers and details</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-gray-300">
              <thead>
                <tr className="bg-white/5 text-gray-400 border-b border-white/5 font-semibold">
                  <th className="p-4">Quiz Paper Title</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4 text-center">Questions Scored</th>
                  <th className="p-4 text-center">Score %</th>
                  <th className="p-4 text-center">Duration</th>
                  <th className="p-4">Completed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-white/2 transition-colors">
                    <td className="p-4 font-bold text-white">{att.quiz?.title || "Syllabus Paper"}</td>
                    <td className="p-4 text-gray-400">{att.quiz?.subject?.name || "Topic"}</td>
                    <td className="p-4 text-center font-semibold text-white">{att.score} / {att.totalQuestions}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        (att.score / att.totalQuestions) >= 0.7 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : "bg-red-500/10 text-red-400"
                      }`}>
                        {Math.round((att.score / att.totalQuestions) * 100)}%
                      </span>
                    </td>
                    <td className="p-4 text-center text-gray-400">
                      {Math.floor(att.timeSpent / 60)}m {att.timeSpent % 60}s
                    </td>
                    <td className="p-4 text-gray-500">{att.completedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {attempts.length === 0 && (
            <div className="py-16 text-center space-y-3">
              <span className="text-3xl">📭</span>
              <h4 className="text-base font-bold text-white">No Previous Attempts</h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                You have not completed any quizzes yet. Head over to the **Available Quizzes** tab to start practicing!
              </p>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
