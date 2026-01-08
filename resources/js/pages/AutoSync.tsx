import { useState, useEffect } from "react";
import { RefreshCw, Check, X, Clock, Settings, Zap, Cloud, Database, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";

interface SyncLog {
  id: string;
  timestamp: string;
  status: "success" | "failed" | "partial";
  recordsSynced: number;
  duration: string;
  source: string;
}

interface SyncStats {
  totalSynced: string;
  lastSync: string;
  syncRate: string;
  isConnected: boolean;
}

const statusConfig = {
  success: { color: "text-success", bg: "bg-success/10", icon: Check },
  failed: { color: "text-destructive", bg: "bg-destructive/10", icon: X },
  partial: { color: "text-warning", bg: "bg-warning/10", icon: Clock },
};

export default function AutoSync() {
  const [stats, setStats] = useState<SyncStats>({
    totalSynced: "0",
    lastSync: "Never",
    syncRate: "0%",
    isConnected: false,
  });
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState("1");
  const [fetchFromGraph, setFetchFromGraph] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, logsRes, settingsRes] = await Promise.all([
        api.get("/sync/stats"),
        api.get("/sync/logs"),
        api.get("/sync/settings"),
      ]);

      setStats(statsRes.data);
      setLogs(logsRes.data);
      setAutoSyncEnabled(settingsRes.data.autoSyncEnabled);
      setSyncInterval(settingsRes.data.syncInterval);
      setFetchFromGraph(settingsRes.data.fetchFromGraph);
    } catch (error) {
      console.error("Failed to fetch sync data:", error);
      toast.error("Failed to load sync information");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await api.post("/sync/run");
      toast.success("Synchronization completed successfully");
      fetchData();
    } catch (error) {
      console.error("Sync failed:", error);
      toast.error("Synchronization failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const saveSettings = async (updates: any) => {
    try {
      await api.post("/sync/settings", {
        autoSyncEnabled,
        syncInterval,
        fetchFromGraph,
        ...updates,
      });
      toast.success("Settings updated");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to update settings");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="opacity-0 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Auto Directory Sync</h1>
        <p className="text-muted-foreground">Configure automatic synchronization with Microsoft Graph</p>
      </div>

      {/* Connection Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Cloud className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Microsoft Graph</h3>
                <p className="text-sm text-muted-foreground">Azure Active Directory Integration</p>
              </div>
            </div>
            <Badge variant={stats.isConnected ? "success" : "muted"} className="gap-1">
              {stats.isConnected ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {stats.isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Database className="w-4 h-4" />
                <span className="text-sm">Total Synced</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalSynced}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Last Sync</span>
              </div>
              <p className="text-2xl font-bold">{stats.lastSync}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-sm">Sync Rate</span>
              </div>
              <p className="text-2xl font-bold">{stats.syncRate}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="gradient"
              onClick={handleSync}
              disabled={isSyncing || !stats.isConnected}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
            <Button variant="outline" onClick={() => {
              // In a real app, this would trigger a connection flow
              setStats(prev => ({ ...prev, isConnected: !prev.isConnected }));
            }}>
              {stats.isConnected ? "Disconnect" : "Connect"}
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="bg-card rounded-2xl border border-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Sync Settings</h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Auto Sync</Label>
                <p className="text-xs text-muted-foreground">Enable automatic synchronization</p>
              </div>
              <Switch 
                checked={autoSyncEnabled} 
                onCheckedChange={(val) => {
                  setAutoSyncEnabled(val);
                  saveSettings({ autoSyncEnabled: val });
                }} 
              />
            </div>

            <div className="space-y-2">
              <Label>Sync Interval</Label>
              <Select 
                value={syncInterval} 
                onValueChange={(val) => {
                  setSyncInterval(val);
                  saveSettings({ syncInterval: val });
                }} 
                disabled={!autoSyncEnabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Every minute</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every hour</SelectItem>
                  <SelectItem value="360">Every 6 hours</SelectItem>
                  <SelectItem value="1440">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Fetch from Graph</Label>
                <p className="text-xs text-muted-foreground">Pull data from Microsoft Graph API</p>
              </div>
              <Switch 
                checked={fetchFromGraph} 
                onCheckedChange={(val) => {
                  setFetchFromGraph(val);
                  saveSettings({ fetchFromGraph: val });
                }} 
              />
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Secure OAuth 2.0 connection</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-card rounded-2xl border border-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "300ms" }}>
        <h3 className="text-lg font-semibold mb-4">Sync History</h3>
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No sync history found</p>
          ) : (
            logs.map((log, index) => {
              const StatusIcon = statusConfig[log.status].icon;
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors opacity-0 animate-slide-in"
                  style={{ animationDelay: `${400 + index * 100}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", statusConfig[log.status].bg)}>
                      <StatusIcon className={cn("w-4 h-4", statusConfig[log.status].color)} />
                    </div>
                    <div>
                      <p className="font-medium">{log.source}</p>
                      <p className="text-sm text-muted-foreground">{log.timestamp}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="font-medium">{log.recordsSynced} records</p>
                      <p className="text-muted-foreground">{log.duration}</p>
                    </div>
                    <Badge
                      variant={log.status === "success" ? "success" : log.status === "failed" ? "destructive" : "warning"}
                      className="capitalize"
                    >
                      {log.status}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
