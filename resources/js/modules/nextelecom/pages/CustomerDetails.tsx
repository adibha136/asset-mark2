import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ServerOff, Mail, Phone, MapPin, AlertCircle, Building2, User, BarChart3, Database, Users, Zap } from "lucide-react";
import { useNextElecomToken } from "@/hooks/useNextElecomToken";

interface Address {
  streetNumber: string | null;
  streetName: string | null;
  streetType: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  subNumber: string | null;
}

interface IndividualDetail {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  [key: string]: any;
}

interface CustomerDetail {
  id?: string;
  name: string;
  abn: string | null;
  phone: string;
  email: string;
  type: string;
  address: Address;
  isReseller?: string | boolean;
  status?: string;
  individual?: IndividualDetail;
  individuals?: IndividualDetail[];
  [key: string]: any;
}

export default function CustomerDetails() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { getToken } = useNextElecomToken();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [metrics, setMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState("");
  const [data, setData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [integration, setIntegration] = useState<any>(null);
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrationError, setIntegrationError] = useState("");

  useEffect(() => {
    setMetrics(null);
    setData(null);
    setUsers([]);
    setIntegration(null);
    setMetricsError("");
    setDataError("");
    setUsersError("");
    setIntegrationError("");
    
    fetchCustomerDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  useEffect(() => {
    const id = customerId || customer?.id || customer?.customerID;
    if (id) {
      fetchMetrics();
      fetchData();
      fetchUsers();
      fetchIntegration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const fetchCustomerDetails = async () => {
    const token = await getToken();
    if (!token) {
      setErrorMsg("No API connection configured. Please connect in Settings first.");
      setLoading(false);
      return;
    }

    if (!customerId) {
      setErrorMsg("Customer ID is required.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const response = await fetch(
        `/api/nextelecom/proxy-customer-detail?customerID=${encodeURIComponent(customerId)}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || `API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const customerData = data?.data || data;
      setCustomer(customerData);
    } catch (err: any) {
      console.error("Fetch customer details error:", err);
      setErrorMsg(err?.message || "Failed to load customer details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    const token = await getToken();
    const id = customerId || customer?.id || customer?.customerID;
    console.log("Fetching metrics for customer ID:", id, "from customerId param:", customerId, "or customer object:", customer?.id || customer?.customerID);
    if (!token || !id) {
      console.warn("Skipping metrics fetch - token:", !!token, "id:", id);
      setMetricsError("No token or customer ID available");
      return;
    }

    try {
      setMetricsLoading(true);
      setMetricsError("");
      const response = await fetch(
        `/api/nextelecom/proxy-customer-metrics?customerID=${encodeURIComponent(id)}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        }
      );

      const result = await response.json();
      console.log("Metrics response:", result, "Status:", response.status);

      if (response.ok) {
        const metricsData = result?.data || result?.metrics || result;
        console.log("Extracted metrics data:", metricsData);
        setMetrics(metricsData);
      } else {
        const errorMsg = result?.error || result?.message || `API returned HTTP ${response.status}`;
        setMetricsError(errorMsg);
        console.error("Metrics API error:", errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to fetch metrics";
      console.error("Failed to fetch metrics:", err);
      setMetricsError(errorMsg);
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchData = async () => {
    const token = await getToken();
    const id = customerId || customer?.id || customer?.customerID;
    if (!token || !id) return;

    try {
      setDataLoading(true);
      setDataError("");
      const response = await fetch(
        `/api/nextelecom/proxy-customer-data?customerID=${encodeURIComponent(id)}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        }
      );

      const result = await response.json();
      if (response.ok) {
        console.log("Data response:", result);
        const dataValue = result?.data || result?.data_usage || result;
        console.log("Extracted data:", dataValue);
        setData(dataValue);
      } else {
        const errorMsg = result?.error || result?.message || `API returned HTTP ${response.status}`;
        setDataError(errorMsg);
        console.error("Data API error:", errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to fetch data";
      console.error("Failed to fetch data:", err);
      setDataError(errorMsg);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchUsers = async () => {
    const token = await getToken();
    const id = customerId || customer?.id || customer?.customerID;
    if (!token || !id) return;

    try {
      setUsersLoading(true);
      setUsersError("");
      const response = await fetch(
        `/api/nextelecom/proxy-customer-users?customerID=${encodeURIComponent(id)}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        }
      );

      const result = await response.json();
      if (response.ok) {
        console.log("Users response:", result);
        let usersList = [];
        if (Array.isArray(result?.data)) {
          usersList = result.data;
        } else if (Array.isArray(result?.users)) {
          usersList = result.users;
        } else if (Array.isArray(result)) {
          usersList = result;
        }
        console.log("Extracted users:", usersList);
        setUsers(usersList);
      } else {
        const errorMsg = result?.error || result?.message || `API returned HTTP ${response.status}`;
        setUsersError(errorMsg);
        console.error("Users API error:", errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to fetch users";
      console.error("Failed to fetch users:", err);
      setUsersError(errorMsg);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchIntegration = async () => {
    const token = await getToken();
    const id = customerId || customer?.id || customer?.customerID;
    if (!token || !id) return;

    try {
      setIntegrationLoading(true);
      setIntegrationError("");
      const response = await fetch(
        `/api/nextelecom/proxy-customer-integration?customerID=${encodeURIComponent(id)}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        }
      );

      const result = await response.json();
      if (response.ok) {
        console.log("Integration response:", result);
        const integrationData = result?.data || result?.integrations || result;
        console.log("Extracted integration:", integrationData);
        setIntegration(integrationData);
      } else {
        const errorMsg = result?.error || result?.message || `API returned HTTP ${response.status}`;
        setIntegrationError(errorMsg);
        console.error("Integration API error:", errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to fetch integration";
      console.error("Failed to fetch integration:", err);
      setIntegrationError(errorMsg);
    } finally {
      setIntegrationLoading(false);
    }
  };

  const formatAddress = (address: Address) => {
    return [
      address?.streetNumber,
      address?.streetName,
      address?.streetType,
      address?.suburb,
      address?.state,
      address?.postcode
    ]
      .filter(Boolean)
      .join(" ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          <p className="text-sm text-muted-foreground">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/nextelecom/clients")}
          className="flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </button>
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/5 p-6 flex flex-col items-start gap-4">
          <div className="flex gap-3">
            <ServerOff className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Connection Error</p>
              <p className="text-xs text-rose-500/80 mt-1">{errorMsg}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/nextelecom/clients")}
          className="flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </button>
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/5 p-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-600">Customer not found</p>
          </div>
        </div>
      </div>
    );
  }

  const individuals = customer.individuals || (customer.individual ? [customer.individual] : []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/nextelecom/clients")}
          className="flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </button>
      </div>

      {/* Customer Header */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-600 text-lg font-bold flex-shrink-0">
            {customer.name ? customer.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">
                {customer.type || "N/A"}
              </span>
              {customer.status && (
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
                  {customer.status}
                </span>
              )}
              {customer.abn && (
                <span className="text-xs text-muted-foreground font-mono">ABN: {customer.abn}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
            <Building2 className="w-4 h-4" /> Contact Details
          </h2>
          <div className="space-y-4">
            {customer.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground break-all">{customer.email}</p>
                </div>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium text-foreground">{customer.phone}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" /> Address
          </h2>
          {customer.address ? (
            <div className="space-y-2 text-sm">
              {formatAddress(customer.address) ? (
                <>
                  <p className="text-foreground font-medium">{formatAddress(customer.address)}</p>
                  {customer.address.state && customer.address.postcode && (
                    <p className="text-muted-foreground">
                      {customer.address.state} {customer.address.postcode}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No address information</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No address information</p>
          )}
        </div>
      </div>

      {/* Individual Details Section */}
      {individuals.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border bg-muted/10">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" /> Individual Contact Details ({individuals.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {individuals.map((individual, idx) => (
              <div key={idx} className="p-6 hover:bg-muted/30 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {individual.firstName && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">First Name</p>
                      <p className="text-sm font-medium">{individual.firstName}</p>
                    </div>
                  )}
                  {individual.lastName && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Last Name</p>
                      <p className="text-sm font-medium">{individual.lastName}</p>
                    </div>
                  )}
                  {individual.email && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Email</p>
                      <p className="text-sm font-medium break-all">{individual.email}</p>
                    </div>
                  )}
                  {individual.phone && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Phone</p>
                      <p className="text-sm font-medium">{individual.phone}</p>
                    </div>
                  )}
                  {individual.position && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Position</p>
                      <p className="text-sm font-medium">{individual.position}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border bg-muted/10">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <BarChart3 className="w-4 h-4" /> Metrics
          </h2>
        </div>
        <div className="p-6">
          {metricsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p className="text-sm">Loading metrics...</p>
            </div>
          ) : metricsError ? (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
              <p className="text-xs text-red-600 font-medium">{metricsError}</p>
            </div>
          ) : metrics ? (
            <div className="space-y-4">
              {typeof metrics === 'object' && metrics !== null && !Array.isArray(metrics) ? (
                Object.keys(metrics).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(metrics).map(([key, value]) => (
                      <div key={key} className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">
                          {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}
                        </p>
                        {typeof value === 'object' && value !== null ? (
                          <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto max-h-40 font-mono">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-sm font-bold text-foreground break-all">{String(value)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No metrics fields available</p>
                )
              ) : (
                <pre className="text-xs bg-muted/50 p-4 rounded overflow-auto max-h-96 font-mono">
                  {JSON.stringify(metrics, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No metrics data available</p>
          )}
        </div>
      </div>

      {/* Data Section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border bg-muted/10">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <Database className="w-4 h-4" /> Data
          </h2>
        </div>
        <div className="p-6">
          {dataLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p className="text-sm">Loading data...</p>
            </div>
          ) : dataError ? (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
              <p className="text-xs text-red-600 font-medium">{dataError}</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {typeof data === 'object' && data !== null && !Array.isArray(data) ? (
                Object.keys(data).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(data).map(([key, value]) => (
                      <div key={key} className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">
                          {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}
                        </p>
                        {typeof value === 'object' && value !== null ? (
                          <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto max-h-40 font-mono">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-sm font-bold text-foreground break-all">{String(value)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data fields available</p>
                )
              ) : (
                <pre className="text-xs bg-muted/50 p-4 rounded overflow-auto max-h-96 font-mono">
                  {JSON.stringify(data, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </div>
      </div>

      {/* Users Section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border bg-muted/10">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" /> Users ({users.length})
          </h2>
        </div>
        <div className="p-6">
          {usersLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p className="text-sm">Loading users...</p>
            </div>
          ) : usersError ? (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
              <p className="text-xs text-red-600 font-medium">{usersError}</p>
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-4">
              {users.map((user, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(user).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
                          {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}
                        </p>
                        {typeof value === 'object' && value !== null ? (
                          <pre className="text-xs bg-muted/30 p-2 rounded overflow-auto max-h-20 font-mono">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-sm font-medium break-all capitalize">{String(value)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No users found</p>
          )}
        </div>
      </div>

      {/* Integration Section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border bg-muted/10">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <Zap className="w-4 h-4" /> Integration
          </h2>
        </div>
        <div className="p-6">
          {integrationLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p className="text-sm">Loading integration...</p>
            </div>
          ) : integrationError ? (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
              <p className="text-xs text-red-600 font-medium">{integrationError}</p>
            </div>
          ) : integration ? (
            <div className="space-y-4">
              {typeof integration === 'object' && integration !== null && !Array.isArray(integration) ? (
                Object.keys(integration).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(integration).map(([key, value]) => (
                      <div key={key} className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">
                          {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}
                        </p>
                        {typeof value === 'object' && value !== null ? (
                          <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto max-h-40 font-mono">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-sm font-bold text-foreground break-all">{String(value)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No integration fields available</p>
                )
              ) : (
                <pre className="text-xs bg-muted/50 p-4 rounded overflow-auto max-h-96 font-mono">
                  {JSON.stringify(integration, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No integration data available</p>
          )}
        </div>
      </div>

      {/* Raw Data (for debugging) */}
      {customer && Object.keys(customer).length > 0 && (
        <details className="rounded-xl border border-border bg-card p-4">
          <summary className="text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground">
            Raw Data (for debugging)
          </summary>
          <pre className="mt-3 text-xs bg-muted/50 p-3 rounded overflow-auto max-h-64">
            {JSON.stringify(customer, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
