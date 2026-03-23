import React, { useState } from "react";
import { Wifi, Signal, AlertTriangle, CheckCircle, RefreshCw, Activity, Globe, Zap } from "lucide-react";

const links = [
  { id: 1, name: "North DC ↔ South DC",    type: "Fiber",    bandwidth: "10 Gbps",  utilization: 72, latency: "2ms",   status: "Up",     uptime: "99.98%" },
  { id: 2, name: "East POP ↔ Core",         type: "Fiber",    bandwidth: "40 Gbps",  utilization: 55, latency: "1ms",   status: "Up",     uptime: "100%" },
  { id: 3, name: "Tower #14 ↔ Backhaul",    type: "Microwave",bandwidth: "1 Gbps",   utilization: 88, latency: "8ms",   status: "Degraded",uptime: "94.2%" },
  { id: 4, name: "West Hub ↔ Core",         type: "Fiber",    bandwidth: "10 Gbps",  utilization: 41, latency: "3ms",   status: "Up",     uptime: "99.95%" },
  { id: 5, name: "Branch A ↔ Metro",        type: "MPLS",     bandwidth: "500 Mbps", utilization: 63, latency: "12ms",  status: "Up",     uptime: "99.80%" },
  { id: 6, name: "Branch B ↔ Metro",        type: "MPLS",     bandwidth: "500 Mbps", utilization: 21, latency: "11ms",  status: "Up",     uptime: "99.90%" },
  { id: 7, name: "Dubai POP ↔ Core",        type: "Submarine",bandwidth: "100 Gbps", utilization: 34, latency: "45ms",  status: "Up",     uptime: "99.99%" },
  { id: 8, name: "Client Site ↔ Aggr",      type: "Copper",   bandwidth: "100 Mbps", utilization: 0,  latency: "—",     status: "Down",   uptime: "71.3%" },
];

const statusIcons: Record<string, any> = {
  Up:       { icon: CheckCircle, cls: "text-emerald-500" },
  Degraded: { icon: AlertTriangle, cls: "text-amber-500" },
  Down:     { icon: AlertTriangle, cls: "text-rose-500" },
};

const statusBadge: Record<string, string> = {
  Up:       "bg-emerald-500/10 text-emerald-600",
  Degraded: "bg-amber-500/10 text-amber-600",
  Down:     "bg-rose-500/10 text-rose-600",
};

const utilizationColor = (pct: number) => {
  if (pct >= 85) return "bg-rose-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-emerald-500";
};

export default function Connectivity() {
  const [filter, setFilter] = useState<string>("All");
  const types = ["All", "Fiber", "Microwave", "MPLS", "Submarine", "Copper"];

  const filtered = filter === "All" ? links : links.filter((l) => l.type === filter);

  const summary = {
    total: links.length,
    up: links.filter((l) => l.status === "Up").length,
    degraded: links.filter((l) => l.status === "Degraded").length,
    down: links.filter((l) => l.status === "Down").length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connectivity</h1>
          <p className="text-muted-foreground mt-1">Network links, uptime & bandwidth utilization</p>
        </div>
        <button className="flex items-center gap-2 border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Links",  value: summary.total,    icon: Globe,         color: "from-sky-500 to-cyan-500"       },
          { label: "Links Up",     value: summary.up,       icon: CheckCircle,   color: "from-emerald-500 to-teal-500"   },
          { label: "Degraded",     value: summary.degraded, icon: AlertTriangle, color: "from-amber-500 to-orange-500"   },
          { label: "Links Down",   value: summary.down,     icon: AlertTriangle, color: "from-rose-500 to-pink-500"      },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                <s.icon className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Live updates every 30 seconds &nbsp;·&nbsp; Last refreshed: just now
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              filter === t
                ? "bg-sky-600 text-white border-sky-600"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Links Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Link</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Type</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Bandwidth</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Utilization</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Latency</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Uptime</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((link) => {
              const { icon: Icon, cls } = statusIcons[link.status];
              return (
                <tr key={link.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      <span className="font-medium text-sm">{link.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{link.type}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> {link.bandwidth}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${utilizationColor(link.utilization)}`}
                          style={{ width: `${link.utilization}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{link.utilization}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell font-mono text-xs">{link.latency}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs font-medium">{link.uptime}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-4 h-4 ${cls}`} />
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[link.status]}`}>
                        {link.status}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
