import React, { useState, useEffect } from "react";
import { Wifi, Signal, AlertTriangle, CheckCircle, RefreshCw, Activity, Globe, Zap, Loader2 } from "lucide-react";
import { useNextElecomToken } from "@/hooks/useNextElecomToken";
import ConnectivityDetailCard from "../components/ConnectivityDetailCard";

interface Connectivity {
  connectivityID: string;
  name: string;
  product: string;
  carrier: string;
  productDetails: { name: string };
  status: string;
  provisioningStatus?: string;
  serviceLocation: {
    streetNumber: string;
    streetName: string;
    suburb: string;
    postcode: string;
    state: string;
  };
  ipAddressing: { ipCount: number; ipList: (string | null)[] };
  plannedOutage?: { plannedOutage: boolean };
}

const statusIcons: Record<string, any> = {
  LIVE:               { icon: CheckCircle, cls: "text-emerald-500" },
  PROVISIONING:       { icon: AlertTriangle, cls: "text-amber-500" },
  "CARRIER CANCELLED": { icon: AlertTriangle, cls: "text-rose-500" },
  "SUPPLIER CANCELLED": { icon: AlertTriangle, cls: "text-rose-500" },
};

const statusBadge: Record<string, string> = {
  LIVE:               "bg-emerald-500/10 text-emerald-600",
  PROVISIONING:       "bg-amber-500/10 text-amber-600",
  "CARRIER CANCELLED": "bg-rose-500/10 text-rose-600",
  "SUPPLIER CANCELLED": "bg-rose-500/10 text-rose-600",
};

const getStatusColor = (status: string) => {
  if (status === "LIVE") return "text-emerald-600";
  if (status?.includes("CANCELLED")) return "text-rose-600";
  return "text-amber-600";
};

export default function Connectivity() {
  const { getToken } = useNextElecomToken();
  const [connections, setConnections] = useState<Connectivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedConnectionID, setSelectedConnectionID] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    fetchConnectivity();
  }, []);

  const fetchConnectivity = async () => {
    setLoading(true);
    setError("");

    const token = await getToken();
    if (!token) {
      setError("No API token configured");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/nextelecom/proxy-connectivity", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const items = data?.data?.connectivity || [];
      setConnections(items);
    } catch (err: any) {
      setError(err.message || "Failed to fetch connectivity data");
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectivityDetail = async (connectionID: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);

    const token = await getToken();
    if (!token) {
      setDetailError("No API token configured");
      setDetailLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/nextelecom/proxy-connectivity/${connectionID}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      console.log("API Response:", data);
      const connectivityDetail = data?.data?.connectivity?.[0];
      console.log("Connectivity Detail:", connectivityDetail);
      
      if (!connectivityDetail) {
        setDetailError("No data found in response");
        setDetailLoading(false);
        return;
      }
      
      setDetailData(connectivityDetail);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setDetailError(err.message || "Failed to fetch connectivity details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleConnectionClick = async (connectionID: string) => {
    setSelectedConnectionID(connectionID);
    setDetailDialogOpen(true);
    await fetchConnectivityDetail(connectionID);
  };

  const carriers = ["All", ...new Set(connections.map((c) => c.carrier))];
  const filtered = filter === "All" ? connections : connections.filter((c) => c.carrier === filter);

  const summary = {
    total: connections.length,
    live: connections.filter((c) => c.status === "LIVE").length,
    provisioning: connections.filter((c) => c.status === "PROVISIONING").length,
    cancelled: connections.filter((c) => c.status?.includes("CANCELLED")).length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connectivity</h1>
          <p className="text-muted-foreground mt-1">Network connections & service status</p>
        </div>
        <button 
          onClick={fetchConnectivity}
          disabled={loading}
          className="flex items-center gap-2 border border-border text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> 
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-500/5 p-4 text-rose-600 text-sm">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Connections", value: summary.total,        icon: Globe,         color: "from-sky-500 to-cyan-500"       },
          { label: "Live",              value: summary.live,         icon: CheckCircle,   color: "from-emerald-500 to-teal-500"   },
          { label: "Provisioning",      value: summary.provisioning, icon: AlertTriangle, color: "from-amber-500 to-orange-500"   },
          { label: "Cancelled",         value: summary.cancelled,    icon: AlertTriangle, color: "from-rose-500 to-pink-500"      },
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

      {/* Carrier Filter Tabs */}
      {!loading && connections.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {carriers.map((carrier) => (
            <button
              key={carrier}
              onClick={() => setFilter(carrier)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                filter === carrier
                  ? "bg-sky-600 text-white border-sky-600"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {carrier}
            </button>
          ))}
        </div>
      )}

      {/* Connections Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            <span className="text-sm font-medium">Loading connections...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Wifi className="w-10 h-10 opacity-20" />
            <p className="text-sm">No connections found</p>
          </div>
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((conn) => {
                const Icon = statusIcons[conn.status]?.icon || AlertTriangle;
                const location = `${conn.serviceLocation.suburb}, ${conn.serviceLocation.state} ${conn.serviceLocation.postcode}`;
                return (
                  <tr 
                    key={conn.connectivityID} 
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => handleConnectionClick(conn.connectivityID)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-sky-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{conn.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{conn.connectivityID}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded line-clamp-2">{conn.productDetails.name}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                      {location}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      <span className="text-xs font-medium">{conn.carrier}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-sky-600">{conn.ipAddressing.ipCount}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-4 h-4 ${statusIcons[conn.status]?.cls || "text-amber-500"}`} />
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[conn.status] || "bg-muted text-muted-foreground"}`}>
                          {conn.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConnectivityDetailCard 
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        connectionID={selectedConnectionID}
        data={detailData}
        loading={detailLoading}
        error={detailError}
      />
    </div>
  );
}
