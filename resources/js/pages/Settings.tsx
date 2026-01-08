import { useState, useEffect } from "react";
import { Mail, Shield, Bell, Save, Send, RefreshCw, AlertTriangle } from "lucide-react";
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
import api from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Settings() {
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
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get("/mail-settings");
      if (response.data) {
        setSettings((prev: any) => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.post("/mail-settings", settings);
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="opacity-0 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Configure SMTP and email notification triggers</p>
      </div>

      <div className="grid gap-6">
        <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
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
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
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

        <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
