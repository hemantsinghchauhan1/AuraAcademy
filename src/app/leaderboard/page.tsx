import { getDbUser } from "@/lib/auth";
import { getLeaderboardStandings } from "@/services/gamificationService";
import React from "react";
import { 
  Trophy, 
  Flame, 
  Search, 
  TrendingUp, 
  Award,
  Crown,
  Sparkles,
  ExternalLink
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface LeaderboardPageProps {
  searchParams: Promise<{ filter?: string; q?: string }>;
}

export default async function GlobalLeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentFilter = (resolvedSearchParams.filter || "xp") as "xp" | "streak";
  const searchQuery = resolvedSearchParams.q || "";

  const currentUser = await getDbUser();

  // Fetch standings using unified service
  const standings = await getLeaderboardStandings(currentFilter);

  // Filter by search query if present
  const filteredStandings = standings.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate top 3 for the elegant Podium display
  const top3 = filteredStandings.slice(0, 3);
  const remaining = filteredStandings.slice(3);

  // Arrange top 3 as [2nd, 1st, 3rd] for classic physical podium alignment
  const podiumArrangement = [];
  if (top3[1]) podiumArrangement.push({ ...top3[1], pos: 2, height: "h-32 bg-indigo-500/10 border-indigo-500/20" });
  if (top3[0]) podiumArrangement.push({ ...top3[0], pos: 1, height: "h-40 bg-purple-500/20 border-purple-500/30" });
  if (top3[2]) podiumArrangement.push({ ...top3[2], pos: 3, height: "h-24 bg-blue-500/10 border-blue-500/20" });

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-[#040406]">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* LEADERBOARD HEADER BRAND */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-400" />
              <span>Scoreboard Center</span>
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm">
              Compare experience gains, maintain streaks, climb level divisions, and showcase accomplishments.
            </p>
          </div>

          {/* Quick status button */}
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-semibold">
            <span className="text-gray-400">Your Division:</span>
            <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-md uppercase font-bold">
              Gold League
            </span>
          </div>
        </div>

        {/* PODIUM ANIME SHOWCASE */}
        {podiumArrangement.length > 0 && searchQuery === "" && (
          <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col items-center">
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none"></div>
            
            <div className="text-center space-y-1 mb-10 z-10">
              <h2 className="text-base font-bold text-white flex items-center justify-center gap-1.5">
                <Crown className="h-5 w-5 text-yellow-500" />
                <span>Global Podium Standings</span>
              </h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Top scholars this division</p>
            </div>

            {/* Podium grid */}
            <div className="flex items-end justify-center gap-3 sm:gap-6 w-full max-w-xl z-10 pt-8">
              {podiumArrangement.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1 text-center group">
                  {/* Avatar */}
                  <div className="relative mb-3">
                    <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-2xl p-1 bg-gradient-to-tr ${
                      item.pos === 1 
                        ? "from-yellow-400 via-orange-500 to-yellow-300" 
                        : item.pos === 2 
                        ? "from-slate-300 to-slate-400" 
                        : "from-amber-600 to-amber-700"
                    }`}>
                      <div className="h-full w-full rounded-[12px] bg-[#0c0c14] flex items-center justify-center text-xl font-extrabold text-white">
                        {item.name ? item.name[0].toUpperCase() : "S"}
                      </div>
                    </div>
                    {/* Crown or Star Icon */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                      {item.pos === 1 ? "👑" : item.pos === 2 ? "⭐" : "✨"}
                    </div>
                    {/* Rank Badge */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#040406] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-white/10">
                      #{item.pos}
                    </div>
                  </div>

                  <a 
                    href={`/profile/${item.userId}`}
                    className="text-xs sm:text-sm font-bold text-white mt-1 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                  >
                    <span>{item.name}</span>
                    <ExternalLink className="h-3 w-3 text-gray-500" />
                  </a>
                  <p className="text-[10px] text-gray-500 font-semibold">{currentFilter === "xp" ? `${item.xp} XP` : `${item.streak} Streak`}</p>

                  {/* Physical Podium Block */}
                  <div className={`w-full ${item.height} mt-4 rounded-t-2xl border-t border-x flex flex-col justify-end p-3 transition-all group-hover:scale-[1.02] shadow-xl shadow-black/35 relative`}>
                    <span className="text-lg font-black text-white/10 select-none">{item.pos}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEARCH AND FILTERS */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          
          {/* Filters toggle */}
          <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
            <a
              href={`/leaderboard?filter=xp${searchQuery ? `&q=${searchQuery}` : ""}`}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                currentFilter === "xp"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              XP Scoreboard
            </a>
            <a
              href={`/leaderboard?filter=streak${searchQuery ? `&q=${searchQuery}` : ""}`}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                currentFilter === "streak"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Streak Scoreboard
            </a>
          </div>

          {/* Search bar */}
          <form method="GET" action="/leaderboard" className="relative w-full md:max-w-xs">
            <input type="hidden" name="filter" value={currentFilter} />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              name="q"
              placeholder="Search students..."
              defaultValue={searchQuery}
              className="glass-input pl-9 pr-3 py-2 w-full rounded-xl text-sm focus:outline-none"
            />
          </form>
        </div>

        {/* CORE LEADERBOARD TABLE */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-gray-300">
              <thead>
                <tr className="bg-white/5 text-gray-400 border-b border-white/5 font-semibold">
                  <th className="p-4 text-center w-16">Rank</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4 text-center">Active Streak</th>
                  <th className="p-4 text-center">XP Score</th>
                  <th className="p-4 text-center w-24">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStandings.map((item, idx) => {
                  const isCur = currentUser?.id === item.userId;
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-white/2 transition-colors ${
                        isCur ? "bg-indigo-600/5 text-indigo-200" : ""
                      }`}
                    >
                      <td className="p-4 text-center font-bold">
                        <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-black ${
                          idx === 0 
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" 
                            : idx === 1 
                            ? "bg-slate-300/20 text-slate-300 border border-slate-300/30" 
                            : idx === 2 
                            ? "bg-amber-600/20 text-amber-500 border border-amber-600/30" 
                            : "bg-white/5 text-gray-400"
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-indigo-600/10 flex items-center justify-center text-xs font-bold text-white border border-white/5">
                            {item.name ? item.name[0].toUpperCase() : "S"}
                          </div>
                          <div>
                            <span className="font-bold text-white">{item.name}</span>
                            {isCur && (
                              <span className="ml-1.5 text-[8px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-bold uppercase tracking-wider">
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-center font-bold text-orange-400">
                        <span className="inline-flex items-center gap-1.5 justify-center">
                          <Flame className="h-3.5 w-3.5" />
                          <span>{item.streak} Days</span>
                        </span>
                      </td>

                      <td className="p-4 text-center font-bold text-indigo-400">
                        <span className="inline-flex items-center gap-1.5 justify-center">
                          <Award className="h-3.5 w-3.5" />
                          <span>{item.xp} XP</span>
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <a
                          href={`/profile/${item.userId}`}
                          className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-white font-bold transition-colors"
                        >
                          <span>Showcase</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredStandings.length === 0 && (
            <div className="py-16 text-center space-y-3">
              <span className="text-3xl">📭</span>
              <h4 className="text-base font-bold text-white">No Scholars Found</h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                No active students match your search criteria. Try a different query!
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}