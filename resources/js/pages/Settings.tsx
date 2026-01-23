import { useState, useEffect } from "react";
import { 
  Mail, Shield, Bell, Save, Send, RefreshCw, 
  Cloud, Database, Zap, Clock, Check, X, Settings as SettingsIcon,
  Terminal, Info, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<any>({
    mail_host: "",
    mail_port: "587",
    mail_username: "",
    mail_password: "",
    mail_encryption: "tls",
    mail_from_address: "",
    mail_from_name: "AssetFlow",
    notification_email: "",
    trigger_warranty_expiry: "0",
    trigger_user_inactive: "0",
    trigger_asset_assigned: "0",
    trigger_secret_expiry: "0",
  });
  
  // Sync state
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalSynced: "0",
    lastSync: "Never",
    syncRate: "0%",
    isConnected: false,
  });
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState("1");
  const [fetchFromGraph, setFetchFromGraph] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [mailRes, syncStatsRes, syncLogsRes, syncSettingsRes] = await Promise.all([
        api.get("/mail-settings"),
        api.get("/sync/stats"),
        api.get("/sync/logs"),
        api.get("/sync/settings"),
      ]);

      if (mailRes.data) {
        setSettings((prev: any) => ({ ...prev, ...mailRes.data }));
      }
      
      setSyncStats(syncStatsRes.data);
      setSyncLogs(syncLogsRes.data);
      setAutoSyncEnabled(syncSettingsRes.data.autoSyncEnabled);
      setSyncInterval(syncSettingsRes.data.syncInterval);
      setFetchFromGraph(syncSettingsRes.data.fetchFromGraph);
      
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMail = async () => {
    setIsSaving(true);
    try {
      await api.post("/mail-settings", settings);
      toast.success("Mail settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save mail settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setIsTesting(true);
    try {
      await api.post("/mail-settings/test", { email: settings.notification_email });
      toast.success("Test email sent successfully");
    } catch (error) {
      console.error("Failed to send test email:", error);
      toast.error("Failed to send test email. Please check your SMTP settings.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await api.post("/sync/run");
      toast.success("Synchronization completed successfully");
      const [statsRes, logsRes] = await Promise.all([
        api.get("/sync/stats"),
        api.get("/sync/logs"),
      ]);
      setSyncStats(statsRes.data);
      setSyncLogs(logsRes.data);
    } catch (error) {
      console.error("Sync failed:", error);
      toast.error("Synchronization failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const saveSyncSettings = async (updates: any) => {
    try {
      await api.post("/sync/settings", {
        autoSyncEnabled,
        syncInterval,
        fetchFromGraph,
        ...updates,
      });
      toast.success("Sync settings updated");
    } catch (error) {
      console.error("Failed to save sync settings:", error);
      toast.error("Failed to update sync settings");
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
    <div className="space-y-6 max-w-6xl">
      <div className="opacity-0 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Manage your system configuration and directory synchronization</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            General Settings
          </TabsTrigger>
          <TabsTrigger value="sync" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Directory Sync
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="gap-2">
            <Terminal className="w-4 h-4" />
            System Scheduler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6">
            <Card className="opacity-0 animate-fade-in">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  <CardTitle>SMTP Configuration</CardTitle>
                </div>
                <CardDescription>Configure your outgoing mail server settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mail_host">SMTP Host</Label>
                    <Input
                      id="mail_host"
                      placeholder="smtp.example.com"
                      value={settings.mail_host}
                      onChange={(e) => setSettings({ ...settings, mail_host: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mail_port">SMTP Port</Label>
                    <Input
                      id="mail_port"
                      placeholder="587"
                      value={settings.mail_port}
                      onChange={(e) => setSettings({ ...settings, mail_port: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mail_username">Username</Label>
                    <Input
                      id="mail_username"
                      placeholder="user@example.com"
                      value={settings.mail_username}
                      onChange={(e) => setSettings({ ...settings, mail_username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mail_password">Password</Label>
                    <Input
                      id="mail_password"
                      type="password"
                      placeholder="••••••••"
                      value={settings.mail_password}
                      onChange={(e) => setSettings({ ...settings, mail_password: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Encryption</Label>
                    <Select
                      value={settings.mail_encryption}
                      onValueChange={(val) => setSettings({ ...settings, mail_encryption: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="tls">TLS</SelectItem>
                        <SelectItem value="ssl">SSL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notification_email">Notification Recipient Email</Label>
                    <Input
                      id="notification_email"
                      placeholder="admin@assetflow.com"
                      value={settings.notification_email}
                      onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <Label htmlFor="mail_from_address">From Address</Label>
                    <Input
                      id="mail_from_address"
                      placeholder="noreply@assetflow.com"
                      value={settings.mail_from_address}
                      onChange={(e) => setSettings({ ...settings, mail_from_address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mail_from_name">From Name</Label>
                    <Input
                      id="mail_from_name"
                      placeholder="AssetFlow"
                      value={settings.mail_from_name}
                      onChange={(e) => setSettings({ ...settings, mail_from_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSaveMail} disabled={isSaving} className="gap-2">
                    <Save className="w-4 h-4" />
                    {isSaving ? "Saving..." : "Save Configuration"}
                  </Button>
                  <Button variant="outline" onClick={handleTestEmail} disabled={isTesting || !settings.notification_email} className="gap-2">
                    <Send className="w-4 h-4" />
                    {isTesting ? "Sending..." : "Send Test Email"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  <CardTitle>Email Notification Triggers</CardTitle>
                </div>
                <CardDescription>Select which events should trigger an automatic email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Asset Warranty Expiry</Label>
                    <p className="text-sm text-muted-foreground">
                      Send notification when an asset's warranty is about to expire or has expired
                    </p>
                  </div>
                  <Switch
                    checked={settings.trigger_warranty_expiry === "1"}
                    onCheckedChange={(val) => {
                      const newSettings = { ...settings, trigger_warranty_expiry: val ? "1" : "0" };
                      setSettings(newSettings);
                      api.post("/mail-settings", { trigger_warranty_expiry: val ? "1" : "0" });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">User Inactive Status</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when a user's status changes to inactive in the directory
                    </p>
                  </div>
                  <Switch
                    checked={settings.trigger_user_inactive === "1"}
                    onCheckedChange={(val) => {
                      const newSettings = { ...settings, trigger_user_inactive: val ? "1" : "0" };
                      setSettings(newSettings);
                      api.post("/mail-settings", { trigger_user_inactive: val ? "1" : "0" });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Asset Assignment</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email notification when an asset is assigned to a user
                    </p>
                  </div>
                  <Switch
                    checked={settings.trigger_asset_assigned === "1"}
                    onCheckedChange={(val) => {
                      const newSettings = { ...settings, trigger_asset_assigned: val ? "1" : "0" };
                      setSettings(newSettings);
                      api.post("/mail-settings", { trigger_asset_assigned: val ? "1" : "0" });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Client Secret & Certificate Expiry</Label>
                    <p className="text-sm text-muted-foreground">
                      Monitor and notify every 3 months about tenant client secrets and certificates
                    </p>
                  </div>
                  <Switch
                    checked={settings.trigger_secret_expiry === "1"}
                    onCheckedChange={(val) => {
                      const newSettings = { ...settings, trigger_secret_expiry: val ? "1" : "0" };
                      setSettings(newSettings);
                      api.post("/mail-settings", { trigger_secret_expiry: val ? "1" : "0" });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="opacity-0 animate-fade-in">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <Cloud className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle>Microsoft Graph Connection</CardTitle>
                        <CardDescription>Azure Active Directory Integration</CardDescription>
                      </div>
                    </div>
                    <Badge variant={syncStats.isConnected ? "success" : "muted"} className="gap-1">
                      {syncStats.isConnected ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {syncStats.isConnected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-muted/50 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                        <Database className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase">Total Synced</span>
                      </div>
                      <p className="text-2xl font-bold">{syncStats.totalSynced}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase">Last Sync</span>
                      </div>
                      <p className="text-xl font-bold">{syncStats.lastSync}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                        <Zap className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase">Sync Rate</span>
                      </div>
                      <p className="text-2xl font-bold">{syncStats.syncRate}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="gradient"
                      onClick={handleSyncNow}
                      disabled={isSyncing || !syncStats.isConnected}
                      className="gap-2"
                    >
                      <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                      {isSyncing ? "Syncing..." : "Sync Now"}
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setSyncStats(prev => ({ ...prev, isConnected: !prev.isConnected }));
                    }}>
                      {syncStats.isConnected ? "Disconnect" : "Connect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
                <CardHeader>
                  <CardTitle>Sync History</CardTitle>
                  <CardDescription>Log of recent synchronization events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {syncLogs.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No sync history found</p>
                    ) : (
                      syncLogs.map((log, index) => {
                        const StatusIcon = statusConfig[log.status].icon;
                        return (
                          <div
                            key={log.id}
                            className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", statusConfig[log.status].bg)}>
                                <StatusIcon className={cn("w-4 h-4", statusConfig[log.status].color)} />
                              </div>
                              <div>
                                <p className="font-medium">{log.source}</p>
                                <p className="text-xs text-muted-foreground">{log.timestamp}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium">{log.recordsSynced} records</p>
                                <p className="text-xs text-muted-foreground">{log.duration}</p>
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
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <CardTitle>Automation</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Auto Sync</Label>
                      <p className="text-xs text-muted-foreground">Enable automatic sync</p>
                    </div>
                    <Switch 
                      checked={autoSyncEnabled} 
                      onCheckedChange={(val) => {
                        setAutoSyncEnabled(val);
                        saveSyncSettings({ autoSyncEnabled: val });
                      }} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sync Interval</Label>
                    <Select 
                      value={syncInterval} 
                      onValueChange={(val) => {
                        setSyncInterval(val);
                        saveSyncSettings({ syncInterval: val });
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
                      <p className="text-xs text-muted-foreground">Pull from Microsoft Graph API</p>
                    </div>
                    <Switch 
                      checked={fetchFromGraph} 
                      onCheckedChange={(val) => {
                        setFetchFromGraph(val);
                        saveSyncSettings({ fetchFromGraph: val });
                      }} 
                    />
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="w-4 h-4 text-success" />
                      <span>Secure OAuth 2.0 connection active</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="scheduler" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="opacity-0 animate-fade-in">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-primary" />
                    <CardTitle>Cron Job Configuration</CardTitle>
                  </div>
                  <CardDescription>Configure your server's crontab to automate system tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted font-mono text-sm relative group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-muted-foreground text-xs uppercase font-sans">Crontab Entry</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText("* * * * * cd " + window.location.origin.replace(/(^\w+:|^)\/\//, "") + " && php artisan schedule:run >> /dev/null 2>&1");
                          toast.success("Copied to clipboard");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <code className="block break-all">
                      * * * * * cd /path/to-your-project &amp;&amp; php artisan schedule:run &gt;&gt; /dev/null 2&gt;&amp;1
                    </code>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-sm">
                      <Info className="w-4 h-4 text-blue-500" />
                      How it works
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Laravel's command scheduler allows you to fluently and expressively define your command schedule within the application itself. 
                      When using the scheduler, only a single cron entry is needed on your server.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h4 className="font-semibold text-sm mb-3">Manual Execution</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      To run the scheduled tasks manually for testing, you can use the following artisan command:
                    </p>
                    <div className="p-3 rounded-lg bg-muted font-mono text-sm flex justify-between items-center">
                      <code>php artisan schedule:run</code>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText("php artisan schedule:run");
                          toast.success("Copied to clipboard");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <CardTitle>Scheduled Tasks</CardTitle>
                  </div>
                  <CardDescription>Current automated tasks defined in the system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                          <RefreshCw className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Directory Synchronization</p>
                          <p className="text-xs text-muted-foreground">sync:directory-users</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Every Minute</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Warranty Expiry Check</p>
                          <p className="text-xs text-muted-foreground">notifications:check-warranty</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Daily</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                          <Bell className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Inactive User Check</p>
                          <p className="text-xs text-muted-foreground">notifications:check-inactive</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Hourly</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Setup Guide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <p className="font-medium">1. Open Crontab</p>
                    <code className="block p-2 bg-background rounded border text-xs">crontab -e</code>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">2. Paste Entry</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Add the crontab entry from the left, ensuring you replace the path with your actual project root.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">3. Save and Exit</p>
                    <p className="text-muted-foreground text-xs">
                      The scheduler will now start running automatically.
                    </p>
                  </div>
                  <div className="pt-2">
                    <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg text-yellow-600 dark:text-yellow-500 text-xs">
                      <Info className="w-4 h-4 mt-0.5 shrink-0" />
                      <p>Ensure your server has PHP installed and the artisan file is executable.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
