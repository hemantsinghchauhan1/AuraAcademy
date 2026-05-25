import { getLeaderboard } from "@/services/quizService";
import { Award, Flame, ArrowLeft, Trophy, Sparkles } from "lucide-react";

export const revalidate = 0; // Live database listings for leaderboard

export default async function LeaderboardPage() {
  const standings = await getLeaderboard();

  return (
    <div className="min-h-screen py-10 bg-[#09090b]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Leaderboard Title Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center text-indigo-400 mb-2">
            <Trophy className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Global Standings
          </h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Top academic performers on timed papers and weekly XP gains.
          </p>
        </div>

        {/* TOP THREE PODIUM SHOWCASE */}
        {standings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto items-end pt-4">
            
            {/* Rank 2 Podium */}
            {standings[1] && (
              <div className="glass-panel p-5 rounded-2xl text-center space-y-3 border-white/5 order-2 sm:order-1 sm:h-44 flex flex-col justify-center">
                <span className="text-xl font-bold text-gray-400">#2</span>
                <p className="text-sm font-bold text-white truncate">{standings[1].name}</p>
                <p className="text-xs text-indigo-400 font-semibold">{standings[1].xp} XP</p>
                <p className="text-[10px] text-gray-500 font-medium">🔥 {standings[1].streak} Days Streak</p>
              </div>
            )}

            {/* Rank 1 Podium (Highlighted) */}
            {standings[0] && (
              <div className="glass-panel p-6 rounded-2xl text-center space-y-3 border-indigo-500/30 glow-glow order-1 sm:order-2 sm:h-52 flex flex-col justify-center">
                <span className="text-2xl font-black text-amber-400 flex items-center justify-center space-x-1">
                  <span>🏆</span>
                  <span>#1</span>
                </span>
                <p className="text-base font-extrabold text-white truncate">{standings[0].name}</p>
                <p className="text-sm text-indigo-400 font-extrabold">{standings[0].xp} XP</p>
                <p className="text-xs text-orange-400 font-semibold">🔥 {standings[0].streak} Days Streak</p>
              </div>
            )}

            {/* Rank 3 Podium */}
            {standings[2] && (
              <div className="glass-panel p-5 rounded-2xl text-center space-y-3 border-white/5 order-3 sm:h-40 flex flex-col justify-center">
                <span className="text-lg font-bold text-amber-600">#3</span>
                <p className="text-sm font-bold text-white truncate">{standings[2].name}</p>
                <p className="text-xs text-indigo-400 font-semibold">{standings[2].xp} XP</p>
                <p className="text-[10px] text-gray-500 font-medium">🔥 {standings[2].streak} Days Streak</p>
              </div>
            )}

          </div>
        )}

        {/* LIST VIEW FOR OTHERS */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
          <div className="p-5 border-b border-white/5">
            <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
              <Award className="h-4.5 w-4.5 text-indigo-400" />
              <span>Full Standings</span>
            </h3>
          </div>

          <div className="divide-y divide-white/5">
            {standings.map((entry) => (
              <div 
                key={entry.id} 
                className="p-4 sm:px-6 flex items-center justify-between hover:bg-white/2 transition-colors text-xs sm:text-sm"
              >
                <div className="flex items-center space-x-4">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    entry.rank === 1 
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                      : entry.rank === 2 
                      ? "bg-gray-400/10 text-gray-300 border border-gray-400/20"
                      : entry.rank === 3
                      ? "bg-amber-700/10 text-amber-600 border border-amber-700/20"
                      : "bg-white/5 text-gray-400"
                  }`}>
                    {entry.rank}
                  </div>
                  <div>
                    <p className="font-bold text-white">{entry.name}</p>
                    <p className="text-[10px] text-gray-500 font-medium">Academic Leaderboard Entry</p>
                  </div>
                </div>

                <div className="flex items-center space-x-6 text-right">
                  <div>
                    <p className="font-extrabold text-indigo-400">{entry.xp} XP</p>
                    <p className="text-[10px] text-gray-500 font-medium">Total Solved XP</p>
                  </div>
                  <div>
                    <p className="font-bold text-orange-400">🔥 {entry.streak} Days</p>
                    <p className="text-[10px] text-gray-500 font-medium">Study Streak</p>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {standings.length === 0 && (
            <div className="py-16 text-center space-y-3">
              <span className="text-3xl">📭</span>
              <h4 className="text-base font-bold text-white">No Standings Yet</h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                No students have solved a timed paper yet. Head over to the **Dashboard** and start a quiz to claim your rank!
              </p>
            </div>
          )}

        </div>

        {/* Back navigation footer link */}
        <div className="text-center pt-4">
          <a
            href="/dashboard"
            className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Workspace Dashboard</span>
          </a>
        </div>

      </div>
    </div>
  );
}