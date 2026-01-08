import { useState, useMemo, useEffect, ChangeEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  Search, Plus, AlertCircle, User, Zap, Loader2,
  Filter, MoreHorizontal, LayoutGrid, Users as UsersIcon,
  Laptop, Shield, Calendar, ArrowRightLeft, ChevronRight,
  DollarSign, CreditCard, CheckCircle2, XCircle, Ticket, UserCheck,
  RefreshCw, Database, ClipboardCheck, X, Check, ChevronsUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Modal, ConfirmModal } from "@/components/shared/Modal";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ChecklistFillModal } from "@/components/checklist/ChecklistFillModal";

interface Tenant {
  id: string;
  name: string;
  last_sync_at?: string;
  fetch_from_graph?: boolean;
}

interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  mobile_phone?: string;
  job_title?: string;
  profile_pic_url?: string;
  license_name?: string;
  department?: string;
  account_enabled?: boolean;
  assets_count?: number;
  pending_checklists_count?: number;
  completed_questions_count?: number;
  total_questions_count?: number;
  onboarding_total_questions?: number;
  onboarding_completed_questions?: number;
  inactive_total_questions?: number;
  inactive_completed_questions?: number;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  serial_number?: string;
  warranty_expiry?: string;
  license_expiry?: string;
  assignedUsers?: DirectoryUser[];
}

interface TenantStats {
  total_licenses: number;
  used_licenses: number;
  free_licenses: number;
  no_license_count: number;
  total_license_cost: number;
  asset_count: number;
  active_users: number;
  inactive_users: number;
}

