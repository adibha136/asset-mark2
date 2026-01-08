import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  Plus, Loader2, ArrowLeft, Check, ChevronsUpDown,
  Laptop, Shield, Calendar, ArrowRightLeft, UserMinus,
  Activity, Fingerprint, Clock, Globe, FileText, Share2,
  Key, ShieldCheck, Mail, Building2, MapPin, ExternalLink,
  Briefcase, Settings2, History, FileStack, Phone, Trash2,
  AlertCircle, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Modal } from "@/components/shared/Modal";
import { toast } from "sonner";
import { format } from "date-fns";

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
  office_location?: string;
  account_enabled?: boolean;
  assets_count?: number;
  onboarding_total_questions?: number;
  onboarding_completed_questions?: number;
  inactive_total_questions?: number;
  inactive_completed_questions?: number;
  total_questions_count?: number;
  completed_questions_count?: number;
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

export default function ManageUserAssets() {
  const { tenantId, userId } = useParams<{ tenantId: string; userId: string }>();
  const navigate = useNavigate();

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [targetUser, setTargetUser] = useState<DirectoryUser | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const [assetForm, setAssetForm] = useState({
    name: "",
    type: "hardware",
    serial_number: "",
    warranty_expiry: "",
    license_expiry: "",
    description: "",
  });

  const { data: userData, refetch: refetchUserAssets } = useQuery({
    queryKey: ["user-assets", userId],
    queryFn: async () => {
      const response = await api.get(`/directory-users/${userId}/assets`);
      return response.data;
    },
    enabled: !!userId,
  });

  const { data: activityData, isLoading: isLoadingActivity } = useQuery({
    queryKey: ["user-activity", userId],
    queryFn: async () => {
      const response = await api.get(`/directory-users/${userId}/activity`);
      return response.data;
    },
    enabled: !!userId,
  });

  const { data: tenantAssets = [], refetch: refetchAssets } = useQuery<Asset[]>({
    queryKey: ["assets", tenantId],
    queryFn: async () => {
      const response = await api.get(`/tenants/${tenantId}/assets`);
      return response.data;
    },
    enabled: !!tenantId && isAssignModalOpen,
  });

  const { data: tenantUsers = [] } = useQuery<DirectoryUser[]>({
    queryKey: ["users", tenantId],
    queryFn: async () => {
      const response = await api.get(`/tenants/${tenantId}/directory-users`);
      return response.data;
    },
    enabled: !!tenantId && (isTransferModalOpen || isAssignModalOpen),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ assetId }: { assetId: string }) => {
      const response = await api.post(`/tenants/${tenantId}/assign-asset`, {
        user_id: userId,
        asset_id: assetId,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Asset assigned successfully");
      setIsAssignModalOpen(false);
      refetchAssets();
      refetchUserAssets();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to assign asset");
    },
  });

  const quickAssignMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/tenants/${tenantId}/quick-assign`, {
        user_id: userId,
        ...data
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Asset created and assigned");
      setAssetForm({ name: "", type: "hardware", serial_number: "", warranty_expiry: "", license_expiry: "", description: "" });
      setIsAssignModalOpen(false);
      refetchAssets();
      refetchUserAssets();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to assign asset");
    }
  });

  const transferMutation = useMutation({
    mutationFn: async ({ assetId, toUserId }: { assetId: string; toUserId: string }) => {
      const response = await api.post(`/tenants/${tenantId}/transfer-asset`, {
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
      refetchUserAssets();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to transfer asset");
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async ({ assetId }: { assetId: string }) => {
      const response = await api.post(`/tenants/${tenantId}/unassign-asset`, {
        asset_id: assetId,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Asset unassigned successfully");
      refetchAssets();
      refetchUserAssets();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to unassign asset");
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/directory-users/${userId}/sync`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Identity profile refreshed from M365");
      refetchUserAssets();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to sync profile");
    },
  });

  const user = userData?.user;
  const assignedAssets = userData?.assigned_assets || [];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl border hover:bg-muted/50">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em]">Governance Dashboard</h1>
            <p className="text-2xl font-bold tracking-tight">User Identity & Asset Control</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="rounded-xl font-bold text-[10px] uppercase tracking-widest h-10 px-4 border-primary/20 text-primary bg-primary/5 hover:bg-primary/10"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 mr-2", syncMutation.isPending && "animate-spin")} />
          Refresh Identity
        </Button>
      </div>

      {/* Premium Identity Card */}
      <div className="bg-card border rounded-[2rem] p-8 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full -mr-48 -mt-48 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full -ml-32 -mb-32 blur-[80px] pointer-events-none" />

        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-10">
          {/* Left: Identity Section */}
          <div className="flex items-center gap-8">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-blue-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <Avatar className="h-32 w-32 border-8 border-background shadow-2xl relative rounded-[2.2rem]">
                <AvatarImage src={user?.profile_pic_url} className="object-cover" decoding="async" />
                <AvatarFallback className="text-4xl font-bold bg-primary/5 text-primary rounded-[2.2rem]">
                  {user?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-green-500 border-4 border-background flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-4xl font-black tracking-tight text-foreground">{user?.name}</h2>
                  <Badge className={cn(
                    "border-none font-black text-[10px] uppercase tracking-widest h-6 px-3",
                    user?.account_enabled ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                  )}>
                    {user?.account_enabled ? "Active" : "Inactive"}
                  </Badge>
                  {((user?.onboarding_total_questions || 0) > 0) && (
                    <Badge variant="outline" className={cn(
                      "font-black text-[10px] uppercase tracking-widest h-6 px-3",
                      user?.onboarding_completed_questions === user?.onboarding_total_questions ? "border-green-500/50 text-green-600 bg-green-500/5" : "border-primary/20 text-primary bg-primary/5"
                    )}>
                      Onboarding: {user?.onboarding_completed_questions}/{user?.onboarding_total_questions}
                    </Badge>
                  )}
                  {((user?.inactive_total_questions || 0) > 0) && (
                    <Badge variant="outline" className={cn(
                      "font-black text-[10px] uppercase tracking-widest h-6 px-3",
                      user?.inactive_completed_questions === user?.inactive_total_questions ? "border-green-500/50 text-green-600 bg-green-500/5" : "border-destructive/50 text-destructive bg-destructive/5"
                    )}>
                      Inactive: {user?.inactive_completed_questions}/{user?.inactive_total_questions}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  {user?.job_title || "Enterprise Infrastructure Lead"}
                </p>
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2.5 text-sm font-bold text-muted-foreground/80 hover:text-primary transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  {user?.email}
                </div>

                <div className="flex items-center gap-2.5 text-sm font-bold text-muted-foreground/80 hover:text-primary transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  {user?.mobile_phone || user?.phone || "+1 (555) 000-0000"}
                </div>

                {user?.department && (
                  <div className="flex items-center gap-2.5 text-sm font-bold text-muted-foreground/80">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    {user.department}
                  </div>
                )}
                {user?.office_location && (
                  <div className="flex items-center gap-2.5 text-sm font-bold text-muted-foreground/80">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    {user.office_location}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Middle: Stats Metric Row */}
          <div className="flex items-center gap-4 p-2 bg-muted/30 rounded-[2rem] border border-border/50 backdrop-blur-md">
            <div className="flex items-center gap-8 px-8 py-4">
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assets</p>
                <p className="text-3xl font-black text-foreground tabular-nums">
                  {assignedAssets.filter((a: any) => a.type !== 'access').length}
                </p>
              </div>
              <div className="w-px h-12 bg-border/60" />
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Privileges</p>
                <p className="text-3xl font-black text-foreground tabular-nums">
                  {assignedAssets.filter((a: any) => a.type === 'access').length}
                </p>
              </div>
              <div className="w-px h-12 bg-border/60" />
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">M365 Apps</p>
                <p className="text-3xl font-black text-foreground tabular-nums">{activityData?.app_access?.length || 0}</p>
              </div>
              <div className="w-px h-12 bg-border/60" />
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">License</p>
                <div className="text-3xl font-black tabular-nums h-9 flex items-center justify-center text-foreground">
                  {user?.license_name && user?.license_name !== 'No License' ? "1" : "0"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Timeline & Governance (4 cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          {/* Authentication Timeline */}
          <div className="bg-card border rounded-[2rem] p-8 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black tracking-tight">Access Timeline</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Recent Security Events</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
                <History className="w-5 h-5 text-primary" />
              </div>
            </div>

            <div className="space-y-8 relative before:absolute before:inset-0 before:left-[15px] before:w-px before:bg-gradient-to-b before:from-primary/20 before:via-border before:to-transparent">
              {isLoadingActivity ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fetching Signals...</p>
                </div>
              ) : activityData?.activity?.length > 0 ? (
                activityData.activity.slice(0, 5).map((log: any, i: number) => (
                  <div key={i} className="relative pl-10 group/item">
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-xl bg-background border-2 border-primary/20 flex items-center justify-center z-10 group-hover/item:border-primary transition-colors">
                      <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        log.status?.errorCode === 0 ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                      )} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black tracking-tight truncate max-w-[150px]">{log.appDisplayName || 'System Access'}</p>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          {log.createdDateTime ? format(new Date(log.createdDateTime), "h:mm aa") : "N/A"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">{log.location?.city || 'Remote Location'} • {log.ipAddress}</p>
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest mt-1",
                        log.status?.errorCode === 0 ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-700"
                      )}>
                        <div className={cn("w-1 h-1 rounded-full", log.status?.errorCode === 0 ? "bg-green-500" : "bg-red-500")} />
                        {log.status?.errorCode === 0 ? "Success" : "Failed"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No Recent Activity</p>
                </div>
              )}
            </div>

            <Button variant="ghost" className="w-full mt-8 rounded-xl font-bold text-[10px] uppercase tracking-widest h-10 border border-dashed hover:bg-primary/5 hover:border-primary/50 transition-all">
              View Full Security Log
            </Button>
          </div>

          {/* Manual Access Rights / Privilege Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Manual Privileges</h3>
              <Badge className="bg-primary/10 text-primary border-none font-bold text-[10px]">
                {assignedAssets.filter((a: any) => a.type === 'access').length} Active
              </Badge>
            </div>

            <div className="grid gap-4">
              {assignedAssets.filter((a: any) => a.type === 'access').map((asset: any) => (
                <div key={asset.id} className="group bg-card border rounded-2xl p-5 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-colors" />

                  <div className="flex items-start gap-4 relative">
                    <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 shadow-inner group-hover:scale-110 transition-transform">
                      <Key className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-base tracking-tight">{asset.name}</p>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                            onClick={() => {
                              if (confirm(`Revoke ${asset.name} access?`)) {
                                unassignMutation.mutate({ assetId: asset.id });
                              }
                            }}
                            disabled={unassignMutation.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <Settings2 className="w-4 h-4 text-muted-foreground/40 hover:text-primary cursor-pointer transition-colors" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium line-clamp-1">{asset.description || 'Elevated permissions assigned manually'}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="px-2.5 py-1 rounded-lg bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/10">
                          High Trust
                        </div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                          Added {asset.created_at ? format(new Date(asset.created_at), "MMM yyyy") : "Recently"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                className="w-full h-16 rounded-2xl border-dashed border-2 hover:bg-primary/5 hover:border-primary/50 transition-all group"
                onClick={() => setIsAssignModalOpen(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs uppercase tracking-widest">Grant New Privilege</span>
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Access Profile (8 cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Microsoft 365 Deep Signals */}
          <div className="bg-card border rounded-[2rem] p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Globe className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">M365 Cloud Signals</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Directory & Collaboration Intelligence</p>
                </div>
              </div>
              <Badge className="bg-blue-500/10 text-blue-700 border-none font-black text-[10px] uppercase tracking-widest h-8 px-4 rounded-xl">Synced 5m ago</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Directory Roles */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1 text-center md:text-left">Directory Roles</h4>
                <div className="space-y-3">
                  {activityData?.app_access?.length > 0 ? (
                    activityData.app_access.map((app: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-transparent hover:border-border hover:bg-muted/50 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border group-hover:scale-110 transition-transform">
                            <Fingerprint className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-sm tracking-tight">{app.app_name}</p>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{app.role_name}</p>
                          </div>
                        </div>
                        <ArrowRightLeft className="w-4 h-4 text-muted-foreground/30" />
                      </div>
                    ))
                  ) : (
                    <div className="p-8 border-2 border-dashed rounded-2xl text-center">
                      <p className="text-xs font-bold text-muted-foreground">No custom directory roles</p>
                    </div>
                  )}
                </div>
              </div>

              {/* SharePoint Intelligence */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1 text-center md:text-left">SharePoint Memberships</h4>
                <div className="space-y-3">
                  {activityData?.sharepoint?.sites?.length > 0 ? (
                    activityData.sharepoint.sites.map((site: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-transparent hover:border-border hover:bg-muted/50 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border group-hover:scale-110 transition-transform">
                            <Share2 className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-bold text-sm tracking-tight">{site.site_name}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{site.role}</p>
                          </div>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      </div>
                    ))
                  ) : (
                    <div className="p-8 border-2 border-dashed rounded-2xl text-center">
                      <p className="text-xs font-bold text-muted-foreground">No collaborative site access</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed / Recent Documents */}
          <div className="bg-card border rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <FileStack className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">Recent Activity Feed</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Cross-Platform Asset Interaction</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl font-bold text-[10px] uppercase tracking-widest">
                Analytics Report
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activityData?.sharepoint?.recent_files?.slice(0, 4).map((file: any, idx: number) => (
                <div key={idx} className="group flex items-center gap-4 p-4 rounded-2xl border border-transparent hover:border-border hover:bg-muted/30 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate tracking-tight">{file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        {file.last_accessed ? format(new Date(file.last_accessed), "MMM d, h:mm aa") : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors cursor-pointer" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Bottom Section: Inventory Table */}
      <div className="bg-card border rounded-[2rem] p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black tracking-tight">Enterprise Asset Inventory</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Full Hardware & Software Deployment</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="rounded-xl font-bold text-[10px] uppercase tracking-widest h-10 px-6 shadow-lg shadow-primary/20"
              onClick={() => setIsAssignModalOpen(true)}
            >
              New Deployment
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-muted/5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border/60">
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Asset Details</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Identifier</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Lifecycle</th>
                <th className="px-6 py-5 text-right text-[10px] font-black text-muted-foreground uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {assignedAssets.filter((a: any) => a.type !== 'access').map((asset: any) => (
                <tr key={asset.id} className="group hover:bg-background/80 transition-all cursor-default">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-background border border-border/50 flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:scale-110 group-hover:rotate-3 transition-all shadow-sm">
                        {asset.type === 'hardware' ? <Laptop className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-black text-sm tracking-tight">{asset.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{asset.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="inline-flex items-center gap-2 bg-muted px-3 py-1.5 rounded-xl border border-border/40">
                      <Fingerprint className="w-3 h-3 text-primary/50" />
                      <code className="text-[10px] font-black tracking-wider">
                        {asset.serial_number || 'INTERNAL-ID'}
                      </code>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-green-700/80">Active Node</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-foreground">
                        {asset.warranty_expiry || asset.license_expiry ? format(new Date(asset.warranty_expiry || asset.license_expiry), "MMM d, yyyy") : 'Perpetual'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => {
                          setSelectedAsset(asset);
                          setIsTransferModalOpen(true);
                        }}
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                        onClick={() => {
                          if (confirm(`Remove ${asset.name} assignment?`)) {
                            unassignMutation.mutate({ assetId: asset.id });
                          }
                        }}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {assignedAssets.filter((a: any) => a.type !== 'access').length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-[2rem] bg-muted/50 flex items-center justify-center border-2 border-dashed">
                        <Laptop className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Inventory Empty</p>
                        <p className="text-xs text-muted-foreground/60">No primary assets are currently tracked for this node.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profile_pic_url} />
                <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="p-3 border rounded-lg bg-primary/5 border-primary/20">
            <p className="text-xs font-semibold uppercase text-primary/70 mb-2">Transfer To</p>
            <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isComboboxOpen}
                  className="w-full justify-between bg-background"
                >
                  {targetUser ? (
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={targetUser.profile_pic_url} />
                        <AvatarFallback className="text-[10px]">{targetUser.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{targetUser.name}</span>
                    </div>
                  ) : (
                    "Select new owner..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search users..." />
                  <CommandList>
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-y-auto">
                      {tenantUsers
                        .filter(u => u.id !== userId)
                        .map((u) => (
                          <CommandItem
                            key={u.id}
                            value={`${u.name} ${u.email}`}
                            onSelect={() => {
                              setTargetUser(u);
                              setIsComboboxOpen(false);
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

      {/* Assign Asset Modal */}
      <Modal
        open={isAssignModalOpen}
        onOpenChange={setIsAssignModalOpen}
        title="Deploy New Asset"
        description="Assign existing inventory or provision new assets"
        size="lg"
      >
        <div className="py-2 space-y-6">
          <Tabs defaultValue="inventory" className="w-full">
            <div className="flex items-center justify-between mb-6 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
              <TabsList className="grid w-full grid-cols-2 bg-transparent gap-1 border-none shadow-none">
                <TabsTrigger
                  value="inventory"
                  className="rounded-xl font-black text-[10px] uppercase tracking-widest h-10 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md transition-all"
                >
                  Select from Inventory
                </TabsTrigger>
                <TabsTrigger
                  value="manual"
                  className="rounded-xl font-black text-[10px] uppercase tracking-widest h-10 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md transition-all"
                >
                  Manual Entry
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="inventory" className="mt-0 focus-visible:outline-none outline-none">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Available Nodes</p>
                  </div>
                  <Badge variant="outline" className="rounded-full border-primary/20 text-primary font-black text-[9px] bg-primary/5 px-3 py-0.5">
                    {tenantAssets.filter(a => a.status === 'available').length} Units
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar p-1">
                  {tenantAssets.filter(a => a.status === 'available').length > 0 ? (
                    tenantAssets.filter(a => a.status === 'available').map(asset => (
                      <div
                        key={asset.id}
                        className="group relative flex flex-col p-5 border rounded-[1.5rem] hover:shadow-2xl hover:shadow-primary/10 transition-all bg-card hover:border-primary/30 cursor-default overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-colors" />

                        <div className="flex items-start justify-between mb-4 relative">
                          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            {asset.type === 'hardware' ? <Laptop className="w-6 h-6 text-primary" /> : <Shield className="w-6 h-6 text-primary" />}
                          </div>
                          <Button
                            size="sm"
                            className="rounded-xl text-[9px] font-black uppercase tracking-widest px-4 h-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 opacity-0 group-hover:opacity-100 transition-all duration-300"
                            onClick={() => assignMutation.mutate({ assetId: asset.id })}
                            disabled={assignMutation.isPending}
                          >
                            {assignMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Deploy'}
                          </Button>
                        </div>

                        <div className="space-y-1 relative">
                          <p className="text-sm font-black tracking-tight line-clamp-1 group-hover:text-primary transition-colors">{asset.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{asset.serial_number || 'No Serial'}</p>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">{asset.type}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-1 md:col-span-2 py-12 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 bg-muted/20">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                        <FileStack className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Inventory Exhausted</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="mt-0 focus-visible:outline-none outline-none">
              <div className="bg-muted/20 border rounded-[2rem] p-8 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                  <div className="space-y-3">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Asset Identity</Label>
                    <div className="relative group">
                      <Input
                        placeholder="e.g. MacBook Pro, VPN"
                        value={assetForm.name}
                        onChange={e => setAssetForm({ ...assetForm, name: e.target.value })}
                        className="rounded-2xl h-12 text-sm bg-background border-border/50 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all pl-11"
                      />
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Reference / SN</Label>
                    <div className="relative group">
                      <Input
                        placeholder="SN-XXXX"
                        value={assetForm.serial_number}
                        onChange={e => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                        className="rounded-2xl h-12 text-sm bg-background border-border/50 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all pl-11"
                      />
                      <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Classification</Label>
                    <Select value={assetForm.type} onValueChange={v => setAssetForm({ ...assetForm, type: v })}>
                      <SelectTrigger className="rounded-2xl h-12 text-sm bg-background border-border/50 focus-visible:ring-primary/20 transition-all px-4">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border/50 p-2">
                        <SelectItem value="hardware" className="rounded-xl mb-1 cursor-pointer">Hardware</SelectItem>
                        <SelectItem value="software" className="rounded-xl mb-1 cursor-pointer">Software</SelectItem>
                        <SelectItem value="access" className="rounded-xl cursor-pointer">Manual Access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Termination Date</Label>
                    <div className="relative group">
                      <Input
                        type="date"
                        value={assetForm.type === 'hardware' ? assetForm.warranty_expiry : assetForm.license_expiry}
                        onChange={e => setAssetForm({
                          ...assetForm,
                          [assetForm.type === 'hardware' ? 'warranty_expiry' : 'license_expiry']: e.target.value
                        })}
                        className="rounded-2xl h-12 text-sm bg-background border-border/50 focus-visible:ring-primary/20 transition-all px-4"
                      />
                    </div>
                  </div>
                  <div className="space-y-3 col-span-2">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Operational Context</Label>
                    <Input
                      placeholder="Additional details regarding this deployment..."
                      value={assetForm.description}
                      onChange={e => setAssetForm({ ...assetForm, description: e.target.value })}
                      className="rounded-2xl h-12 text-sm bg-background border-border/50 focus-visible:ring-primary/20 transition-all px-4"
                    />
                  </div>
                </div>

                <Button
                  className="w-full rounded-[1.5rem] h-14 font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 mt-4 group transition-all"
                  onClick={() => quickAssignMutation.mutate(assetForm)}
                  disabled={quickAssignMutation.isPending || !assetForm.name}
                >
                  {quickAssignMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                  )}
                  Confirm Deployment
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Modal>
    </div>
  );
}
