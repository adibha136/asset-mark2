import React, { useState } from "react";
import { Package, Search, Filter, MoreVertical, Wifi, Monitor, Router, HardDrive } from "lucide-react";

const mockAssets = [
  { id: 1, name: "Cisco ASR 9001",   type: "Router",     serial: "CSC-2024-001", location: "North DC",   status: "Active",    ip: "10.0.1.1" },
  { id: 2, name: "Juniper MX480",    type: "Router",     serial: "JNP-2024-002", location: "South DC",   status: "Active",    ip: "10.0.2.1" },
  { id: 3, name: "Nokia 7750 SR",    type: "Switch",     serial: "NOK-2024-003", location: "East POP",   status: "Degraded",  ip: "10.0.3.1" },
  { id: 4, name: "Ericsson MINI-LINK","type": "Wireless", serial: "ERI-2024-004", location: "Tower #14",  status: "Active",    ip: "192.168.1.10" },
  { id: 5, name: "Huawei OptiX",     type: "Fiber",      serial: "HUW-2024-005", location: "West Hub",   status: "Active",    ip: "10.0.5.1" },
  { id: 6, name: "Calix GigaPoint",  type: "CPE",        serial: "CAL-2024-006", location: "Client Site",status: "Offline",   ip: "192.168.2.50" },
  { id: 7, name: "Ubiquiti EdgeMax", type: "Router",     serial: "UBQ-2024-007", location: "Branch A",   status: "Active",    ip: "10.0.7.1" },
  { id: 8, name: "Mikrotik CCR2004", type: "Router",     serial: "MTK-2024-008", location: "Branch B",   status: "Active",    ip: "10.0.8.1" },
];

const typeIcon: Record<string, any> = {
  Router: Router,
  Switch: Monitor,
  Wireless: Wifi,
  Fiber: HardDrive,
  CPE: Package,
};

const statusClasses: Record<string, string> = {
  Active:   "bg-emerald-500/10 text-emerald-600",
  Degraded: "bg-amber-500/10 text-amber-600",
  Offline:  "bg-rose-500/10 text-rose-600",
};

export default function Assets() {
  const [search, setSearch] = useState("");
  const filtered = mockAssets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.serial.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Network Assets</h1>
          <p className="text-muted-foreground mt-1">Manage all telecom infrastructure devices</p>
        </div>
        <button className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Package className="w-4 h-4" /> Add Device
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            placeholder="Search devices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Device</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Type</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Serial</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Location</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">IP Address</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((asset, idx) => {
              const Icon = typeIcon[asset.type] || Package;
              return (
                <tr
                  key={asset.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-sky-500/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-sky-600" />
                      </div>
                      <span className="font-medium">{asset.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{asset.type}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">{asset.serial}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{asset.location}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">{asset.ip}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusClasses[asset.status]}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">No devices found</div>
        )}
      </div>
    </div>
  );
}
