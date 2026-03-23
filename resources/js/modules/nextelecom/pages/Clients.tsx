import React, { useState, useEffect } from "react";
import { UserCheck, Search, Phone, Mail, MapPin, MoreVertical, Plus, Loader2, ServerOff, CheckCircle, Flame } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link } from "react-router-dom";

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
}

export default function Clients() {
  const [clients, setClients] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  // Token retrieval
  const getToken = () => {
    const raw = localStorage.getItem("nextelecom_api_token");
    if (!raw) return null;
    try {
      return JSON.parse(raw).token;
    } catch {
      return null;
    }
  };

  // ─── Fetch Clients automatically ──────────────────────────────────────────
  const fetchClients = async () => {
    const token = getToken();
    if (!token) {
      setErrorMsg("No API connection configured. Please connect in Settings first.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      const response = await fetch("https://api.virtualplatform.com.au/v2/wholesale/customers", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      // Assume API returns an array or data object containing array
      const items = Array.isArray(data) ? data : (data.data || data.customers || []);
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

  useEffect(() => {
    fetchClients();
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
    const token = getToken();
    if (!token) {
      alert("No valid token. Please connect via Settings.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("https://api.virtualplatform.com.au/v2/wholesale/customers", {
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
  const filtered = clients.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">Manage wholesale telecom customers</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* ── Error / Missing Settings Banner ── */}
      {errorMsg && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/5 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-3">
            <ServerOff className="w-5 h-5 text-rose-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Connection Error</p>
              <p className="text-xs text-rose-500/80 mt-1">{errorMsg}</p>
            </div>
          </div>
          <Link 
            to="/nextelecom/settings" 
            className="flex-shrink-0 text-sm font-medium bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 px-4 py-2 rounded-lg transition-colors"
          >
            Go to Settings
          </Link>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm min-h-[300px] relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500 mb-2" />
            <p className="text-sm">Loading clients...</p>
          </div>
        ) : clients.length === 0 && !errorMsg ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <UserCheck className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">No clients found</p>
            <p className="text-xs mt-1">Click "Add Client" to get started.</p>
          </div>
        ) : clients.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id || i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-600 text-xs font-bold flex-shrink-0">
                        {c.name ? c.name.charAt(0).toUpperCase() : "?"}
                      </div>
                      <span className="font-medium text-foreground">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs flex items-center gap-1.5 text-muted-foreground mb-1">
                      <Mail className="w-3 h-3" /> {c.email || "—"}
                    </div>
                    <div className="text-xs flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="w-3 h-3" /> {c.phone || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-500/10 text-slate-600">
                      {c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {c.address && (c.address.suburb || c.address.state) ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        {c.address.suburb} {c.address.state}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
        ) : null}
      </div>

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
