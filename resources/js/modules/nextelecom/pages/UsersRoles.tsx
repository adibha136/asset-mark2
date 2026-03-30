import React, { useState } from "react";
import { Users, Plus, Shield, Search, MoreVertical, Mail, Lock } from "lucide-react";

const statusBadge: Record<string, string> = {
  Active:   "bg-emerald-500/10 text-emerald-600",
  Inactive: "bg-muted text-muted-foreground",
};

export default function UsersRoles() {
  const [tab, setTab] = useState<"users" | "roles">("users");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-muted-foreground mt-1">Manage NexTelecom team access and permissions</p>
        </div>
        <button className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Invite User
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["users", "roles"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`capitalize px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-sky-600 text-sky-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "users" ? "Users" : "Roles & Permissions"}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === "users" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="py-12 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No users API configured</p>
            <p className="text-xs mt-1">Users data will appear here when API integration is configured</p>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {tab === "roles" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="py-12 text-center text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No roles API configured</p>
            <p className="text-xs mt-1">Roles data will appear here when API integration is configured</p>
          </div>
        </div>
      )}
    </div>
  );
}
