import React, { useState, useEffect, useMemo } from "react";
import { 
  UserCheck, Search, Phone, Mail, MapPin, MoreVertical, Plus, 
  Loader2, ServerOff, CheckCircle, Flame, Wifi, AlertCircle,
  Users, Activity, Clock, ChevronDown, ChevronRight, ExternalLink,
  Filter, Download, Calendar
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useNextElecomToken } from "@/hooks/useNextElecomToken";
import { cn } from "@/lib/utils";

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface Address {
  streetNumber: string | null;
  streetName: string | null;
  streetType: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  subNumber: string | null;
}

interface Customer {
  id?: string;
  name: string;
  abn: string | null;
  phone: string;
  email: string;
  type: string;
  address: Address;
  isReseller?: string | boolean;
  integrationCreate?: string | boolean;
  status?: string;
  created_at?: string;
}

interface Connectivity {
  connectivityID: string;
  name: string;
  status: string;
  product?: string;
  carrier?: string;
  productDetails?: { name: string; [key: string]: any };
  serviceLocation?: { suburb?: string; state?: string; postcode?: string };
  ipAddressing?: { ipCount: number; ipList: (string | null)[] };
  voip?: { enabled: boolean; numbers?: string[]; [key: string]: any };
  [key: string]: any;
}

interface Integration {
  integrationID: string;
  name: string;
  enabled: boolean;
  code?: string;
  [key: string]: any;
}

const CircularProgress = ({ percentage, size = 40, strokeWidth = 4, color = "stroke-sky-500" }: { percentage: number, size?: number, strokeWidth?: number, color?: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-500", color)}
        />
      </svg>
      <span className="absolute text-[10px] font-bold">{percentage}%</span>
    </div>
  );
};

