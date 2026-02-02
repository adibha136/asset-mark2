import { useState } from "react";
import { Package, Building2, Users, RefreshCw, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>("all");

  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const response = await api.get("/tenants");
      return response.data;
    },
  });

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboard-stats", selectedTenantId],
    queryFn: async () => {
      const params = selectedTenantId !== "all" ? { tenant_id: selectedTenantId } : {};
      const response = await api.get("/dashboard/stats", { params });
      return response.data;
    },
  });

  const stats = [
    {
      title: "Total Assets",
      value: dashboardData?.totalAssets?.value || "0",
      change: dashboardData?.totalAssets?.change || "---",
      changeType: (dashboardData?.totalAssets?.changeType || "neutral") as "positive" | "negative" | "neutral",
      icon: Package,
      gradient: "primary" as const,
    },
    {
      title: "Active Tenants",
      value: dashboardData?.activeTenants?.value || "0",
      change: dashboardData?.activeTenants?.change || "---",
      changeType: (dashboardData?.activeTenants?.changeType || "neutral") as "positive" | "negative" | "neutral",
      icon: Building2,
      gradient: "accent" as const,
    },
    {
      title: "Total Users",
      value: dashboardData?.totalUsers?.value || "0",
      change: dashboardData?.totalUsers?.change || "---",
      changeType: (dashboardData?.totalUsers?.changeType || "neutral") as "positive" | "negative" | "neutral",
      icon: Users,
      gradient: "success" as const,
      extraInfo: (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase">Active</span>
            <span className="text-xs font-semibold text-success">{dashboardData?.totalUsers?.active || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase">Inactive</span>
            <span className="text-xs font-semibold text-destructive">{dashboardData?.totalUsers?.inactive || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase">Licensed</span>
            <span className="text-xs font-semibold text-primary">{dashboardData?.totalUsers?.licensed || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase">Unlicensed</span>
            <span className="text-xs font-semibold text-warning">{dashboardData?.totalUsers?.unlicensed || 0}</span>
          </div>
        </div>
      )
    },
    {
      title: "Sync Status",
      value: dashboardData?.syncStatus?.value || "Inactive",
      change: dashboardData?.syncStatus?.change || "---",
      changeType: (dashboardData?.syncStatus?.changeType || "neutral") as "positive" | "negative" | "neutral",
      icon: RefreshCw,
      gradient: "warning" as const,
    },
  ];

  if (isLoading) return <div className="p-8 text-center">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-0 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your asset management system.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Filter by Tenant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              {tenants?.map((tenant: any) => (
                <SelectItem key={tenant.id} value={tenant.id.toString()}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.title}
            {...stat}
            delay={index * 100}
          />
        ))}
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnalyticsChart data={dashboardData?.growthData} />
        </div>
        <div className="lg:col-span-1">
          <RecentActivity activities={dashboardData?.activities} />
        </div>
      </div>
    </div>
  );
}
