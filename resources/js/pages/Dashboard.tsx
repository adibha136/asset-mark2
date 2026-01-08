import { Package, Building2, Users, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

export default function Dashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await api.get("/dashboard/stats");
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
      <div className="opacity-0 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your asset management system.
        </p>
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
