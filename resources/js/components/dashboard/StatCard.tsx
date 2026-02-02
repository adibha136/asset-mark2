import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  gradient: "primary" | "accent" | "success" | "warning";
  delay?: number;
  extraInfo?: React.ReactNode;
}

const gradientStyles = {
  primary: "from-primary to-primary/60",
  accent: "from-accent to-accent/60",
  success: "from-success to-success/60",
  warning: "from-warning to-warning/60",
};

const iconBgStyles = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  gradient,
  delay = 0,
  extraInfo,
}: StatCardProps) {
  return (
    <div
      className="relative overflow-hidden bg-card rounded-2xl border border-border p-6 card-hover opacity-0 animate-fade-in flex flex-col justify-between h-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Gradient Background */}
      <div
        className={cn(
          "absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-gradient-to-br opacity-10 blur-2xl",
          gradientStyles[gradient]
        )}
      />

      <div className="relative flex items-start justify-between mb-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {change && (
            <p
              className={cn(
                "text-sm font-medium",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconBgStyles[gradient])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {extraInfo && (
        <div className="relative mt-auto pt-4 border-t border-border">
          {extraInfo}
        </div>
      )}
    </div>
  );
}
