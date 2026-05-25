import { getDbUser } from "@/lib/auth";
import { getUserGamificationProfile } from "@/services/gamificationService";
import { notFound } from "next/navigation";
import React from "react";
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
  ExternalLink
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  
  // Fetch profile gamification payload
  const profileData = await getUserGamificationProfile(id);
  if (!profileData) {
    notFound();
  }

  const currentUser = await getDbUser();
  const isOwnProfile = currentUser?.id === id;

  const {
    profile,
    levelInfo,
    rank,
    userAchievements,
    userBadges,
    certificates,
    xpLogs
  } = profileData;

  const rarityColor = (rarity: string) => {
    switch (rarity) {
      case "LEGENDARY": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "EPIC": return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "RARE": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      default: return "text-gray-400 bg-gray-500/10 border-gray-500/10";
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-[#040406]">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* PROFILE HEADER HERO */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left z-10">
            {/* Avatar block */}
            <div className="relative">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-1 shadow-lg shadow-purple-900/20">
                {profile?.avatarUrl ? (
                  <img 
                    src={profile.avatarUrl} 
                    alt={profile.name} 
                    className="h-full w-full rounded-[14px] object-cover bg-neutral-900"
                  />
                ) : (
                  <div className="h-full w-full rounded-[14px] bg-[#0c0c14] flex items-center justify-center text-3xl text-white font-extrabold">
                    {profile?.name ? profile.name[0].toUpperCase() : "S"}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-tr from-yellow-500 to-orange-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border-2 border-[#040406]">
                Lvl {levelInfo.currentLevel}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{profile?.name}</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-md">
                  {profileData.role}
                </span>
                {isOwnProfile && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-md">
                    You
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-xs sm:text-sm font-medium italic max-w-md">
                "{profile?.bio || "AuraAcademy Scholar in active learning progression."}"
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 text-xs text-gray-500 pt-1 font-medium">
                <span className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-purple-400" />
                  <span>{levelInfo.title}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Joined {new Date(profile?.createdAt || "").toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badge Container */}
          <div className="flex gap-4 z-10 w-full md:w-auto justify-center">
            {/* Streak */}
            <div className="bg-[#09090b]/60 border border-white/5 px-5 py-4 rounded-2xl text-center space-y-1 min-w-[100px] flex-1 md:flex-none">
              <span className="text-lg">🔥</span>
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Streak</p>
              <p className="text-base sm:text-lg font-bold text-orange-400">{profile?.streak} Days</p>
            </div>
            {/* XP */}
            <div className="bg-[#09090b]/60 border border-white/5 px-5 py-4 rounded-2xl text-center space-y-1 min-w-[100px] flex-1 md:flex-none">
              <span className="text-lg">⭐</span>
              <p className="text-[10px] text-gray-500 uppercase font-semibold">XP Score</p>
              <p className="text-base sm:text-lg font-bold text-indigo-400">{profile?.xp} XP</p>
            </div>
            {/* Global Rank */}
            <div className="bg-[#09090b]/60 border border-white/5 px-5 py-4 rounded-2xl text-center space-y-1 min-w-[100px] flex-1 md:flex-none">
              <span className="text-lg">🏆</span>
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Global Rank</p>
              <p className="text-base sm:text-lg font-bold text-purple-400">#{rank}</p>
            </div>
          </div>
        </div>

        {/* PROGRESSION CARD CARD */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-gray-400">Level {levelInfo.currentLevel} ({levelInfo.title})</span>
            <span className="text-indigo-400">{levelInfo.xp} / {levelInfo.maxXp} XP</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${levelInfo.progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-gray-500 text-right">
            Earn {levelInfo.maxXp - levelInfo.xp} more XP to reach Level {levelInfo.currentLevel + 1}!
          </p>
        </div>

        {/* GRID OF GAMIFICATION SECTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT SIDE: BADGES & CERTIFICATES (2/3 cols) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* BADGES SHOWCASE */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-400" />
                  <span>Interactive Badges ({userBadges.length})</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Special badges earned for outstanding platform accomplishments</p>
              </div>

              {userBadges.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500 italic bg-white/[0.01] rounded-xl border border-white/5">
                  No badges unlocked yet. Keep solving quizzes to trigger unlocks!
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {userBadges.map((ub) => (
                    <div key={ub.id} className="bg-[#09090b]/40 border border-white/5 p-4 rounded-xl flex flex-col items-center text-center space-y-2 hover:border-white/10 transition-colors">
                      <span className="text-3xl filter drop-shadow-[0_4px_8px_rgba(139,92,246,0.3)]">{ub.badge.icon}</span>
                      <p className="text-xs font-bold text-white leading-tight">{ub.badge.name}</p>
                      <p className="text-[9px] text-gray-500 leading-normal line-clamp-2">{ub.badge.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* VERIFIED CERTIFICATES */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-400" />
                  <span>Verifiable Credentials ({certificates.length})</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">downloadable secure course completion certificates</p>
              </div>

              {certificates.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500 italic bg-white/[0.01] rounded-xl border border-white/5">
                  No courses completed yet. Reach 100% progress in any syllabus track to claim!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {certificates.map((cert) => (
                    <div key={cert.id} className="border border-white/5 bg-[#09090b]/40 p-4 rounded-xl flex flex-col justify-between hover:border-white/10 transition-colors relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-lg"></div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>VERIFIED</span>
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono">{cert.certificateCode}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-purple-400 transition-colors">{cert.course.title}</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">Issued on {new Date(cert.issuedAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="pt-4 flex gap-2">
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

          {/* RIGHT SIDE: ACHIEVEMENTS & XP LOGS (1/3 cols) */}
          <div className="space-y-8">
            
            {/* ACHIEVEMENTS HUB */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  <span>Achievements ({userAchievements.length})</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Special game trophies unlocked dynamically</p>
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
                        <p className="text-[10px] text-gray-500 leading-normal">{ua.achievement.description}</p>
                        <p className="text-[9px] text-indigo-400 font-bold">+{ua.achievement.xpReward} XP Reward</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* XP HISTORY LOG */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-indigo-400" />
                  <span>XP History Log</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Recent experience activity transactions</p>
              </div>

              {xpLogs.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500 italic bg-white/[0.01] rounded-xl border border-white/5">
                  No XP history logged.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {xpLogs.map((log) => (
                    <div key={log.id} className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                      <div className="space-y-0.5">
                        <p className="font-bold text-white truncate max-w-[150px]">{log.reason.split(":")[0].replace(/_/g, " ")}</p>
                        <p className="text-[9px] text-gray-500">{new Date(log.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <span className="font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        +{log.amount} XP
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
