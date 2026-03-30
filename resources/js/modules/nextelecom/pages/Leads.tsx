import React, { useState, useEffect } from "react";
import { Phone, Mail, MapPin, MoreVertical, Trash2, Eye, Loader2, Search, Wifi, CheckCircle, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNextElecomToken } from "@/hooks/useNextElecomToken";

interface Lead {
  id: number;
  mobile: string;
  customer_name: string;
  address: string;
  purpose_of_visit: string;
  interested_product: string;
  budget: string;
  remarks: string;
  status: string;
  created_at: string;
  connectivity_status?: string;
}

interface Connectivity {
  connectivityID: string;
  name: string;
  status: string;
  serviceLocation?: { suburb: string; state: string };
  [key: string]: any;
}

export default function Leads() {
  const { getToken } = useNextElecomToken();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [connections, setConnections] = useState<Connectivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    fetchLeads();
    fetchConnectivityData();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/leads", {
        headers: { "Accept": "application/json" },
      });

      const data = await response.json();
      if (data.success) {
        setLeads(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch leads:", err);
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
        setConnections(items);
      }
    } catch (err) {
      console.error("Failed to fetch connectivity data");
    }
  };

  const deleteLead = async (id: number) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: "DELETE",
        headers: { "Accept": "application/json" },
      });

      if (response.ok) {
        setLeads(leads.filter(l => l.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete lead:", err);
    } finally {
      setDeleting(null);
    }
  };

  const openLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const filtered = leads.filter(lead =>
    lead.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    lead.mobile.includes(search)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Leads</h1>
          <p className="text-muted-foreground mt-1">Manage captured customer leads</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            placeholder="Search by name or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm min-h-[300px] relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500 mb-2" />
            <p className="text-sm">Loading leads...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <Phone className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">No leads found</p>
            <p className="text-xs mt-1">Leads will appear here after verification</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mobile</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Product</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{lead.customer_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="w-3 h-3" /> {lead.mobile}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-sky-500/10 text-sky-600">
                        {lead.interested_product || "—"}
                      </span>
                      {connections.some(c => c.status === "LIVE") && (
                        <Wifi className="w-3 h-3 text-emerald-500" title="Active connections available" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      lead.status === 'submitted' 
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openLeadDetails(lead)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => deleteLead(lead.id)}
                        disabled={deleting === lead.id}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                        title="Delete Lead"
                      >
                        {deleting === lead.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-border">
          <DialogHeader className="p-6 pb-2 border-b border-border bg-muted/10">
            <DialogTitle className="text-xl">{selectedLead?.customer_name}</DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Mobile Number</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" /> {selectedLead.mobile}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Status</p>
                  <span className="text-sm font-medium px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
                    {selectedLead.status}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Address</p>
                <p className="text-sm text-foreground flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {selectedLead.address || "—"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Purpose of Visit</p>
                  <p className="text-sm text-foreground">{selectedLead.purpose_of_visit || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Interested Product</p>
                  <p className="text-sm text-foreground">{selectedLead.interested_product || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Budget</p>
                <p className="text-sm text-foreground">{selectedLead.budget || "—"}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Remarks</p>
                <p className="text-sm text-foreground">{selectedLead.remarks || "—"}</p>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium mb-3">Connectivity Status</p>
                {connections.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-emerald-500/10">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">{connections.filter(c => c.status === "LIVE").length} Live</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-amber-500/10">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span className="text-amber-600 font-medium">{connections.filter(c => c.status === "PROVISIONING").length} Active</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-rose-500/10">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span className="text-rose-600 font-medium">{connections.filter(c => c.status?.includes("CANCELLED")).length} Off</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No connectivity data available</p>
                )}
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(selectedLead.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
