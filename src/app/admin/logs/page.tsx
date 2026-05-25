import { getAdminLogs } from "@/services/adminService";
import React from "react";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const { adminActions, moderationLogs } = await getAdminLogs();

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Audit Trail & System Logs</h1>
        <p className="text-gray-400 mt-1">Review actions executed by administrators and moderators on the platform.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Column 1: Admin System Logs */}
        <div className="glass-panel p-6 rounded-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              <span>Admin Action Logs</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Quiz modifications, role assignment overrides, and config changes.</p>
          </div>

          {adminActions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No administrator actions logged yet.
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {adminActions.map((log) => (
                <div key={log.id} className="border border-white/5 bg-white/[0.01] p-4 rounded-lg space-y-2 hover:border-white/10 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-200">{log.details}</p>
                  <p className="text-[11px] text-gray-500">Executed by: <span className="text-gray-400 font-medium">{log.adminName}</span></p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Moderator Activity Logs */}
        <div className="glass-panel p-6 rounded-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-purple-500"></span>
              <span>Moderation Action Logs</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Suspended accounts, removed forum discussions, and resolved reports.</p>
          </div>

          {moderationLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No moderator interventions logged yet.
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {moderationLogs.map((log) => (
                <div key={log.id} className="border border-white/5 bg-white/[0.01] p-4 rounded-lg space-y-2 hover:border-white/10 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-200 font-medium">{log.reason}</p>
                  <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1">
                    <span>Moderator: <span className="text-gray-400">{log.moderatorName}</span></span>
                    <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-[10px]">Target: {log.targetId.substring(0, 8)}...</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
