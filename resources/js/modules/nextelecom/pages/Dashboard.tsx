import React, { useState, useEffect } from "react";
import { Wifi, Users, Package, TrendingUp, Signal, Zap, Loader2, AlertTriangle, Clock, MapPin, CheckCircle, Globe } from "lucide-react";
import { useNextElecomToken } from "@/hooks/useNextElecomToken";

interface Connectivity {
  status: string;
  [key: string]: any;
}

interface Outage {
  id: string;
  title?: string;
  description?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  affectedServices?: string[];
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
        setOutages(Array.isArray(items) ? items : []);
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
            Service Outages & Notifications
          </h2>
          {loadingOutages && <Loader2 className="w-4 h-4 animate-spin text-sky-500" />}
        </div>

        {loadingOutages ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/50 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : outages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No active outages or notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {outages.slice(0, 5).map((outage, idx) => (
              <div 
                key={outage.id || idx} 
                className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {outage.title || outage.description || "Service Outage"}
                    </p>
                    
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {(outage.location || outage.serviceLocation) && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          <span>{outage.location || outage.serviceLocation}</span>
                        </div>
                      )}
                      
                      {(outage.startTime || outage.startDate) && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            {outage.startTime || outage.startDate}
                            {outage.endTime || outage.endDate ? ` - ${outage.endTime || outage.endDate}` : ""}
                          </span>
                        </div>
                      )}
                      
                      {outage.affectedServices && outage.affectedServices.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {outage.affectedServices.map((svc, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-700 rounded">
                              {svc}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {outage.status && (
                      <div className="mt-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          outage.status === "active" ? "bg-rose-500/10 text-rose-600" :
                          outage.status === "scheduled" ? "bg-amber-500/10 text-amber-600" :
                          "bg-emerald-500/10 text-emerald-600"
                        }`}>
                          {outage.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {outages.length > 5 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Showing 5 of {outages.length} outages
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
