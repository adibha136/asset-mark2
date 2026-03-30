import React, { useState, useEffect } from "react";
import { Package, Search, Filter, MoreVertical, Wifi, Monitor, Router, HardDrive, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useNextElecomToken } from "@/hooks/useNextElecomToken";

const typeIcon: Record<string, any> = {
  Router: Router,
  Switch: Monitor,
  Wireless: Wifi,
  Fiber: HardDrive,
  CPE: Package,
};

interface Connectivity {
  status: string;
  [key: string]: any;
}

export default function Assets() {
  const { getToken } = useNextElecomToken();
  const [search, setSearch] = useState("");
  const [connections, setConnections] = useState<Connectivity[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);

  useEffect(() => {
    fetchConnectivityData();
  }, []);

  const fetchConnectivityData = async () => {
    const token = await getToken();
    if (!token) {
      setLoadingConnections(false);
      return;
    }

    try {
      const response = await fetch("/api/nextelecom/proxy-connectivity", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const items = data?.data?.connectivity || [];
        setConnections(items);
      }
    } catch (err) {
      console.error("Failed to fetch connectivity data");
    } finally {
      setLoadingConnections(false);
    }
  };

  const connectivityStats = {
    total: connections.length,
    live: connections.filter((c) => c.status === "LIVE").length,
    provisioning: connections.filter((c) => c.status === "PROVISIONING").length,
    cancelled: connections.filter((c) => c.status?.includes("CANCELLED")).length,
  };

  const filtered = connections.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.connectivityID?.toLowerCase().includes(search.toLowerCase()) ||
      c.serviceLocation?.suburb?.toLowerCase().includes(search.toLowerCase())
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

      {/* Connectivity Stats Summary */}
      {loadingConnections ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3 animate-pulse">
              <div className="h-3 bg-muted rounded w-1/2 mb-2" />
              <div className="h-6 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : connections.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">Total Connections</p>
            <p className="text-lg font-bold">{connectivityStats.total}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-xs text-emerald-600 font-medium mb-1">Live</p>
            <p className="text-lg font-bold text-emerald-600">{connectivityStats.live}</p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-xs text-amber-600 font-medium mb-1">Provisioning</p>
            <p className="text-lg font-bold text-amber-600">{connectivityStats.provisioning}</p>
          </div>
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-xs text-rose-600 font-medium mb-1">Offline</p>
            <p className="text-lg font-bold text-rose-600">{connectivityStats.cancelled}</p>
          </div>
        </div>
      ) : null}

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
        {loadingConnections ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            <span className="text-sm font-medium">Loading connections...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">No connections found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Connection Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Product</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Carrier</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">IPs</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((conn, idx) => {
                const statusColor = conn.status === "LIVE" ? "bg-emerald-500/10 text-emerald-600" : 
                                   conn.status === "PROVISIONING" ? "bg-amber-500/10 text-amber-600" :
                                   "bg-rose-500/10 text-rose-600";
                const location = `${conn.serviceLocation?.suburb}, ${conn.serviceLocation?.state}`;
                return (
                  <tr
                    key={conn.connectivityID || idx}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-sky-500/10 flex items-center justify-center">
                          <Wifi className="w-4 h-4 text-sky-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{conn.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{conn.connectivityID}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">
                      {conn.productDetails?.name || conn.product || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                      {location}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell text-xs">
                      {conn.carrier}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-sky-600">{conn.ipAddressing?.ipCount || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor}`}>
                        {conn.status}
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
        )}
      </div>
    </div>
  );
}
