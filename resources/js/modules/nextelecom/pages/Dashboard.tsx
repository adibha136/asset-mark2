import React, { useState, useEffect } from "react";
import { Wifi, Users, Package, TrendingUp, Signal, Zap, Loader2, AlertTriangle, Clock, MapPin, CheckCircle, Globe, AlertCircle, Mail, Phone, BookOpen, Ticket, Calendar } from "lucide-react";
import { useNextElecomToken } from "@/hooks/useNextElecomToken";

interface Connectivity {
  status: string;
  [key: string]: any;
}

interface Outage {
  id: string;
  title?: string;
  description?: string;
  reason?: string;
  type?: string;
  ticketType?: string;
  category?: string;
  creationDate?: string;
  resolutionDate?: string;
  closeDate?: string;
  startTime?: string;
  endTime?: string;
  plannedStart?: string;
  plannedEnd?: string;
  status?: string;
  location?: string;
  affectedServices?: string[];
  severity?: "critical" | "high" | "medium" | "low";
  affectedAssets?: number;
  expectedResolution?: string;
  rootCause?: string;
  duration?: string;
  details?: {
    reason?: string;
    cause?: string;
    impact?: string;
    description?: string;
    [key: string]: any;
  };
  updates?: Array<{
    timestamp?: string;
    message?: string;
  }>;
  supportContact?: {
    email?: string;
    phone?: string;
    ticketNumber?: string;
  };
  [key: string]: any;
}

export default function Dashboard() {
  const { getToken } = useNextElecomToken();
  const [connections, setConnections] = useState<Connectivity[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [outages, setOutages] = useState<Outage[]>([]);
  const [loadingOutages, setLoadingOutages] = useState(true);

  useEffect(() => {
    fetchConnectivityStats();
    fetchOutages();
  }, []);

  const fetchConnectivityStats = async () => {
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
      console.error("Failed to fetch connectivity stats");
    } finally {
      setLoadingConnections(false);
    }
  };

  const calculateDuration = (startTime?: string, endTime?: string): string | null => {
    if (!startTime) return null;
    try {
      const start = new Date(startTime);
      const end = endTime ? new Date(endTime) : new Date();
      const diffMs = end.getTime() - start.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes}m`;
      }
      return `${diffMinutes}m`;
    } catch {
      return null;
    }
  };

  const fetchOutages = async () => {
    const token = await getToken();
    if (!token) {
      setLoadingOutages(false);
      return;
    }

    try {
      const response = await fetch("/api/nextelecom/proxy-outages", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const items = data?.data?.outages || data?.outages || data?.data || [];
        const processedItems = Array.isArray(items) 
          ? items.map((item: Outage) => {
              let reason = item.reason;
              
              // Check in details section if reason not found
              if (!reason && item.details) {
                reason = (item.details as any)?.reason || 
                         (item.details as any)?.cause || 
                         (item.details as any)?.impact || 
                         (item.details as any)?.description;
              }
              
              // Fallback to other fields
              if (!reason) {
                reason = item.rootCause || item.description || item.title || item.summary || 'No reason provided';
              }
              
              return {
                ...item,
                reason,
                duration: item.duration || calculateDuration(item.startTime || item.plannedStart, item.endTime || item.plannedEnd)
              };
            })
          : [];
        setOutages(processedItems);
      }
    } catch (err) {
      console.error("Failed to fetch outages:", err);
    } finally {
      setLoadingOutages(false);
    }
  };

  const connectivityStats = {
    total: connections.length,
    live: connections.filter((c) => c.status === "LIVE").length,
    provisioning: connections.filter((c) => c.status === "PROVISIONING").length,
    cancelled: connections.filter((c) => c.status?.includes("CANCELLED")).length,
  };

  const stats = [
    { label: "Active Connections",  value: connectivityStats.live.toString(),   change: `of ${connectivityStats.total}`,    icon: Wifi,     color: "from-sky-500 to-cyan-500" },
    { label: "Live Services",       value: connectivityStats.live.toString(),   change: "Live",  icon: Signal,    color: "from-emerald-500 to-teal-500" },
    { label: "Provisioning",        value: connectivityStats.provisioning.toString(),  change: "In Progress",   icon: Package,   color: "from-violet-500 to-purple-500" },
    { label: "Connectivity Status", value: `${Math.round((connectivityStats.live / connectivityStats.total) * 100) || 0}%`, change: "Online Rate",  icon: Globe,      color: "from-rose-500 to-pink-500" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NexTelecom Dashboard</h1>
          <p className="text-muted-foreground mt-1">Network overview & real-time metrics</p>
        </div>
        <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full ${
          connectivityStats.live > 0 
            ? "text-emerald-500 bg-emerald-500/10" 
            : "text-amber-500 bg-amber-500/10"
        }`}>
          <span className={`w-2 h-2 rounded-full ${connectivityStats.live > 0 ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
          {connectivityStats.live > 0 ? "Network Healthy" : "Check Connections"}
        </div>
      </div>

      {/* Stat Cards */}
      {loadingConnections ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-5 shadow-sm animate-pulse"
            >
              <div className="h-4 bg-muted rounded w-1/2 mb-3" />
              <div className="h-8 bg-muted rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
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
              <div className="text-xs text-emerald-500 mt-1 font-medium">{stat.change}</div>
            </div>
          ))}
        </div>
      )}

      {/* Outages Section */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Service Outages
          </h2>
          {loadingOutages && <Loader2 className="w-4 h-4 animate-spin text-sky-500" />}
        </div>

        {loadingOutages ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        ) : outages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No active outages or notifications</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Planned Start</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Planned End</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Duration</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Reason</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Location</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Affected</th>
                </tr>
              </thead>
              <tbody>
                {outages.map((outage, idx) => (
                  <tr key={outage.id || idx} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-semibold">
                        {outage.type || outage.ticketType || "Maintenance"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {outage.plannedStart ? new Date(outage.plannedStart).toLocaleString() : 
                       outage.startTime ? new Date(outage.startTime).toLocaleString() : "-"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {outage.plannedEnd ? new Date(outage.plannedEnd).toLocaleString() : 
                       outage.endTime ? new Date(outage.endTime).toLocaleString() : "-"}
                    </td>
                    <td className="py-3 px-4">
                      {outage.duration ? (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-500/10 text-gray-600">
                          {outage.duration}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-4 text-blue-500 hover:underline cursor-pointer max-w-xs truncate">
                      {outage.reason || outage.description || "-"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                      {outage.location || "-"}
                    </td>
                    <td className="py-3 px-4">
                      {outage.affectedServices ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-semibold whitespace-nowrap">
                          {outage.affectedServices.length} Service{outage.affectedServices.length !== 1 ? 's' : ''}
                        </span>
                      ) : outage.affectedAssets ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-semibold whitespace-nowrap">
                          {outage.affectedAssets} Asset{outage.affectedAssets !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {outages.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Showing 1 to {outages.length} of {outages.length} entries
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
