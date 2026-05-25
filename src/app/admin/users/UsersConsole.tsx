"use client";

import React, { useState, useEffect, useCallback, startTransition } from "react";
import { Role } from "@prisma/client";
import { getUsersListAction, updateUserRoleAction, toggleUserSuspensionAction } from "@/services/adminActions";

export default function UsersConsole() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [suspensionFilter, setSuspensionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Suspension helper state
  const [actingUserId, setActingUserId] = useState<string | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    const res = await getUsersListAction({
      page,
      limit: 10,
      search,
      roleFilter,
      suspensionFilter
    });

    setLoading(false);
    if (res.success && res.data) {
      setUsers(res.data.users);
      setTotalPages(res.data.totalPages);
      setTotalCount(res.data.totalCount);
    } else {
      setError(res.error || "Failed to fetch user directory.");
    }
  }, [page, search, roleFilter, suspensionFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, currentRole: Role, newRole: Role) => {
    if (currentRole === newRole) return;
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    setLoading(true);
    const res = await updateUserRoleAction(userId, newRole);
    if (res.success) {
      await fetchUsers();
    } else {
      alert(res.error || "Failed to update user role.");
      setLoading(false);
    }
  };

  const handleSuspension = async (userId: string, isSuspended: boolean) => {
    if (isSuspended) {
      // Unsuspend
      if (!confirm("Are you sure you want to lift the suspension for this user?")) return;
      setLoading(true);
      const res = await toggleUserSuspensionAction(userId, "Suspension lifted");
      if (res.success) {
        await fetchUsers();
      } else {
        alert(res.error || "Failed to unsuspend user.");
        setLoading(false);
      }
    } else {
      // Trigger reason prompt
      setActingUserId(userId);
      setSuspensionReason("");
    }
  };

  const submitSuspension = async () => {
    if (!actingUserId) return;
    if (!suspensionReason.trim()) {
      alert("Please specify a suspension reason.");
      return;
    }

    setLoading(true);
    const userId = actingUserId;
    const reason = suspensionReason;
    setActingUserId(null);

    const res = await toggleUserSuspensionAction(userId, reason);
    if (res.success) {
      await fetchUsers();
    } else {
      alert(res.error || "Failed to suspend user.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters & Search Header */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-[#0c0c10]/50 p-4 rounded-xl border border-white/5">
        <div className="sm:col-span-2 relative">
          <input
            type="text"
            placeholder="Search users by name or email..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg glass-input text-white"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <div className="absolute left-3.5 top-3 text-gray-500">
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Role Filter */}
        <select
          className="px-3 py-2 text-sm rounded-lg glass-input text-gray-300 cursor-pointer"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Roles</option>
          <option value="STUDENT">Student</option>
          <option value="MODERATOR">Moderator</option>
          <option value="ADMIN">Admin</option>
        </select>

        {/* Status Filter */}
        <select
          className="px-3 py-2 text-sm rounded-lg glass-input text-gray-300 cursor-pointer"
          value={suspensionFilter}
          onChange={(e) => {
            setSuspensionFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active Accounts</option>
          <option value="SUSPENDED">Suspended Accounts</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {/* Users Table Sheet */}
      <div className="glass-panel rounded-xl overflow-hidden border border-white/5">
        {loading && users.length === 0 ? (
          <div className="space-y-4 p-6 animate-pulse">
            <div className="h-8 bg-white/5 rounded w-1/3"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-white/5 rounded"></div>
              ))}
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No users match the active filters or search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-white/[0.01]">
                  <th className="p-4 pl-6">User profile</th>
                  <th className="p-4">Academy Stats</th>
                  <th className="p-4">Role Promotion</th>
                  <th className="p-4">User Status</th>
                  <th className="p-4 pr-6 text-right">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {users.map((u) => {
                  return (
                    <tr key={u.id} className={`hover:bg-white/[0.01] transition-colors ${u.isSuspended ? "bg-rose-950/5 opacity-70" : ""}`}>
                      {/* Name & Avatar */}
                      <td className="p-4 pl-6">
                        <div className="flex items-center space-x-3.5">
                          <div className="h-10 w-10 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 font-bold overflow-hidden">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" />
                            ) : (
                              u.name.substring(0, 1).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white leading-tight flex items-center space-x-1.5">
                              <span>{u.name}</span>
                              {u.isSuspended && (
                                <span className="text-[9px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/20 font-medium">
                                  Suspended
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Streak / XP / Attempts */}
                      <td className="p-4">
                        <div className="flex items-center space-x-4 text-xs">
                          <div className="flex items-center space-x-1 text-amber-400" title="Streak">
                            <span>🔥</span>
                            <span className="font-bold">{u.streak}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-purple-400" title="XP Accumulated">
                            <span>✨</span>
                            <span className="font-bold">{u.xp} XP</span>
                          </div>
                          <div className="text-gray-400">
                            Attempts: <span className="text-white font-medium">{u.totalAttempts}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role selection dropdown */}
                      <td className="p-4">
                        <select
                          disabled={u.isSuspended || loading}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, u.role, e.target.value as Role)}
                          className="bg-[#09090b] text-xs font-semibold px-2.5 py-1.5 rounded border border-white/10 text-gray-300 focus:border-indigo-500 focus:outline-none cursor-pointer"
                        >
                          <option value="STUDENT">STUDENT</option>
                          <option value="MODERATOR">MODERATOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>

                      {/* Actions (Suspends) */}
                      <td className="p-4">
                        {u.role === "ADMIN" ? (
                          <span className="text-xs text-gray-500 italic">Protected System User</span>
                        ) : (
                          <button
                            onClick={() => handleSuspension(u.id, u.isSuspended)}
                            disabled={loading}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${u.isSuspended ? "bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20" : "bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20"}`}
                          >
                            {u.isSuspended ? "Activate User" : "Suspend Account"}
                          </button>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="p-4 pr-6 text-right text-xs text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-[#0c0c10]/40 p-4 rounded-xl border border-white/5 text-xs text-gray-400">
          <div>
            Showing Page <span className="text-white font-medium">{page}</span> of <span className="text-white font-medium">{totalPages}</span> (Total users: {totalCount})
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3.5 py-1.5 bg-[#09090b] hover:bg-white/5 border border-white/10 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-medium transition-colors cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="px-3.5 py-1.5 bg-[#09090b] hover:bg-white/5 border border-white/10 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-medium transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Custom Suspension Reason Modal Overlay */}
      {actingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0c0c10] border border-white/10 p-6 rounded-xl space-y-4 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Suspend User Session</h3>
              <p className="text-xs text-gray-400 mt-1">Specify an administrative log reason before locking out this student's account.</p>
            </div>
            <textarea
              className="w-full p-3 text-xs rounded-lg glass-input text-white min-h-[80px]"
              placeholder="e.g., Flagged multiple times for forum comment spam..."
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
            />
            <div className="flex justify-end space-x-3 text-xs">
              <button
                onClick={() => setActingUserId(null)}
                className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submitSuspension}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium shadow-md shadow-rose-900/10 transition-colors cursor-pointer"
              >
                Log Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
