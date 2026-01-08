import { Package, User, Building2, RefreshCw, Settings, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string | number;
  type: string;
  icon?: LucideIcon;
  title: string;
  description: string;
  time: string;
  color: string;
}

const iconMap: Record<string, LucideIcon> = {
  asset: Package,
  user: User,
  sync: RefreshCw,
  tenant: Building2,
  settings: Settings,
};

const defaultActivities: ActivityItem[] = [
  {
    id: 1,
    type: "asset",
    icon: Package,
    title: "New asset registered",
    description: 'MacBook Pro 16" added to inventory',
    time: "2 min ago",
    color: "text-primary bg-primary/10",
  },
  {
    id: 2,
    type: "user",
    icon: User,
    title: "User role updated",
    description: "Sarah Johnson promoted to Manager",
    time: "15 min ago",
    color: "text-accent bg-accent/10",
  },
  {
    id: 3,
    type: "sync",
    icon: RefreshCw,
    title: "Directory sync completed",
    description: "248 records synchronized from Azure AD",
    time: "1 hour ago",
    color: "text-success bg-success/10",
  },
  {
    id: 4,
    type: "tenant",
    icon: Building2,
    title: "New tenant onboarded",
    description: "Acme Corporation joined the platform",
    time: "3 hours ago",
    color: "text-warning bg-warning/10",
  },
  {
    id: 5,
    type: "settings",
    icon: Settings,
    title: "System settings updated",
    description: "Auto-sync interval changed to 30 min",
    time: "5 hours ago",
    color: "text-muted-foreground bg-muted",
  },
];

interface RecentActivityProps {
  activities?: ActivityItem[];
}

export function RecentActivity({ activities = defaultActivities }: RecentActivityProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <button className="text-sm text-primary hover:underline">View all</button>
      </div>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activity.icon || iconMap[activity.type] || Package;
          return (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors opacity-0 animate-slide-in"
              style={{ animationDelay: `${500 + index * 100}ms` }}
            >
              <div className={cn("p-2 rounded-lg", activity.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {activity.description}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {activity.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