export default function Clients() {
  const navigate = useNavigate();
  const { getToken } = useNextElecomToken();
  const [clients, setClients] = useState<Customer[]>([]);
  const [connectivity, setConnectivity] = useState<Connectivity[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [voipServices, setVoipServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Extract unique domains from emails
  const availableDomains = useMemo(() => {
    const domains = new Set<string>();
    clients.forEach(c => {
      if (c.email && c.email.includes("@")) {
        const domain = c.email.split("@")[1];
        domains.add(domain);
      }
    });
    return Array.from(domains);
  }, [clients]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openDetails = (client: Customer) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  };

  // ─── Fetch Clients automatically ──────────────────────────────────────────
  const fetchClients = async () => {
    const token = await getToken();
    if (!token) {
      setErrorMsg("No API connection configured. Please connect in Settings first.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      const tenantId = localStorage.getItem("tenant_id") || sessionStorage.getItem("tenant_id");
      const url = new URL("/api/nextelecom/proxy-customers", window.location.origin);
      if (tenantId) {
        url.searchParams.append("tenant_id", tenantId);
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || `API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      
      let items: Customer[] = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (Array.isArray(data?.data?.customers)) {
        items = data.data.customers;
      } else if (Array.isArray(data?.data)) {
        items = data.data;
      } else if (Array.isArray(data?.customers)) {
        items = data.customers;
      } else if (data && typeof data === 'object') {
        const arrayProperty = Object.values(data).find(val => Array.isArray(val));
        items = (arrayProperty as Customer[]) || [];
      }
      
      setClients(items);
    } catch (err: any) {
      console.error("Fetch clients error:", err);
      // Fallback to CORS proxy check
      if (err?.message?.includes("Failed to fetch") || err?.message?.includes("NetworkError")) {
        setErrorMsg("Failed to connect to API due to Network/CORS block.");
      } else {
        setErrorMsg(err?.message || "Failed to load clients.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectivityData = async () => {
    const token = await getToken();
    if (!token) return;

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
        setConnectivity(items);
      }
    } catch (err) {
      console.error("Failed to fetch connectivity data");
    }
  };

  const fetchIntegrations = async () => {
    const token = await getToken();
    if (!token) return;

    try {
      const response = await fetch("/api/nextelecom/proxy-integrations", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data?.data) ? data.data : data?.integrations || [];
        setIntegrations(items);
      }
    } catch (err) {
      console.error("Failed to fetch integrations data");
    }
  };

  const fetchVoipServices = async () => {
    const token = await getToken();
    if (!token) return;

    try {
      const response = await fetch("/api/nextelecom/proxy-voip", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data?.data?.voip) ? data.data.voip : data?.voip || [];
        setVoipServices(items);
      } else if (response.status === 406) {
        console.warn("VoIP endpoint not available (406)");
        setVoipServices([]);
      } else {
        console.error(`Failed to fetch VoIP services: ${response.status}`);
      }
    } catch (err) {
      console.error("Failed to fetch VoIP services:", err);
      setVoipServices([]);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchConnectivityData();
    fetchIntegrations();
    fetchVoipServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Add Client Form State ────────────────────────────────────────────────
  const initialFormState: Customer = {
    name: "",
    abn: null,
    phone: "",
    email: "",
    type: "person",
    address: {
      streetNumber: "",
      streetName: "",
      streetType: "",
      suburb: "",
      state: "",
      postcode: "",
      subNumber: null
    },
    isReseller: "false",
    integrationCreate: "true"
  };

  const [formData, setFormData] = useState<Customer>(initialFormState);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getToken();
    if (!token) {
      alert("No valid token. Please connect via Settings.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/nextelecom/proxy-customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create client: ${errorText}`);
      }

      // Success
      setIsModalOpen(false);
      setFormData(initialFormState); // reset
      fetchClients(); // refresh list
    } catch (err: any) {
      alert(err.message || "Failed to add client");
    } finally {
      setIsSubmitting(false);
    }
  };


  // ─── Render ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase()) || 
                           c.email?.toLowerCase().includes(search.toLowerCase());
      
      const matchesDomain = domainFilter === "all" || (c.email && c.email.includes("@" + domainFilter));
      
      return matchesSearch && matchesDomain;
    });
  }, [clients, search, domainFilter]);

  const stats = useMemo(() => {
    const total = clients.length;
    const active = connectivity.filter(c => c.status === "LIVE").length;
    const business = clients.filter(c => c.type === "business").length;
    return { total, active, business };
  }, [clients, connectivity]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage and monitor your customer base</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-background/50 border-border/50 focus-visible:ring-sky-500/30 h-9"
              placeholder="Search user name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2 border-border/50 bg-muted/20">
            <Download className="w-4 h-4" /> Export Data
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-500/20">
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm shadow-xl shadow-black/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
              <h3 className="text-2xl font-bold">{stats.total}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm shadow-xl shadow-black/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Wifi className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Right Now</p>
              <h3 className="text-2xl font-bold">{stats.active}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Currently connected services</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 backdrop-blur-sm shadow-xl shadow-black/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Business Entities</p>
              <h3 className="text-2xl font-bold">{stats.business}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Across selected period</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & Toolbar ── */}
      <Card className="bg-card/30 border-border/50">
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
            <Badge 
              variant={domainFilter === "all" ? "info" : "outline"} 
              className={cn(
                "cursor-pointer transition-all px-3 py-1 border-border/50",
                domainFilter === "all" ? "bg-sky-500 text-white shadow-md shadow-sky-500/20" : "hover:bg-muted"
              )}
              onClick={() => setDomainFilter("all")}
            >
              All Entities
            </Badge>
              {availableDomains.map(domain => (
                <Badge 
                  key={domain}
                  variant={domainFilter === domain ? "info" : "outline"} 
                  className={cn(
                    "cursor-pointer transition-all px-3 py-1 border-border/50",
                    domainFilter === domain ? "bg-sky-500 text-white shadow-md shadow-sky-500/20" : "hover:bg-muted"
                  )}
                  onClick={() => setDomainFilter(domain)}
                >
                  {domain}
                </Badge>
              ))}
            </div>
        </CardContent>
      </Card>

      {/* ── Content ── */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-sky-500 mb-4" />
            <p className="text-lg animate-pulse">Fetching client data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card/20 border-dashed border-border/50 py-20">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground">
              <Users className="w-16 h-16 opacity-10 mb-4" />
              <p className="text-xl font-medium">No clients matched your search</p>
              <p className="text-sm">Try adjusting your filters or search terms</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Table Header Simulation */}
            <div className="grid grid-cols-12 px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-5">User</div>
              <div className="col-span-3">Service / Provider</div>
              <div className="col-span-2 text-center">Services</div>
              <div className="col-span-2"></div>
            </div>

            {filtered.map((c, i) => {
              const rowId = c.id || `client-${i}`;
              const isExpanded = expandedRows[rowId];
              const clientConnectivity = connectivity.find(conn => conn.name?.toLowerCase().includes(c.name.toLowerCase()));
              const clientVoip = voipServices.find(voip => voip.name?.toLowerCase().includes(c.name.toLowerCase()) || c.name?.toLowerCase().includes(voip.name?.toLowerCase()));
              const enrichedConnectivity = clientConnectivity ? { ...clientConnectivity, voip: clientVoip } : null;
              const xeroIntegration = integrations.find(int => int.code === "XERO" || int.name?.includes("Xero"));
              
              return (
                <div key={rowId} className="group">
                  <Card 
                    className={cn(
                      "bg-card/40 border-border/40 hover:border-sky-500/30 transition-all duration-300 cursor-pointer overflow-hidden",
                      isExpanded && "ring-1 ring-sky-500/20 border-sky-500/30 bg-card/60"
                    )}
                    onClick={() => toggleRow(rowId)}
                  >
                    <CardContent className="p-0">
                      <div className="grid grid-cols-12 items-center px-6 py-4">
                        {/* User Info */}
                        <div className="col-span-5 flex items-center gap-4">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500/20 to-sky-600/10 flex items-center justify-center text-sky-500 border border-sky-500/20 shadow-inner font-bold">
                              {c.name?.charAt(0).toUpperCase()}
                            </div>
                            {enrichedConnectivity?.status === "LIVE" && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-foreground truncate group-hover:text-sky-500 transition-colors">{c.name}</h4>
                              <Badge variant={xeroIntegration?.enabled ? "success" : "muted"} className="text-[8px] px-1.5 h-5 flex-shrink-0">
                                {xeroIntegration?.enabled ? "XERO" : "NONE"}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                            <p className="text-[10px] text-muted-foreground/60">{new Date().toISOString().split('T')[0]}</p>
                          </div>
                        </div>

                        {/* Service / Provider */}
                        <div className="col-span-3 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{enrichedConnectivity?.product || "NexTelecom Service"}</p>
                        </div>

                        {/* Services Count */}
                        <div className="col-span-2 text-center">
                          <span className="text-xs font-bold text-foreground">1</span>
                        </div>

                        {/* Expand Button */}
                        <div className="col-span-2 flex justify-end items-center">
                          <div 
                            className="p-1 rounded-md hover:bg-muted transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetails(c);
                            }}
                          >
                            <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                          </div>
                        </div>
                      </div>

                      {/* Expanded Section */}
                      {isExpanded && (
                        <div className="px-6 py-4 border-t border-border/40 bg-muted/10 animate-in slide-in-from-top-2 duration-300">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Email</p>
                              <p className="text-xs text-foreground flex items-center gap-2">
                                <Mail className="w-3 h-3 text-sky-500" /> {c.email}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Phone</p>
                              <p className="text-xs text-foreground flex items-center gap-2">
                                <Phone className="w-3 h-3 text-emerald-500" /> {c.phone}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Service / Provider</p>
                              <p className="text-xs text-foreground">{enrichedConnectivity?.product || "NexTelecom Service"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Status</p>
                              <Badge variant={enrichedConnectivity?.status === "LIVE" ? "success" : "muted"} className="text-[9px]">
                                {enrichedConnectivity?.status === "LIVE" ? "Active" : "Offline"}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-1 mb-6">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Full Address</p>
                            <p className="text-xs text-foreground flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-rose-500" />
                              {[c.address?.streetNumber, c.address?.streetName, c.address?.streetType, c.address?.suburb, c.address?.state, c.address?.postcode].filter(Boolean).join(", ")}
                            </p>
                          </div>

                          <div className="border-t border-border/20 pt-4 mb-4">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3">Plans & Services</p>
                            {enrichedConnectivity ? (
                              <div className="space-y-3">
                                <div className="bg-muted/20 p-3 rounded-lg space-y-2">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Plan Name</p>
                                  <p className="text-xs text-foreground">{enrichedConnectivity.productDetails?.name || enrichedConnectivity.product || "N/A"}</p>
                                </div>
                                {enrichedConnectivity.serviceLocation && (
                                  <div className="bg-muted/20 p-3 rounded-lg space-y-2">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Service Location</p>
                                    <p className="text-xs text-foreground">
                                      {[enrichedConnectivity.serviceLocation.suburb, enrichedConnectivity.serviceLocation.state, enrichedConnectivity.serviceLocation.postcode].filter(Boolean).join(", ")}
                                    </p>
                                  </div>
                                )}
                                {enrichedConnectivity.ipAddressing && enrichedConnectivity.ipAddressing.ipCount > 0 && (
                                  <div className="bg-muted/20 p-3 rounded-lg space-y-2">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">IP Addresses ({enrichedConnectivity.ipAddressing.ipCount})</p>
                                    <div className="space-y-1">
                                      {enrichedConnectivity.ipAddressing.ipList?.filter(Boolean).map((ip, idx) => (
                                        <p key={idx} className="text-xs text-foreground font-mono bg-background/50 px-2 py-1 rounded">{ip}</p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {enrichedConnectivity.voip?.enabled && (
                                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg space-y-2">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase">VoIP Enabled</p>
                                    {enrichedConnectivity.voip.numbers && (
                                      <div className="space-y-1">
                                        {enrichedConnectivity.voip.numbers.map((num, idx) => (
                                          <p key={idx} className="text-xs text-foreground">{num}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No service details available</p>
                            )}
                          </div>

                          <div className="border-t border-border/20 pt-4 mb-4">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3">Billing & Details</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <Card className="bg-muted/30 border-none shadow-none">
                                <CardContent className="p-3">
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Total Invoiced</p>
                                  <p className="text-sm font-bold text-emerald-500 mt-1">$1,240.00</p>
                                </CardContent>
                              </Card>
                              <Card className="bg-muted/30 border-none shadow-none">
                                <CardContent className="p-3">
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Service Score</p>
                                  <p className="text-sm font-bold text-sky-500 mt-1">98 / 100</p>
                                </CardContent>
                              </Card>
                              <Card className="bg-muted/30 border-none shadow-none">
                                <CardContent className="p-3">
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Services</p>
                                  <p className="text-sm font-bold text-foreground mt-1">1</p>
                                </CardContent>
                              </Card>
                              <Card className="bg-muted/30 border-none shadow-none">
                                <CardContent className="p-3">
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase">IP Count</p>
                                  <p className="text-sm font-bold text-foreground mt-1">{enrichedConnectivity?.ipAddressing?.ipCount || 0}</p>
                                </CardContent>
                              </Card>
                            </div>
                          </div>

                          <div className="text-[10px] text-muted-foreground pt-3 border-t border-border/20">
                            Client ID: <span className="font-mono">{c.id?.substring(0, 8)}...</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Client Details Dialog ── */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[500px] border-border bg-card shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
                <Users className="w-5 h-5" />
              </div>
              Customer Intelligence
            </DialogTitle>
            <DialogDescription>Detailed overview for {selectedClient?.name}</DialogDescription>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted/30 border-none shadow-none">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Invoiced</p>
                    <p className="text-xl font-bold text-emerald-500">$1,240.00</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-none shadow-none">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Service Score</p>
                    <p className="text-xl font-bold text-sky-500">98 / 100</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="w-4 h-4" /> Email</span>
                  <span className="text-sm font-medium">{selectedClient.email}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="w-4 h-4" /> Phone</span>
                  <span className="text-sm font-medium">{selectedClient.phone}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4" /> Status</span>
                  <Badge variant="success">Active</Badge>
                </div>
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mb-2"><MapPin className="w-4 h-4" /> Full Address</p>
                  <p className="text-sm font-medium pl-6">
                    {[
                      selectedClient.address?.streetNumber,
                      selectedClient.address?.streetName,
                      selectedClient.address?.streetType,
                      selectedClient.address?.suburb,
                      selectedClient.address?.state,
                      selectedClient.address?.postcode
                    ].filter(Boolean).join(" ")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setIsDetailsOpen(false)}>Close Overview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Client Dialog ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-border">
          <DialogHeader className="p-6 pb-2 border-b border-border bg-muted/10">
            <DialogTitle className="text-xl">Create Wholesale Customer</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreateClient} className="p-6 space-y-5">
            
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> Basic Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Customer Name</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. David Horrell"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Customer Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                  >
                    <option value="person">Person</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Email Address</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Phone Number</label>
                  <input
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="0400 000 000"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Address
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Street No.</label>
                  <input
                    value={formData.address.streetNumber || ""}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, streetNumber: e.target.value }})}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-sky-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Street Name</label>
                  <input
                    value={formData.address.streetName || ""}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, streetName: e.target.value }})}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-sky-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Street Type</label>
                  <input
                    placeholder="e.g. CCT, ST, RD"
                    value={formData.address.streetType || ""}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, streetType: e.target.value }})}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-sky-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Suburb</label>
                  <input
                    value={formData.address.suburb || ""}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, suburb: e.target.value }})}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-sky-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">State</label>
                  <input
                    placeholder="QLD"
                    value={formData.address.state || ""}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value }})}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-sky-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Postcode</label>
                  <input
                    value={formData.address.postcode || ""}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, postcode: e.target.value }})}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:border-sky-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border mt-4">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-70 text-white px-5 py-2 text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> saving...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Save Customer</>
                )}
              </button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
