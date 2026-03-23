import React from "react";
import { Wifi, Users, Package, TrendingUp, Activity, Signal, Zap, Globe } from "lucide-react";

const stats = [
  { label: "Active Clients",    value: "1,284",  change: "+12%",  icon: Users,     color: "from-sky-500 to-cyan-500" },
  { label: "Network Uptime",    value: "99.97%", change: "+0.02%",icon: Signal,    color: "from-emerald-500 to-teal-500" },
  { label: "Total Devices",     value: "4,631",  change: "+87",   icon: Package,   color: "from-violet-500 to-purple-500" },
  { label: "Data Throughput",   value: "2.4 TB", change: "+18%",  icon: Wifi,      color: "from-rose-500 to-pink-500" },
];

const recentActivities = [
  { id: 1, event: "New client onboarded",   client: "Horizon Corp",     time: "5 min ago",  status: "success" },
  { id: 2, event: "Link degradation alert", client: "TowerBase #14",    time: "23 min ago", status: "warning" },
  { id: 3, event: "Device registered",      client: "SkyNet Solutions",  time: "1 hr ago",   status: "success" },
  { id: 4, event: "Fiber cut detected",     client: "MetroRoute East",   time: "2 hrs ago",  status: "error" },
  { id: 5, event: "Bandwidth upgrade",      client: "CloudEdge Ltd",     time: "4 hrs ago",  status: "success" },
];

const statusColor: Record<string, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error:   "bg-rose-500",
};

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NexTelecom Dashboard</h1>
          <p className="text-muted-foreground mt-1">Network overview & real-time metrics</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-emerald-500 font-medium bg-emerald-500/10 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          All Systems Operational
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-emerald-500 mt-1 font-medium">{stat.change} this month</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Network Health */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base">Network Traffic (Last 7 Days)</h2>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          {/* Mock bar chart */}
          <div className="flex items-end gap-2 h-36">
            {[65, 80, 55, 90, 75, 95, 85].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-sky-500 to-cyan-400 transition-all duration-700"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Coverage */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base">Coverage Zones</h2>
            <Globe className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {[
              { zone: "North Region",  pct: 98, color: "bg-emerald-500" },
              { zone: "South Region",  pct: 92, color: "bg-sky-500" },
              { zone: "East Region",   pct: 87, color: "bg-violet-500" },
              { zone: "West Region",   pct: 74, color: "bg-amber-500" },
            ].map((z) => (
              <div key={z.zone}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{z.zone}</span>
                  <span className="font-medium">{z.pct}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${z.color} rounded-full`} style={{ width: `${z.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-semibold text-base mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivities.map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor[a.status]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.event}</p>
                <p className="text-xs text-muted-foreground">{a.client}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
