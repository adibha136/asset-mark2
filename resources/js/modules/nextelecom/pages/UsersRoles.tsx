import React, { useState } from "react";
import { Users, Plus, Shield, Search, MoreVertical, Mail, Lock } from "lucide-react";

const mockUsers = [
  { id: 1, name: "Admin User",    email: "admin@nextelecom.com",    role: "Super Admin", lastLogin: "Today, 10:30 AM",  status: "Active" },
  { id: 2, name: "Raza Mir",      email: "raza@nextelecom.com",     role: "NOC Engineer",lastLogin: "Today, 09:12 AM",  status: "Active" },
  { id: 3, name: "Sara Khan",     email: "sara.k@nextelecom.com",   role: "NOC Engineer",lastLogin: "Yesterday",        status: "Active" },
  { id: 4, name: "Tom Hutchins",  email: "tom@nextelecom.com",      role: "Viewer",      lastLogin: "3 days ago",      status: "Active" },
  { id: 5, name: "Mia Chen",      email: "mia@nextelecom.com",      role: "Manager",     lastLogin: "1 week ago",      status: "Inactive" },
];

const roles = [
  { name: "Super Admin", description: "Full access to all modules", color: "bg-violet-500/10 text-violet-600", perms: ["Dashboard","Assets","Clients","Connectivity","Users & Roles","Settings"] },
  { name: "Manager",     description: "Manage operations, no user config",color:"bg-sky-500/10 text-sky-600",    perms: ["Dashboard","Assets","Clients","Connectivity"] },
  { name: "NOC Engineer",description: "Monitor and respond to network events",color:"bg-emerald-500/10 text-emerald-600",perms: ["Dashboard","Connectivity","Assets"] },
  { name: "Viewer",      description: "Read-only access",           color: "bg-muted text-muted-foreground",   perms: ["Dashboard"] },
];

const statusBadge: Record<string, string> = {
  Active:   "bg-emerald-500/10 text-emerald-600",
  Inactive: "bg-muted text-muted-foreground",
};

export default function UsersRoles() {
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [search, setSearch] = useState("");

  const filtered = mockUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

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
            {t === "users" ? `Users (${mockUsers.length})` : "Roles & Permissions"}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === "users" && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Last Login</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-600 text-xs font-bold">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />{u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-sky-500" />
                        <span className="text-sm">{u.role}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{u.lastLogin}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge[u.status]}`}>{u.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Roles Tab */}
      {tab === "roles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <div key={role.name} className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-4 h-4 text-sky-500" />
                    <span className="font-semibold">{role.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${role.color}`}>{role.name}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Access</p>
                <div className="flex flex-wrap gap-1.5">
                  {role.perms.map((p) => (
                    <span key={p} className="text-xs bg-muted px-2 py-0.5 rounded-full">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
