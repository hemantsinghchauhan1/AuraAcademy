import { getAdminStats } from "@/services/adminService";
import AdminCharts from "./AdminCharts";
import React from "react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-8">
      {/* Welcome Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Overview</h1>
        <p className="text-gray-400 mt-1">Real-time indicators, community engagements, and recent platform attempts.</p>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="glass-panel p-6 rounded-xl flex items-center space-x-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="h-12 w-12 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 shrink-0">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Enrolled</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.totalUsers}</h3>
            <p className="text-xs text-indigo-400 mt-0.5">Students & admins</p>
          </div>
        </div>

        {/* Weekly Active Users */}
        <div className="glass-panel p-6 rounded-xl flex items-center space-x-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active Users</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.activeUsers}</h3>
            <p className="text-xs text-emerald-400 mt-0.5">Active this week</p>
          </div>
        </div>

        {/* Total Quizzes */}
        <div className="glass-panel p-6 rounded-xl flex items-center space-x-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400 shrink-0">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Quizzes</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.totalQuizzes}</h3>
            <p className="text-xs text-purple-400 mt-0.5">Live examinations</p>
          </div>
        </div>

        {/* Flagged / Pending Reports */}
        <div className="glass-panel p-6 rounded-xl flex items-center space-x-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="h-12 w-12 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-400 shrink-0">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Flagged Queue</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.pendingReports}</h3>
            <p className="text-xs text-rose-400 mt-0.5">Reports pending review</p>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <AdminCharts stats={stats} />

      {/* Recent Quiz Attempts Log */}
      <div className="glass-panel rounded-xl overflow-hidden p-6">
        <div>
          <h3 className="text-lg font-bold text-white">Recent Quiz Attempts</h3>
          <p className="text-xs text-gray-400 mt-0.5">Audit log of the latest test completions by students.</p>
        </div>

        {stats.recentAttempts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No quiz attempts recorded on the platform yet.
          </div>
        ) : (
          <div className="overflow-x-auto mt-6">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3 pr-4">Student</th>
                  <th className="pb-3 px-4">Quiz Taken</th>
                  <th className="pb-3 px-4">Score Obtained</th>
                  <th className="pb-3 pl-4 text-right">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {stats.recentAttempts.map((attempt) => {
                  const percent = Math.round((attempt.score / attempt.totalQuestions) * 100);
                  const isHigh = percent >= 80;
                  const scoreColor = isHigh ? "text-emerald-400" : percent >= 50 ? "text-indigo-400" : "text-rose-400";

                  return (
                    <tr key={attempt.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 pr-4 font-medium text-white">{attempt.userName}</td>
                      <td className="py-4 px-4">{attempt.quizTitle}</td>
                      <td className="py-4 px-4 font-semibold">
                        <span className={scoreColor}>{attempt.score} / {attempt.totalQuestions}</span>
                        <span className="text-xs text-gray-500 ml-1.5">({percent}%)</span>
                      </td>
                      <td className="py-4 pl-4 text-right text-gray-500 text-xs">
                        {new Date(attempt.completedAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
