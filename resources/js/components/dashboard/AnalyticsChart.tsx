import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const defaultData = [
  { name: "Jan", assets: 120, users: 45 },
  { name: "Feb", assets: 150, users: 52 },
  { name: "Mar", assets: 180, users: 58 },
  { name: "Apr", assets: 220, users: 65 },
  { name: "May", assets: 280, users: 78 },
  { name: "Jun", assets: 340, users: 85 },
  { name: "Jul", assets: 390, users: 92 },
];

interface AnalyticsChartProps {
  data?: any[];
}

export function AnalyticsChart({ data = defaultData }: AnalyticsChartProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Growth Overview</h3>
          <p className="text-sm text-muted-foreground">Assets and users over time</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Assets</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-sm text-muted-foreground">Users</span>
          </div>
        </div>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'hsl(210, 40%, 96%)' }}
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 32%, 91%)",
                borderRadius: "12px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Bar
              dataKey="assets"
              fill="hsl(221, 83%, 53%)"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
            <Bar
              dataKey="users"
              fill="hsl(174, 72%, 40%)"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
