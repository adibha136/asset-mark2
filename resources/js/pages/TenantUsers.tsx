import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { Search, Mail, User, ArrowLeft, RefreshCw, Shield, Database, MoreHorizontal, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChecklistFillModal } from "@/components/checklist/ChecklistFillModal";

interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  profile_pic_url?: string;
  license_name: string;
  status: 'active' | 'inactive';
  phone?: string;
  mobile_phone?: string;
  department?: string;
  office_location?: string;
  job_title?: string;
  pending_checklists_count?: number;
}

interface Tenant {
  id: string;
  name: string;
  auto_directory_sync?: boolean;
  last_sync_at?: string;
}

export default function TenantUsers() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'live' | 'database'>('database');

  // Checklist State
  const [checklistUserId, setChecklistUserId] = useState<string | null>(null);

  const { data: tenant, refetch: refetchTenant } = useQuery<Tenant>({
    queryKey: ["tenants", id],
    queryFn: async () => {
      const response = await api.get(`/tenants/${id}`);
      return response.data;
    },
  });

  const { data: liveUsers = [], isLoading: isLoadingLive, refetch: refetchLive, isRefetching: isRefetchingLive } = useQuery<DirectoryUser[]>({
    queryKey: ["tenants", id, "users-live"],
    queryFn: async () => {
      const response = await api.get(`/tenants/${id}/users`);
      return response.data.map((u: any) => ({
        ...u,
        avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`,
      }));
    },
    enabled: !!id && viewMode === 'live',
  });

  const { data: dbUsers = [], isLoading: isLoadingDb, refetch: refetchDb, isRefetching: isRefetchingDb } = useQuery<DirectoryUser[]>({
    queryKey: ["tenants", id, "directory-users"],
    queryFn: async () => {
      const response = await api.get(`/tenants/${id}/directory-users`);
      return response.data.map((u: any) => ({
        ...u,
        avatar: u.profile_pic_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`,
        status: u.account_enabled ? 'active' : 'inactive',
      }));
    },
    enabled: !!id && viewMode === 'database',
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/tenants/${id}/sync-directory`);
      return response.data;
    },
    onSuccess: () => {
      refetchDb();
      refetchTenant();
      setViewMode('database');
    },
  });

  const autoSyncMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await api.post(`/tenants/${id}/auto-sync`, {
        auto_directory_sync: enabled,
      });
      return response.data;
    },
    onSuccess: () => {
      refetchTenant();
    },
  });

  const users = viewMode === 'live' ? liveUsers : dbUsers;
  const isLoading = viewMode === 'live' ? isLoadingLive : isLoadingDb;
  const isRefetching = viewMode === 'live' ? isRefetchingLive : isRefetchingDb;
  const refetch = viewMode === 'live' ? refetchLive : refetchDb;

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: "name",
      header: "User",
      render: (user: DirectoryUser) => (
        <div 
          className="flex items-center gap-3 cursor-pointer hover:text-primary transition-colors group"
          onClick={() => navigate(`/tenants/${id}/users/${user.id}/assets`)}
        >
          <Avatar className="w-10 h-10 rounded-lg group-hover:ring-2 group-hover:ring-primary/20 transition-all">
            <AvatarImage src={user.avatar} loading="lazy" decoding="async" />
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.name}</p>
            {user.job_title && <p className="text-xs text-muted-foreground">{user.job_title}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (user: DirectoryUser) => (
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{user.email}</span>
        </div>
      ),
    },
    ...(viewMode === 'database' ? [{
      key: "department",
      header: "Department",
      render: (user: DirectoryUser) => (
        <span className="text-sm">{user.department || '-'}</span>
      ),
    }] : []),
    ...(viewMode === 'database' ? [{
      key: "phone",
      header: "Phone",
      render: (user: DirectoryUser) => (
        <span className="text-sm">{user.phone || user.mobile_phone || '-'}</span>
      ),
    }] : []),
    {
      key: "license_name",
      header: "License",
      render: (user: DirectoryUser) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] py-0 px-2">
            {user.license_name}
          </Badge>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (user: DirectoryUser) => (
        <Badge className={user.status === 'active' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'} variant="outline">
          {user.status === 'active' ? '✓ Active' : '✕ Inactive'}
        </Badge>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: () => (
        <Badge variant="info" className="gap-1">
          <Shield className="w-3 h-3" /> {viewMode === 'live' ? 'Graph' : 'Database'}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (user: DirectoryUser) => (
        <div className="flex items-center gap-2">
          {user.pending_checklists_count && user.pending_checklists_count > 0 ? (
            <Button
              size="sm"
              className="h-8 gap-1 bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => setChecklistUserId(user.id)}
            >
              <ClipboardCheck className="w-3 h-3" /> Fill ({user.pending_checklists_count})
            </Button>
          ) : null}
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
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-0 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Directory Users</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-muted-foreground text-sm">
              <span>{viewMode === 'live' ? 'Live users from' : 'Synced users from'} <span className="font-semibold text-foreground">{tenant?.name}</span></span>
              {tenant?.last_sync_at && (
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-muted-foreground/30">•</span>
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Last synced: {new Date(tenant.last_sync_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant={tenant?.auto_directory_sync ? 'default' : 'outline'}
            onClick={() => autoSyncMutation.mutate(!tenant?.auto_directory_sync)}
            disabled={autoSyncMutation.isPending}
            className="gap-2 text-xs"
            size="sm"
          >
            {tenant?.auto_directory_sync ? '✓ Auto-Sync ON' : 'Auto-Sync OFF'}
          </Button>

          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={isLoading || syncMutation.isPending}
            className="gap-2"
          >
            <Database className={syncMutation.isPending ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
            Sync Now
          </Button>

          {dbUsers.length > 0 && (
            <Button
              variant={viewMode === 'database' ? 'default' : 'outline'}
              onClick={() => setViewMode(viewMode === 'live' ? 'database' : 'live')}
              className="gap-2"
            >
              {viewMode === 'live' ? 'View DB' : 'View Live'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="gap-2"
          >
            <RefreshCw className={isRefetching ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="relative max-w-md opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search directory users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
        <DataTable
          columns={columns}
          data={filteredUsers}
          isLoading={isLoading}
        />
      </div>

      <ChecklistFillModal
        open={!!checklistUserId}
        onOpenChange={(open) => !open && setChecklistUserId(null)}
        userId={checklistUserId || ""}
      />
    </div>
  );
}
