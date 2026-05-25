import UsersConsole from "./UsersConsole";
import React from "react";

export const dynamic = "force-dynamic";

export default function AdminUsersPage() {
  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">User Administration</h1>
        <p className="text-gray-400 mt-1">Audit platform accounts, change access roles, or suspend students violating guidelines.</p>
      </div>

      <UsersConsole />
    </div>
  );
}