export default function Assets() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"assets" | "users">("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [isUserComboboxOpen, setIsUserComboboxOpen] = useState(false);
  const [isAssetComboboxOpen, setIsAssetComboboxOpen] = useState(false);
  const [isTransferComboboxOpen, setIsTransferComboboxOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<DirectoryUser | null>(null);
  const [targetUser, setTargetUser] = useState<DirectoryUser | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const [assetForm, setAssetForm] = useState({
    name: "",
    type: "hardware",
    serial_number: "",
    warranty_expiry: "",
    license_expiry: "",
    description: "",
  });

  const [checklistUserId, setChecklistUserId] = useState<string | null>(null);

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["tenants"],
    queryFn: async () => {
      const response = await api.get("/tenants");
      return response.data;
    },
  });

  // Use effect to handle initial tenant selection from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tenantId = params.get("tenantId");

    if (tenantId) {
      setSelectedTenantId(tenantId);
    } else if (tenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [tenants, location.search, selectedTenantId]);

  const { data: tenantAssets = [], refetch: refetchAssets, isLoading: isLoadingAssets } = useQuery<Asset[]>({
    queryKey: ["assets", selectedTenantId],
    queryFn: async () => {
      const response = await api.get(`/tenants/${selectedTenantId}/assets`);
      return response.data;
    },
    enabled: !!selectedTenantId,
  });

  const { data: tenantUsers = [], isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery<DirectoryUser[]>({
    queryKey: ["users", selectedTenantId],
    queryFn: async () => {
      const response = await api.get(`/tenants/${selectedTenantId}/directory-users`);
      return response.data;
    },
    enabled: !!selectedTenantId,
  });

  const { data: stats, refetch: refetchStats } = useQuery<TenantStats>({
    queryKey: ["tenant-stats", selectedTenantId],
    queryFn: async () => {
      const response = await api.get(`/tenants/${selectedTenantId}/stats`);
      return response.data;
    },
    enabled: !!selectedTenantId,
  });

  const { data: selectedTenant, refetch: refetchTenant } = useQuery<Tenant>({
    queryKey: ["tenants", selectedTenantId],
    queryFn: async () => {
      const response = await api.get(`/tenants/${selectedTenantId}`);
      return response.data;
    },
    enabled: !!selectedTenantId,
  });

  const derivedStats = useMemo(() => {
    const baseFilteredUsers = tenantUsers.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDomain = domainFilter === "all" || user.email?.endsWith(`@${domainFilter}`);
      return matchesSearch && matchesDomain;
    });

    const baseFilteredAssets = tenantAssets.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.serial_number?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDomain = domainFilter === "all" || asset.assignedUsers?.some(u => u.email?.endsWith(`@${domainFilter}`));
      return matchesSearch && matchesDomain;
    });

    return {
      used_licenses: baseFilteredUsers.filter(u => u.license_name && u.license_name !== 'No License').length,
      no_license_count: baseFilteredUsers.filter(u => !u.license_name || u.license_name === 'No License').length,
      asset_count: baseFilteredAssets.length,
      active_users: baseFilteredUsers.filter(u => u.account_enabled === true).length,
      inactive_users: baseFilteredUsers.filter(u => u.account_enabled === false).length,
    };
  }, [tenantUsers, tenantAssets, searchQuery, domainFilter]);

  const uniqueDomains = useMemo(() => {
    const domains = new Set<string>();
    tenantUsers.forEach(user => {
      if (user.email && user.email.includes('@')) {
        const domain = user.email.split('@')[1];
        if (domain) domains.add(domain);
      }
    });
    return Array.from(domains);
  }, [tenantUsers]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/tenants/${selectedTenantId}/sync-directory`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Directory synced successfully");
      refetchUsers();
      refetchStats();
      refetchTenant();
      refetchAssets();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to sync directory");
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ userId, assetId }: { userId: string; assetId: string }) => {
      const response = await api.post(`/tenants/${selectedTenantId}/assign-asset`, {
        user_id: userId,
        asset_id: assetId,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Asset assigned successfully");
      setIsAssignModalOpen(false);
      refetchAssets();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to assign asset");
    },
  });

  const transferMutation = useMutation({
    mutationFn: async ({ assetId, toUserId }: { assetId: string; toUserId: string }) => {
      const response = await api.post(`/tenants/${selectedTenantId}/transfer-asset`, {
        asset_id: assetId,
        to_user_id: toUserId,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Asset transferred successfully");
      setIsTransferModalOpen(false);
      setTargetUser(null);
      setSelectedAsset(null);
      refetchAssets();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to transfer asset");
    },
  });

  const addAssetMutation = useMutation({
    mutationFn: async (formData: typeof assetForm) => {
      const response = await api.post(`/tenants/${selectedTenantId}/assets`, {
        name: formData.name,
        type: formData.type,
        serial_number: formData.serial_number || undefined,
        warranty_expiry: formData.warranty_expiry || undefined,
        license_expiry: formData.license_expiry || undefined,
        description: formData.description || undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Asset created successfully");
      setIsAddAssetModalOpen(false);
      setAssetForm({ name: "", type: "hardware", serial_number: "", warranty_expiry: "", license_expiry: "", description: "" });
      refetchAssets();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create asset");
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const response = await api.delete(`/tenants/${selectedTenantId}/assets/${assetId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Asset removed successfully");
      setIsDeleteModalOpen(false);
      setSelectedAsset(null);
      refetchAssets();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to remove asset");
    },
  });

  const filteredAssets = useMemo(() => {
    return tenantAssets.filter((asset) => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.serial_number?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || asset.type.toLowerCase() === typeFilter.toLowerCase();
      
      let matchesStatus = true;
      if (statusFilter === 'available') {
        matchesStatus = asset.status === 'available';
      } else if (statusFilter === 'assigned') {
        matchesStatus = asset.status === 'assigned';
      }

      let matchesDomain = true;
      if (domainFilter !== "all") {
        matchesDomain = asset.assignedUsers?.some(u => u.email?.endsWith(`@${domainFilter}`)) || false;
      }
      
      return matchesSearch && matchesType && matchesStatus && matchesDomain;
    });
  }, [tenantAssets, searchQuery, typeFilter, statusFilter, domainFilter]);

  const filteredUsers = useMemo(() => {
    const filtered = tenantUsers.filter((user) => {
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const hasStuff = (user.license_name && user.license_name !== 'No License') || (user.assets_count && user.assets_count > 0);

      let matchesStatus = true;
      if (statusFilter === 'assigned_licenses') {
        matchesStatus = !!user.license_name && user.license_name !== 'No License';
      } else if (statusFilter === 'no_license') {
        matchesStatus = !user.license_name || user.license_name === 'No License';
      } else if (statusFilter === 'active_users') {
        matchesStatus = user.account_enabled === true;
      } else if (statusFilter === 'inactive_users') {
        matchesStatus = user.account_enabled === false;
      } else if (statusFilter === 'all') {
        // By default in "all" view, hide inactive users who have nothing assigned
        // to keep the list clean, UNLESS they match a search query
        if (user.account_enabled === false && !hasStuff && searchQuery === '') {
          matchesStatus = false;
        }
      }

      let matchesDomain = true;
      if (domainFilter !== "all") {
        matchesDomain = user.email?.endsWith(`@${domainFilter}`);
      }

      return matchesSearch && matchesStatus && matchesDomain;
    });

    return [...filtered].sort((a, b) => {
      const aHasStuff = (a.license_name && a.license_name !== 'No License') || (a.assets_count && a.assets_count > 0);
      const bHasStuff = (b.license_name && b.license_name !== 'No License') || (b.assets_count && b.assets_count > 0);

      const aInactiveRisk = a.account_enabled === false && aHasStuff;
      const bInactiveRisk = b.account_enabled === false && bHasStuff;

      if (aInactiveRisk && !bInactiveRisk) return -1;
      if (!aInactiveRisk && bInactiveRisk) return 1;
      return 0;
    });
  }, [tenantUsers, searchQuery, statusFilter, domainFilter]);

  const assetColumns = [
    {
      key: "name",
      header: "Asset Name",
      render: (asset: Asset) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {asset.type === 'hardware' ? <Laptop className="w-5 h-5 text-primary" /> : <Shield className="w-5 h-5 text-primary" />}
          </div>
          <div>
            <p className="font-semibold">{asset.name}</p>
            {asset.serial_number && <p className="text-xs text-muted-foreground">{asset.serial_number}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "assigned_to",
      header: "Assigned to",
      render: (asset: Asset) => {
        const user = asset.assignedUsers?.[0];
        if (user) {
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.profile_pic_url} alt={user.name} decoding="async" />
                <AvatarFallback className="text-[10px]">{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{user.name}</span>
            </div>
          );
        }
        return (
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary hover:bg-primary/5 h-8 px-2"
            onClick={() => {
              setSelectedAsset(asset);
              setIsAssignModalOpen(true);
            }}
          >
            <Plus className="w-3 h-3 mr-1" /> Assign
          </Button>
        );
      }
    },
    {
      key: "expiry",
      header: "Warranty/Expiry",
      render: (asset: Asset) => {
        const date = asset.type === 'hardware' ? asset.warranty_expiry : asset.license_expiry;
        if (!date) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            {format(new Date(date), "MMM d, yyyy")}
          </div>
        );
      }
    },
    {
      key: "status",
      header: "Status",
      render: (asset: Asset) => (
        <Badge variant={asset.status === "available" ? "success" : "secondary"} className="capitalize">
          {asset.status}
        </Badge>
      )
    },
    {
      key: "checklists",
      header: "Checklists",
      render: (asset: Asset) => {
        const user = asset.assignedUsers?.[0];
        if (!user) return <span className="text-muted-foreground text-xs">—</span>;

        const total = user.total_questions_count || 0;
        const completed = user.completed_questions_count || 0;

        if (total === 0) return <span className="text-muted-foreground text-xs">—</span>;

        const hasOnboarding = (user.onboarding_total_questions || 0) > 0;
        const hasInactive = (user.inactive_total_questions || 0) > 0;

        if (hasOnboarding || hasInactive) {
          return (
            <div className="flex items-center gap-2">
              {hasOnboarding && (
                <div
                  className="cursor-pointer group relative flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChecklistUserId(user.id);
                  }}
                  title="Step 1: Onboarding"
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all",
                    user.onboarding_completed_questions === user.onboarding_total_questions 
                      ? "bg-green-500 border-green-500 text-white" 
                      : "bg-background border-primary text-primary"
                  )}>
                    1
                  </div>
                  <div className="ml-2 hidden lg:flex flex-col">
                    <span className="text-[9px] font-bold uppercase leading-none opacity-60">Onboarding</span>
                    <span className="text-[10px] font-medium">{user.onboarding_completed_questions}/{user.onboarding_total_questions}</span>
                  </div>
                </div>
              )}

              {hasOnboarding && hasInactive && (
                <div className="flex items-center opacity-30">
                  <div className="h-[1px] w-3 bg-foreground" />
                  <ChevronRight className="w-3 h-3 -ml-1" />
                </div>
              )}

              {hasInactive && (
                <div
                  className="cursor-pointer group relative flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChecklistUserId(user.id);
                  }}
                  title="Step 2: Inactive"
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all",
                    user.inactive_completed_questions === user.inactive_total_questions 
                      ? "bg-green-500 border-green-500 text-white" 
                      : (user.inactive_total_questions > 0 ? "bg-background border-destructive text-destructive" : "bg-background border-muted text-muted-foreground")
                  )}>
                    2
                  </div>
                  <div className="ml-2 hidden lg:flex flex-col">
                    <span className="text-[9px] font-bold uppercase leading-none opacity-60">Inactive</span>
                    <span className="text-[10px] font-medium">{user.inactive_completed_questions}/{user.inactive_total_questions}</span>
                  </div>
                </div>
              )}
            </div>
          );
        }

        return (
          <div
            className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 p-1.5 px-2 rounded-md transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setChecklistUserId(user.id);
            }}
          >
            <ClipboardCheck className={cn(
              "w-4 h-4",
              completed === total ? "text-green-500" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-sm font-medium",
              completed === total ? "text-green-600" : "text-foreground"
            )}>{completed}/{total}</span>
          </div>
        );
      }
    },
    {
      key: "actions",
      header: "",
      render: (asset: Asset) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSelectedAsset(asset);
                setIsTransferModalOpen(true);
              }}
              disabled={asset.status !== 'assigned'}
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" /> Transfer Asset
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setSelectedAsset(asset);
                setIsDeleteModalOpen(true);
              }}
            >
              Remove Asset
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-10",
    },
  ];

  const userColumns = [
    {
      key: "name",
      header: "User",
      render: (user: DirectoryUser) => {
        const hasStuff = (user.license_name && user.license_name !== 'No License') || (user.assets_count && user.assets_count > 0);
        const isRisky = user.account_enabled === false && hasStuff;

        return (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.profile_pic_url} alt={user.name} decoding="async" />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {isRisky && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-background flex items-center justify-center">
                  <AlertCircle className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{user.name}</p>
                {user.account_enabled === false && (
                  <Badge variant="destructive" className="h-4 px-1 text-[10px] uppercase font-bold">Inactive</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "department",
      header: "Department",
      render: (user: DirectoryUser) => user.department || "—"
    },
    {
      key: "license",
      header: "M365 License",
      render: (user: DirectoryUser) => {
        const formatLicense = (name: string) => {
          if (!name || name === 'No License') return name || "No License";
          
          // Dictionary for common SKUs to show full names immediately without re-sync
          const skuMap: Record<string, string> = {
            'SPB': 'Microsoft 365 Business Premium',
            'BUSINESSPREMIUM': 'Microsoft 365 Business Premium',
            'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Basic',
            'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Standard',
            'STANDARDPACK': 'Microsoft 365 Business Standard',
            'BUSINESSBASIC': 'Microsoft 365 Business Basic',
            'POWER_BI_STANDARD': 'Power BI Pro',
            'POWER_BI_PRO': 'Power BI Pro',
          };

          const upperName = name.toUpperCase();
          if (skuMap[upperName]) return skuMap[upperName];

          // If it contains multiple licenses separated by comma
          if (name.includes(',')) {
            return name.split(',').map(n => formatLicense(n.trim())).join(', ');
          }

          // Fallback for unknown SKUs
          let formatted = name.replace(/_/g, ' ').replace(/-/g, ' ');
          
          // Simple heuristic: if it looks like a SKU (all caps with numbers/underscores)
          if (formatted === formatted.toUpperCase()) {
            formatted = formatted.toLowerCase().split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
          }
          
          return formatted;
        };

        return (
          <Badge variant="outline" className="font-normal">
            {formatLicense(user.license_name || "")}
          </Badge>
        );
      }
    },
    {
      key: "checklists",
      header: "Checklists",
      render: (user: DirectoryUser) => {
        const total = user.total_questions_count || 0;
        const completed = user.completed_questions_count || 0;

        if (total === 0) return <span className="text-muted-foreground text-xs">—</span>;

        const hasOnboarding = (user.onboarding_total_questions || 0) > 0;
        const hasInactive = (user.inactive_total_questions || 0) > 0;

        if (hasOnboarding || hasInactive) {
          return (
            <div className="flex items-center gap-2">
              {hasOnboarding && (
                <div
                  className="cursor-pointer group relative flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChecklistUserId(user.id);
                  }}
                  title="Step 1: Onboarding"
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all",
                    user.onboarding_completed_questions === user.onboarding_total_questions 
                      ? "bg-green-500 border-green-500 text-white" 
                      : "bg-background border-primary text-primary"
                  )}>
                    1
                  </div>
                  <div className="ml-2 hidden lg:flex flex-col">
                    <span className="text-[9px] font-bold uppercase leading-none opacity-60">Onboarding</span>
                    <span className="text-[10px] font-medium">{user.onboarding_completed_questions}/{user.onboarding_total_questions}</span>
                  </div>
                </div>
              )}

              {hasOnboarding && hasInactive && (
                <div className="flex items-center opacity-30">
                  <div className="h-[1px] w-3 bg-foreground" />
                  <ChevronRight className="w-3 h-3 -ml-1" />
                </div>
              )}

              {hasInactive && (
                <div
                  className="cursor-pointer group relative flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChecklistUserId(user.id);
                  }}
                  title="Step 2: Inactive"
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all",
                    user.inactive_completed_questions === user.inactive_total_questions 
                      ? "bg-green-500 border-green-500 text-white" 
                      : (user.inactive_total_questions > 0 ? "bg-background border-destructive text-destructive" : "bg-background border-muted text-muted-foreground")
                  )}>
                    2
                  </div>
                  <div className="ml-2 hidden lg:flex flex-col">
                    <span className="text-[9px] font-bold uppercase leading-none opacity-60">Inactive</span>
                    <span className="text-[10px] font-medium">{user.inactive_completed_questions}/{user.inactive_total_questions}</span>
                  </div>
                </div>
              )}
            </div>
          );
        }

        return (
          <div
            className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 p-1.5 px-2 rounded-md transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setChecklistUserId(user.id);
            }}
          >
            <ClipboardCheck className={cn(
              "w-4 h-4",
              completed === total ? "text-green-500" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-sm font-medium",
              completed === total ? "text-green-600" : "text-foreground"
            )}>{completed}/{total}</span>
          </div>
        );
      }
    },
    {
      key: "actions",
      header: "",
      render: (user: DirectoryUser) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => navigate(`/tenants/${selectedTenantId}/users/${user.id}/assets`)}
            title="Manage Assets"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setChecklistUserId(user.id)}>
                <ClipboardCheck className="w-4 h-4 mr-2" /> Open Checklists
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      className: "w-32",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asset Management</h1>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>Manage assets and user assignments</span>
            {selectedTenant?.last_sync_at && (
              <>
                <span className="text-muted-foreground/30">•</span>
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Last synced: {new Date(selectedTenant.last_sync_at).toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || !selectedTenantId}
            className="h-9 gap-2"
          >
            <Database className={syncMutation.isPending ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
            Sync Now
          </Button>

          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === "assets" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 shadow-none"
              onClick={() => setViewMode("assets")}
            >
              <LayoutGrid className="w-4 h-4 mr-2" /> Assets
            </Button>
            <Button
              variant={viewMode === "users" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 shadow-none"
              onClick={() => setViewMode("users")}
            >
              <UsersIcon className="w-4 h-4 mr-2" /> Users
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-3">
        {/* Statistics Cards */}
        <div className="flex flex-wrap gap-4 w-full">
          {derivedStats.used_licenses > 0 && (
            <div
              className={cn(
                "bg-card border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-teal-500/50 transition-colors min-w-[200px] flex-1",
                statusFilter === 'assigned_licenses' && "border-teal-500 bg-teal-500/5"
              )}
              onClick={() => { setStatusFilter('assigned_licenses'); setViewMode('users'); }}
            >
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Assigned Licenses</p>
                <p className="text-lg font-bold">{derivedStats.used_licenses}</p>
              </div>
            </div>
          )}

          {derivedStats.no_license_count > 0 && (
            <div
              className={cn(
                "bg-card border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-orange-500/50 transition-colors min-w-[200px] flex-1",
                statusFilter === 'no_license' && "border-orange-500 bg-orange-500/5"
              )}
              onClick={() => { setStatusFilter('no_license'); setViewMode('users'); }}
            >
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">No License</p>
                <p className="text-lg font-bold">{derivedStats.no_license_count}</p>
              </div>
            </div>
          )}

          <div
            className={cn(
              "bg-card border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-purple-500/50 transition-colors min-w-[200px] flex-1",
              viewMode === 'assets' && statusFilter === 'all' && "border-purple-500 bg-purple-500/5"
            )}
            onClick={() => { setStatusFilter('all'); setViewMode('assets'); }}
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Laptop className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Assets</p>
              <p className="text-lg font-bold">{derivedStats.asset_count}</p>
            </div>
          </div>

          {derivedStats.active_users > 0 && (
            <div
              className={cn(
                "bg-card border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-indigo-500/50 transition-colors min-w-[200px] flex-1",
                statusFilter === 'active_users' && "border-indigo-500 bg-indigo-500/5"
              )}
              onClick={() => { setStatusFilter('active_users'); setViewMode('users'); }}
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active Users</p>
                <p className="text-lg font-bold">{derivedStats.active_users}</p>
              </div>
            </div>
          )}

          {derivedStats.inactive_users > 0 && (
            <div
              className={cn(
                "bg-card border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-red-500/50 transition-colors min-w-[200px] flex-1",
                statusFilter === 'inactive_users' && "border-red-500 bg-red-500/5"
              )}
              onClick={() => { setStatusFilter('inactive_users'); setViewMode('users'); }}
            >
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Inactive Users</p>
                <p className="text-lg font-bold">{derivedStats.inactive_users}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={viewMode === "assets" ? "Search assets..." : "Search users..."}
              className="pl-9"
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {viewMode === "assets" && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="license">License</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                </SelectContent>
              </Select>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={statusFilter !== 'all' ? "secondary" : "outline"} size="icon" className="relative">
                  <Filter className="h-4 w-4" />
                  {statusFilter !== 'all' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filter By Status</div>
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  All Records
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setStatusFilter('assigned_licenses'); setViewMode('users'); }}>
                  <UserCheck className="w-4 h-4 mr-2 text-teal-500" /> Assigned Licenses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setStatusFilter('no_license'); setViewMode('users'); }}>
                  <AlertCircle className="w-4 h-4 mr-2 text-orange-500" /> No License
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setStatusFilter('active_users'); setViewMode('users'); }}>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-indigo-500" /> Active Users
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setStatusFilter('inactive_users'); setViewMode('users'); }}>
                  <XCircle className="w-4 h-4 mr-2 text-red-500" /> Inactive Users
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setStatusFilter('all'); setViewMode('assets'); }}>
                  <Laptop className="w-4 h-4 mr-2 text-purple-500" /> Total Assets
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Asset Status</div>
                <DropdownMenuItem onClick={() => { setStatusFilter('available'); setViewMode('assets'); }}>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Available Assets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setStatusFilter('assigned'); setViewMode('assets'); }}>
                  <Zap className="w-4 h-4 mr-2 text-blue-500" /> Assigned Assets
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {(statusFilter !== 'all' || typeFilter !== 'all' || searchQuery !== '' || domainFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setSearchQuery('');
                  setDomainFilter('all');
                }}
                className="h-9 px-2 text-muted-foreground"
              >
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}

            {viewMode === "assets" && (
              <Button variant="gradient" size="sm" onClick={() => setIsAddAssetModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Asset
              </Button>
            )}
          </div>
        </div>

        {uniqueDomains.length > 1 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
            <Button
              variant={domainFilter === "all" ? "secondary" : "outline"}
              size="sm"
              className="h-7 px-3 text-xs rounded-full"
              onClick={() => setDomainFilter("all")}
            >
              All Domains
            </Button>
            {uniqueDomains.map((domain) => (
              <Button
                key={domain}
                variant={domainFilter === domain ? "secondary" : "outline"}
                size="sm"
                className={cn(
                  "h-7 px-3 text-xs rounded-full",
                  domainFilter === domain && "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                )}
                onClick={() => setDomainFilter(domain)}
              >
                {domain}
              </Button>
            ))}
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <DataTable
            columns={viewMode === "assets" ? assetColumns : userColumns}
            data={viewMode === "assets" ? filteredAssets : filteredUsers}
            isLoading={viewMode === "assets" ? isLoadingAssets : isLoadingUsers}
            getRowClassName={(item: any) => {
              if (viewMode === "users") {
                const user = item as DirectoryUser;
                const hasStuff = (user.license_name && user.license_name !== 'No License') || (user.assets_count && user.assets_count > 0);
                if (user.account_enabled === false && hasStuff) {
                  return "bg-destructive/5 hover:bg-destructive/10 border-l-4 border-l-destructive";
                }
              }
              return "";
            }}
            emptyState={
              <EmptyState
                icon={viewMode === "assets" ? AlertCircle : User}
                title={!selectedTenantId ? "Select a tenant first" : `No ${viewMode} found`}
                description={!selectedTenantId ? "Choose a tenant from the dropdown above" : `Try adjusting your search or filters`}
              />
            }
          />
        </div>
      </div>

      {/* Legacy Add Asset Modal */}
      <Modal
        open={isAddAssetModalOpen}
        onOpenChange={setIsAddAssetModalOpen}
        title="Add New Asset"
        description="Create a new asset for this tenant"
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddAssetModalOpen(false);
                setAssetForm({ name: "", type: "hardware", serial_number: "", warranty_expiry: "", license_expiry: "", description: "" });
              }}
              disabled={addAssetMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={() => addAssetMutation.mutate(assetForm)}
              disabled={!assetForm.name || !selectedTenantId || addAssetMutation.isPending}
            >
              {addAssetMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
                </>
              ) : (
                "Create Asset"
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset-name">Asset Name *</Label>
              <Input
                id="asset-name"
                placeholder="e.g., Macbook Pro M1 13"
                value={assetForm.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm({ ...assetForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-type">Category *</Label>
              <Select value={assetForm.type} onValueChange={(value: string) => setAssetForm({ ...assetForm, type: value })}>
                <SelectTrigger id="asset-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="license">License</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serial-number">Serial Number</Label>
              <Input
                id="serial-number"
                placeholder="SN-123456"
                value={assetForm.serial_number}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm({ ...assetForm, serial_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{assetForm.type === 'software' || assetForm.type === 'license' ? 'License Expiry' : 'Warranty Expiry'}</Label>
              <Input
                type="date"
                value={assetForm.type === 'hardware' ? assetForm.warranty_expiry : assetForm.license_expiry}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm({
                  ...assetForm,
                  [assetForm.type === 'hardware' ? 'warranty_expiry' : 'license_expiry']: e.target.value
                })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Additional details..."
              value={assetForm.description}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm({ ...assetForm, description: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* Basic Assign Modal */}
      <Modal
        open={isAssignModalOpen}
        onOpenChange={setIsAssignModalOpen}
        title="Assign Asset"
        description={selectedAsset ? `Assign "${selectedAsset.name}" to a user` : "Assign an asset to this user"}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignModalOpen(false);
                setSelectedUser(null);
                setSelectedAsset(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={() => {
                if (selectedUser && selectedAsset) {
                  assignMutation.mutate({ userId: selectedUser.id, assetId: selectedAsset.id });
                }
              }}
              disabled={!selectedUser || !selectedAsset || assignMutation.isPending}
            >
              {assignMutation.isPending ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-4">
          <div className="p-3 border rounded-lg bg-muted/30">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Selected Asset</p>
            {selectedAsset ? (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedAsset.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedAsset.type}</p>
                </div>
              </div>
            ) : (
              <Popover open={isAssetComboboxOpen} onOpenChange={setIsAssetComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isAssetComboboxOpen}
                    className="w-full justify-between font-normal bg-background"
                  >
                    {selectedAsset ? selectedAsset.name : "Select an asset..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search assets..." />
                    <CommandList>
                      <CommandEmpty>No asset found.</CommandEmpty>
                      <CommandGroup>
                        {tenantAssets
                          .filter((a) => a.status === "available")
                          .map((asset) => (
                            <CommandItem
                              key={asset.id}
                              value={`${asset.name} ${asset.serial_number || ""}`}
                              onSelect={() => {
                                setSelectedAsset(asset);
                                setIsAssetComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedAsset?.id === asset.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{asset.name}</span>
                                {asset.serial_number && (
                                  <span className="text-[10px] text-muted-foreground">{asset.serial_number}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="p-3 border rounded-lg bg-muted/30">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Assign To User</p>
            {selectedUser ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedUser.profile_pic_url} alt={selectedUser.name} />
                  <AvatarFallback>{selectedUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedUser.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
            ) : (
              <Popover open={isUserComboboxOpen} onOpenChange={setIsUserComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isUserComboboxOpen}
                    className="w-full justify-between font-normal bg-background"
                  >
                    {selectedUser ? selectedUser.name : "Select a user..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {tenantUsers.map((u) => (
                          <CommandItem
                            key={u.id}
                            value={`${u.name} ${u.email}`}
                            onSelect={() => {
                              setSelectedUser(u);
                              setIsUserComboboxOpen(false);
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={u.profile_pic_url} />
                              <AvatarFallback className="text-[10px]">{u.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{u.name}</span>
                              <span className="text-[10px] text-muted-foreground">{u.email}</span>
                            </div>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedUser?.id === u.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </Modal>

      {/* Transfer Asset Modal */}
      <Modal
        open={isTransferModalOpen}
        onOpenChange={setIsTransferModalOpen}
        title="Transfer Asset"
        description={selectedAsset ? `Transfer "${selectedAsset.name}" to another user` : "Transfer asset to another user"}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsTransferModalOpen(false);
                setTargetUser(null);
                setSelectedAsset(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={() => {
                if (targetUser && selectedAsset) {
                  transferMutation.mutate({ assetId: selectedAsset.id, toUserId: targetUser.id });
                }
              }}
              disabled={!targetUser || !selectedAsset || transferMutation.isPending}
            >
              {transferMutation.isPending ? "Transferring..." : "Confirm Transfer"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-4">
          <div className="p-3 border rounded-lg bg-muted/30">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Asset to Transfer</p>
            {selectedAsset && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ArrowRightLeft className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedAsset.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedAsset.serial_number ? `SN: ${selectedAsset.serial_number}` : selectedAsset.type}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border rounded-lg bg-muted/30">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Current Owner</p>
            {selectedAsset?.assignedUsers?.[0] ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedAsset.assignedUsers[0].profile_pic_url} />
                  <AvatarFallback>{selectedAsset.assignedUsers[0].name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{selectedAsset.assignedUsers[0].name}</p>
                  <p className="text-xs text-muted-foreground">{selectedAsset.assignedUsers[0].email}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No current owner</p>
            )}
          </div>

          <div className="p-3 border rounded-lg bg-primary/5 border-primary/20">
            <p className="text-xs font-semibold uppercase text-primary/70 mb-2">Transfer To</p>
            <Popover open={isTransferComboboxOpen} onOpenChange={setIsTransferComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isTransferComboboxOpen}
                  className="w-full justify-between font-normal bg-background"
                >
                  {targetUser ? targetUser.name : "Select new owner..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search users..." />
                  <CommandList>
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup>
                      {tenantUsers
                        .filter(u => u.id !== selectedAsset?.assignedUsers?.[0]?.id)
                        .map((u) => (
                          <CommandItem
                            key={u.id}
                            value={`${u.name} ${u.email}`}
                            onSelect={() => {
                              setTargetUser(u);
                              setIsTransferComboboxOpen(false);
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={u.profile_pic_url} />
                              <AvatarFallback className="text-[10px]">{u.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{u.name}</span>
                              <span className="text-[10px] text-muted-foreground">{u.email}</span>
                            </div>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                targetUser?.id === u.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Remove Asset"
        description={`Are you sure you want to remove "${selectedAsset?.name}"? This action cannot be undone and will remove all assignment history.`}
        onConfirm={() => selectedAsset && deleteAssetMutation.mutate(selectedAsset.id)}
        variant="destructive"
        confirmLabel={deleteAssetMutation.isPending ? "Removing..." : "Remove Asset"}
      />

      <ChecklistFillModal
        open={!!checklistUserId}
        onOpenChange={(open) => {
          if (!open) {
            setChecklistUserId(null);
            refetchUsers();
          }
        }}
        userId={checklistUserId || ""}
      />
    </div>
  );
}
