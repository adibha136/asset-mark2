import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Plus, Search, Building2, Users, Package, MoreHorizontal, Edit, Trash2, Eye, EyeOff, Settings, RefreshCw, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal, ConfirmModal } from "@/components/shared/Modal";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Tenant {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  status: "active" | "inactive" | "pending";
  total_users_count: number;
  assigned_assets_count: number;
  auto_directory_sync: boolean;
  fetch_from_graph: boolean;
  createdAt: string;
  redirect_url?: string;
  azure_tenant_id?: string;
  client_id?: string;
  client_secret?: string;
  is_manual?: boolean;
  description?: string;
  license_name?: string;
  license_count?: number;
}

const statusVariants: Record<string, "success" | "muted" | "warning"> = {
  active: "success",
  inactive: "muted",
  pending: "warning",
};

export default function Tenants() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedTenantUsers, setSelectedTenantUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: "",
    domain: "",
    redirect_url: "",
    azure_tenant_id: "",
    client_id: "",
    client_secret: "",
    description: "",
    auto_directory_sync: false,
    fetch_from_graph: false,
    is_manual: true,
    license_name: "",
    license_count: 0,
  });

  const [editTenant, setEditTenant] = useState<Partial<Tenant>>({});

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ["tenants"],
    queryFn: async () => {
      const response = await api.get("/tenants");
      return response.data;
    },
  });

  // Optimistic Add Mutation
  const addTenantMutation = useMutation({
    mutationFn: async (tenantData: any) => {
      const response = await api.post("/tenants", tenantData);
      return response.data;
    },
    onMutate: async (newTenantData) => {
      await queryClient.cancelQueries({ queryKey: ["tenants"] });
      const previousTenants = queryClient.getQueryData<Tenant[]>(["tenants"]);

      // Optimistically update
      const optimisticTenant = {
        id: "temp-" + Date.now(),
        ...newTenantData,
        status: "active",
        total_users_count: 0,
        assigned_assets_count: 0,
        createdAt: new Date().toISOString()
      };

      queryClient.setQueryData<Tenant[]>(["tenants"], (old = []) => [...old, optimisticTenant]);
      setIsAddModalOpen(false);

      return { previousTenants };
    },
    onError: (err, newTenant, context) => {
      if (context?.previousTenants) {
        queryClient.setQueryData(["tenants"], context.previousTenants);
      }
      toast.error("Failed to add tenant");
      setIsAddModalOpen(true);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
    onSuccess: () => {
      toast.success("Tenant added successfully");
      resetNewTenantForm();
    }
  });

  // Optimistic Update Mutation
  const updateTenantMutation = useMutation({
    mutationFn: async (tenantData: Partial<Tenant>) => {
      if (!selectedTenant?.id) throw new Error("No tenant selected");
      const response = await api.put(`/tenants/${selectedTenant.id}`, tenantData);
      return response.data;
    },
    onMutate: async (updatedData) => {
      await queryClient.cancelQueries({ queryKey: ["tenants"] });
      const previousTenants = queryClient.getQueryData<Tenant[]>(["tenants"]);

      queryClient.setQueryData<Tenant[]>(["tenants"], (old = []) =>
        old.map((t) => (t.id === selectedTenant?.id ? { ...t, ...updatedData } : t))
      );

      setIsEditModalOpen(false);
      return { previousTenants };
    },
    onError: (err, newTenant, context) => {
      if (context?.previousTenants) {
        queryClient.setQueryData(["tenants"], context.previousTenants);
      }
      toast.error("Failed to update tenant");
      setIsEditModalOpen(true);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
    onSuccess: () => {
      toast.success("Tenant updated successfully");
    }
  });

  // Optimistic Delete Mutation
  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tenants/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tenants"] });
      const previousTenants = queryClient.getQueryData<Tenant[]>(["tenants"]);

      queryClient.setQueryData<Tenant[]>(["tenants"], (old = []) => old.filter(t => t.id !== id));

      setIsDeleteModalOpen(false);
      return { previousTenants };
    },
    onError: (err, id, context) => {
      if (context?.previousTenants) {
        queryClient.setQueryData(["tenants"], context.previousTenants);
      }
      toast.error("Failed to delete tenant");
      setIsDeleteModalOpen(true);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
    onSuccess: () => {
      toast.success("Tenant deleted successfully");
    }
  });

  const resetNewTenantForm = () => {
    setNewTenant({
      name: "",
      domain: "",
      redirect_url: "",
      azure_tenant_id: "",
      client_id: "",
      client_secret: "",
      description: "",
      auto_directory_sync: false,
      fetch_from_graph: false,
      is_manual: true,
      license_name: "",
      license_count: 0,
    });
  };

  useEffect(() => {
    if (selectedTenant && isViewModalOpen) {
      const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
          const response = await api.get(`/tenants/${selectedTenant.id}/directory-users`);
          setSelectedTenantUsers(response.data);
        } catch (error) {
          // silent fail
          setSelectedTenantUsers([]);
        } finally {
          setIsLoadingUsers(false);
        }
      };
      fetchUsers();
    } else if (!isViewModalOpen) {
      setSelectedTenantUsers([]);
    }
  }, [selectedTenant, isViewModalOpen]);

  const handleAddTenant = () => {
    addTenantMutation.mutate(newTenant);
  };

  const handleUpdateTenant = () => {
    updateTenantMutation.mutate(editTenant);
  };

  const handleDeleteTenant = () => {
    if (selectedTenant) {
      deleteTenantMutation.mutate(selectedTenant.id);
    }
  };

  const filteredTenants = tenants.filter((tenant) =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between opacity-0 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">Manage organizations on your platform</p>
        </div>
        <Button variant="gradient" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Tenant
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tenant Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTenants.map((tenant, index) => (
          <div
            key={tenant.id}
            className="bg-card rounded-2xl border border-border p-6 card-hover opacity-0 animate-fade-in cursor-pointer"
            style={{ animationDelay: `${200 + index * 50}ms` }}
            onClick={() => {
              navigate(`/assets?tenantId=${tenant.id}`);
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 rounded-xl">
                  {/* Optimized image loading hints */}
                  <AvatarImage
                    src={tenant.logo}
                    loading="lazy"
                    decoding="async"
                  />
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-semibold">
                    {tenant.name ? tenant.name.slice(0, 2).toUpperCase() : "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{tenant.name}</h3>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm text-muted-foreground truncate" title={tenant.domain}>{tenant.domain}</p>
                    {tenant.redirect_url && (
                      <p className="text-xs text-primary truncate" title={tenant.redirect_url}>
                        {tenant.redirect_url}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setIsViewModalOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/tenants/${tenant.id}/users`)}
                    >
                      <Users className="w-4 h-4 mr-2" /> View Directory Users
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedTenant(tenant);
                        // Don't pre-populate the secret for security
                        setEditTenant({ ...tenant, client_secret: "" });
                        setIsEditModalOpen(true);
                        setShowSecret(false);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="w-4 h-4 mr-2" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setIsDeleteModalOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant={statusVariants[tenant.status] || "muted"} className="capitalize shrink-0">
                {tenant.status}
              </Badge>
              {tenant.auto_directory_sync && (
                <Badge variant="info" className="gap-1 shrink-0">
                  <Settings className="w-3 h-3" /> Auto Sync
                </Badge>
              )}
              {tenant.fetch_from_graph && (
                <Badge variant="muted" className="shrink-0">Graph API</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-bold text-foreground">{tenant.total_users_count || 0}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">Total Users</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-bold text-foreground">{tenant.assigned_assets_count || 0}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">Assigned Assets</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Tenant Modal */}
      <Modal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        title="Add New Tenant"
        description="Configure a new organization on your platform"
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleAddTenant} disabled={addTenantMutation.isPending}>
              {addTenantMutation.isPending ? "Adding..." : "Add Tenant"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input
                placeholder="e.g., Acme Corporation"
                value={newTenant.name}
                onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input
                placeholder="e.g., acme.com"
                value={newTenant.domain}
                onChange={(e) => setNewTenant({ ...newTenant, domain: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Redirect URL</Label>
            <Input
              placeholder="e.g., https://acme.com/auth/callback"
              value={newTenant.redirect_url}
              onChange={(e) => setNewTenant({ ...newTenant, redirect_url: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tenant ID</Label>
              <Input
                placeholder="e.g., 8923-..."
                value={newTenant.azure_tenant_id}
                onChange={(e) => setNewTenant({ ...newTenant, azure_tenant_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input
                placeholder="e.g., client-..."
                value={newTenant.client_id}
                onChange={(e) => setNewTenant({ ...newTenant, client_id: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Client Secret or Certificate</Label>
            <div className="relative">
              <Input
                type={showSecret ? "text" : "password"}
                placeholder="Enter client secret..."
                value={newTenant.client_secret}
                onChange={(e) => setNewTenant({ ...newTenant, client_secret: e.target.value })}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Brief description of the organization..."
              value={newTenant.description}
              onChange={(e) => setNewTenant({ ...newTenant, description: e.target.value })}
            />
          </div>

          <div className="space-y-4 p-4 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Sync Settings</h4>
              <button 
                type="button"
                onClick={() => navigate('/help')}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Info className="w-3 h-3" />
                How to connect?
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto Directory Sync</p>
                <p className="text-sm text-muted-foreground">Automatically sync users from directory</p>
              </div>
              <Switch
                checked={newTenant.auto_directory_sync}
                onCheckedChange={(checked) => setNewTenant({ ...newTenant, auto_directory_sync: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Microsoft Graph API</p>
                <p className="text-sm text-muted-foreground">Enable Graph API integration</p>
              </div>
              <Switch
                checked={newTenant.fetch_from_graph}
                onCheckedChange={(checked) => setNewTenant({
                  ...newTenant,
                  fetch_from_graph: checked,
                  is_manual: !checked // If fetch_from_graph is ON, it's NOT manual
                })}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Tenant Modal */}
      <Modal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        title="Edit Tenant"
        description="Update organization configuration"
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleUpdateTenant} disabled={updateTenantMutation.isPending}>
              {updateTenantMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input
                placeholder="e.g., Acme Corporation"
                value={editTenant.name || ""}
                onChange={(e) => setEditTenant({ ...editTenant, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input
                placeholder="e.g., acme.com"
                value={editTenant.domain || ""}
                onChange={(e) => setEditTenant({ ...editTenant, domain: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Redirect URL</Label>
            <Input
              placeholder="e.g., https://acme.com/auth/callback"
              value={editTenant.redirect_url || ""}
              onChange={(e) => setEditTenant({ ...editTenant, redirect_url: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tenant ID</Label>
              <Input
                placeholder="e.g., 8923-..."
                value={editTenant.azure_tenant_id || ""}
                onChange={(e) => setEditTenant({ ...editTenant, azure_tenant_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input
                placeholder="e.g., client-..."
                value={editTenant.client_id || ""}
                onChange={(e) => setEditTenant({ ...editTenant, client_id: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Client Secret or Certificate</Label>
            <div className="relative">
              <Input
                type={showSecret ? "text" : "password"}
                placeholder="Leave blank to keep current secret"
                value={editTenant.client_secret || ""}
                onChange={(e) => setEditTenant({ ...editTenant, client_secret: e.target.value })}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Brief description of the organization..."
              value={editTenant.description || ""}
              onChange={(e) => setEditTenant({ ...editTenant, description: e.target.value })}
            />
          </div>

          <div className="space-y-4 p-4 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Sync Settings</h4>
              <button 
                type="button"
                onClick={() => navigate('/help')}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Info className="w-3 h-3" />
                How to connect?
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto Directory Sync</p>
                <p className="text-sm text-muted-foreground">Automatically sync users from directory</p>
              </div>
              <Switch
                checked={editTenant.auto_directory_sync || false}
                onCheckedChange={(checked) => setEditTenant({ ...editTenant, auto_directory_sync: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Microsoft Graph API</p>
                <p className="text-sm text-muted-foreground">Enable Graph API integration</p>
              </div>
              <Switch
                checked={editTenant.fetch_from_graph || false}
                onCheckedChange={(checked) => setEditTenant({ ...editTenant, fetch_from_graph: checked })}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* View Tenant Details Modal */}
      <Modal
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        title="Tenant Details"
        description="Full organization details and configuration"
        size="lg"
      >
        {selectedTenant && (
          <div className="grid gap-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <Avatar className="w-16 h-16 rounded-2xl">
                <AvatarImage src={selectedTenant.logo} />
                <AvatarFallback className="text-2xl rounded-2xl bg-primary/10 text-primary font-bold">
                  {selectedTenant.name ? selectedTenant.name.slice(0, 2).toUpperCase() : "??"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-bold">{selectedTenant.name}</h3>
                <p className="text-muted-foreground">{selectedTenant.domain}</p>
                <Badge variant={statusVariants[selectedTenant.status] || "muted"} className="mt-1 capitalize">
                  {selectedTenant.status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Infrastructure</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Azure Tenant ID:</span>
                      <span className="font-mono text-xs">{selectedTenant.azure_tenant_id || "Not configured"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Client ID:</span>
                      <span className="font-mono text-xs">{selectedTenant.client_id || "Not configured"}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Manual Setup:</span>
                      <span>{selectedTenant.is_manual ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Auto Sync:</span>
                      <span>{selectedTenant.auto_directory_sync ? "Enabled" : "Disabled"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Graph API:</span>
                      <span>{selectedTenant.fetch_from_graph ? "Enabled" : "Disabled"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Redirect URL</h4>
                  <p className="text-sm font-mono bg-muted p-2 rounded break-all">
                    {selectedTenant.redirect_url || "None"}
                  </p>
                </div>
              </div>
            </div>

            {selectedTenant.description && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-sm p-3 rounded-xl bg-muted/30 border border-border">
                  {selectedTenant.description}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Delete Tenant"
        description={`Are you sure you want to delete "${selectedTenant?.name}"? This will remove all associated data.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteTenant}
        isLoading={deleteTenantMutation.isPending}
      />
    </div>
  );
}
