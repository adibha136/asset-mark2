import React, { useState, useEffect } from "react";
import {
  Wifi,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Key,
  User,
  Lock,
  ShieldCheck,
  Trash2,
  Copy,
  Check,
  Database,
} from "lucide-react";

type AuthType = "standard" | "onetime";
type ConnectionStatus = "idle" | "connecting" | "connected" | "failed";

interface ApiConfig {
  username: string;
  password: string;
  mfapin: string;
  authType: AuthType;
}

interface TokenData {
  token: string;
  savedAt: string;
  authType: AuthType;
  username: string;
}

const API_URLS: Record<AuthType, string> = {
  standard: "https://api.virtualplatform.com.au/v2/auth",
  onetime:  "https://api.virtualplatform.com.au/v2/onetime/auth",
};

const MOCK_MODE = false;

const maskToken = (token: string) =>
  token.length > 20
    ? token.slice(0, 8) + "••••••••••••••" + token.slice(-6)
    : "••••••••••••••••••••";

export default function NexTelecomSettings() {
  const [loading, setLoading] = useState(true);
  const [savingApi, setSavingApi] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingSms, setSavingSms] = useState(false);
  const [savingAutoSms, setSavingAutoSms] = useState(false);

  const [config, setConfig] = useState<ApiConfig>({
    username: "",
    password: "",
    mfapin: "0000",
    authType: "standard",
  });

  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [emailSettings, setEmailSettings] = useState({
    enabled: false,
    address: "",
    host: "",
    port: "",
    username: "",
    password: "",
  });

  const [smsSettings, setSmsSettings] = useState({
    enabled: false,
    provider: "",
    apiKey: "",
  });

  const [autoSmsEnabled, setAutoSmsEnabled] = useState(false);

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/nextelecom/settings");
      if (response.ok) {
        const result = await response.json();
        const data = result.data;

        if (data.api) {
          setConfig((prev) => ({ ...prev, ...data.api }));
        }
        if (data.token) {
          setTokenData(data.token);
          setStatus("connected");
        }
        if (data.email) {
          setEmailSettings(data.email);
        }
        if (data.sms) {
          setSmsSettings(data.sms);
        }
        if (data.auto_sms !== undefined) {
          setAutoSmsEnabled(data.auto_sms);
        }
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveApiConfig = async () => {
    setSavingApi(true);
    try {
      const response = await fetch("/api/nextelecom/settings/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: config.username,
          mfapin: config.mfapin,
          authType: config.authType,
        }),
      });

      if (response.ok) {
        setDirty(false);
      }
    } catch (err) {
      console.error("Failed to save API config:", err);
    } finally {
      setSavingApi(false);
    }
  };

  const updateEmailSettings = (field: string, value: any) => {
    const updated = { ...emailSettings, [field]: value };
    setEmailSettings(updated);
    setSavingEmail(true);
    fetch("/api/nextelecom/settings/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    }).finally(() => setSavingEmail(false));
  };

  const updateSmsSettings = (field: string, value: any) => {
    const updated = { ...smsSettings, [field]: value };
    setSmsSettings(updated);
    setSavingSms(true);
    fetch("/api/nextelecom/settings/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    }).finally(() => setSavingSms(false));
  };

  const updateAutoSms = (value: boolean) => {
    setAutoSmsEnabled(value);
    setSavingAutoSms(true);
    fetch("/api/nextelecom/settings/auto-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: value }),
    }).finally(() => setSavingAutoSms(false));
  };

  const update = (field: keyof ApiConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
    if (status === "connected") setStatus("idle");
  };

  const testConnection = async () => {
    if (!config.username.trim() || !config.password.trim()) {
      setErrorMsg("Username and password are required.");
      setStatus("failed");
      return;
    }

    setStatus("connecting");
    setErrorMsg("");

    if (MOCK_MODE) {
      await new Promise(r => setTimeout(r, 1500));
      const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const record: TokenData = {
        token: mockToken,
        savedAt: new Date().toLocaleString(),
        authType: config.authType,
        username: config.username.trim(),
      };
      
      await fetch("/api/nextelecom/settings/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });

      setTokenData(record);
      setStatus("connected");
      setDirty(false);
      setErrorMsg("");
      return;
    }

    try {
      const checkConn = await fetch("/api/nextelecom/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: config.username.trim(),
          password: config.password,
          mfapin: config.mfapin || "0000",
        }),
      });
      const connData = await checkConn.json();
      
      if (!connData.connected) {
        setErrorMsg(
          `⚠️ API Connection Failed\n\n${connData.message}\n\n${connData.error || connData.hint || 'Please check your credentials and network connection.'}`
        );
        setStatus("failed");
        return;
      }
    } catch (err) {
      setErrorMsg("Could not reach the API. Please verify your network connection and the API endpoint.");
      setStatus("failed");
      return;
    }

    const body = JSON.stringify({
      authType: config.authType,
      username: config.username.trim(),
      password: config.password,
      mfapin:   config.mfapin || "0000",
    });

    try {
      const response = await fetch("/api/nextelecom/proxy-auth", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body,
      });

      const text = await response.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { /* non-JSON */ }

      if (response.ok && (data.token || data.access_token || data.AUTH_TOKEN)) {
        const token = data.token ?? data.access_token ?? data.AUTH_TOKEN;
        const record: TokenData = {
          token,
          savedAt:  new Date().toLocaleString(),
          authType: config.authType,
          username: config.username.trim(),
        };
        
        await fetch("/api/nextelecom/settings/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });

        setTokenData(record);
        setStatus("connected");
        setDirty(false);
      } else {
        const msg =
          data.message ?? data.error ?? data.detail ??
          `HTTP ${response.status}: ${response.statusText} — Response: ${text}`;
        setErrorMsg(msg);
        setStatus("failed");
      }
    } catch (err: any) {
      if (err?.message?.includes("Failed to fetch") || err?.message?.includes("NetworkError")) {
        setErrorMsg(
          "Network error — could not reach the VirtualPlatform API proxy. " +
          "Please verify your network connection is active."
        );
      } else {
        setErrorMsg(err?.message ?? "Unknown network error.");
      }
      setStatus("failed");
    }
  };

  const disconnect = async () => {
    try {
      await fetch("/api/nextelecom/settings/token", { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete token:", err);
    }
    setTokenData(null);
    setStatus("idle");
    setErrorMsg("");
  };

  const copyToken = () => {
    if (!tokenData) return;
    navigator.clipboard.writeText(tokenData.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusConfig = {
    idle: {
      icon: <Wifi className="w-4 h-4 text-muted-foreground" />,
      label: "Not Connected",
      badge: "bg-muted text-muted-foreground",
      ring: "border-border",
    },
    connecting: {
      icon: <Loader2 className="w-4 h-4 animate-spin text-sky-500" />,
      label: "Connecting…",
      badge: "bg-sky-500/10 text-sky-600",
      ring: "border-sky-400",
    },
    connected: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      label: "Connected",
      badge: "bg-emerald-500/10 text-emerald-600",
      ring: "border-emerald-400",
    },
    failed: {
      icon: <XCircle className="w-4 h-4 text-rose-500" />,
      label: "Connection Failed",
      badge: "bg-rose-500/10 text-rose-600",
      ring: "border-rose-400",
    },
  }[status];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NexTelecom Settings</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-1">
            <Database className="w-4 h-4" />
            All settings synced to database
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-300 ${statusConfig.badge} ${statusConfig.ring}`}
        >
          {statusConfig.icon}
          {statusConfig.label}
        </div>
      </div>

      {status === "connected" && tokenData && (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/5 p-5 space-y-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-emerald-600 font-semibold">
            <ShieldCheck className="w-5 h-5" />
            Successfully Connected
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Username</p>
              <p className="font-medium">{tokenData.username}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Auth Type</p>
              <p className="font-medium capitalize">{tokenData.authType === "onetime" ? "One-Time" : "Standard"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Connected At</p>
              <p className="font-medium">{tokenData.savedAt}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">API Token</p>
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
              <Key className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 font-mono text-xs truncate">
                {showToken ? tokenData.token : maskToken(tokenData.token)}
              </span>
              <button
                onClick={() => setShowToken(!showToken)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={copyToken}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <button
            onClick={disconnect}
            className="flex items-center gap-2 text-sm text-rose-500 hover:text-rose-600 transition-colors font-medium"
          >
            <Trash2 className="w-4 h-4" /> Disconnect & Clear Token
          </button>
        </div>
      )}

      {status === "failed" && errorMsg && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/5 p-4 flex gap-3 animate-in slide-in-from-top-2 duration-200">
          <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-rose-600">Connection Failed</p>
            <p className="text-xs text-rose-500/80 mt-0.5 whitespace-pre-wrap">{errorMsg}</p>
          </div>
        </div>
      )}



      <div className="rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
        <div className="p-5">
          <p className="text-sm font-semibold mb-3">Authentication Type</p>
          <div className="flex gap-3">
            {(["standard", "onetime"] as AuthType[]).map((type) => (
              <button
                key={type}
                onClick={() => update("authType", type)}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all duration-150 text-left ${
                  config.authType === type
                    ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-400"
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                <div className="font-semibold">
                  {type === "standard" ? "Standard Auth" : "One-Time Auth"}
                </div>
                <div className="text-xs mt-0.5 opacity-70">
                  {type === "standard"
                    ? "/v2/auth — persistent session"
                    : "/v2/onetime/auth — single-use token"}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
            <Wifi className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs font-mono text-muted-foreground truncate">
              {API_URLS[config.authType]}
            </span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold">Credentials</p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={config.username}
                onChange={(e) => update("username", e.target.value)}
                placeholder="Enter your username"
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={config.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-9 pr-10 py-2.5 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              MFA PIN <span className="normal-case text-muted-foreground/60">(default: 0000)</span>
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                maxLength={8}
                value={config.mfapin}
                onChange={(e) => update("mfapin", e.target.value.replace(/\D/g, ""))}
                placeholder="0000"
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all tracking-widest font-mono"
              />
            </div>
          </div>
        </div>

        <div className="p-5">
          <p className="text-sm font-semibold mb-2">Request Preview</p>
          <pre className="text-xs bg-muted/60 border border-border rounded-lg p-3 overflow-x-auto text-muted-foreground leading-relaxed">
{`POST ${API_URLS[config.authType]}
Content-Type: application/json

{
  "username": "${config.username || "{{Username}}"}",
  "password": "{{Password}}",
  "mfapin": "${config.mfapin || "0000"}"
}`}
          </pre>
        </div>

        <div className="p-5 flex items-center gap-3">
          <button
            onClick={testConnection}
            disabled={status === "connecting" || savingApi}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-150 shadow-sm hover:shadow-md"
          >
            {status === "connecting" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</>
            ) : status === "connected" && !dirty ? (
              <><RefreshCw className="w-4 h-4" /> Reconnect</>
            ) : (
              <><Wifi className="w-4 h-4" /> Test Connection</>
            )}
          </button>

          {dirty && (
            <button
              onClick={saveApiConfig}
              disabled={savingApi}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-150"
            >
              {savingApi ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <><Check className="w-4 h-4" /> Save Config</>
              )}
            </button>
          )}

          {(status === "connected" || status === "failed") && (
            <button
              onClick={() => { setStatus("idle"); setErrorMsg(""); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2.5 rounded-lg hover:bg-muted"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold">Email Settings</p>
              <p className="text-xs text-muted-foreground mt-0.5">Configure SMTP for email notifications</p>
            </div>
            <button
              onClick={() => updateEmailSettings("enabled", !emailSettings.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                emailSettings.enabled ? "bg-emerald-500" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  emailSettings.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {emailSettings.enabled && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email Address</label>
                <input
                  type="email"
                  value={emailSettings.address}
                  onChange={(e) => updateEmailSettings("address", e.target.value)}
                  placeholder="notifications@example.com"
                  className="w-full px-4 py-2.5 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SMTP Host</label>
                  <input
                    type="text"
                    value={emailSettings.host}
                    onChange={(e) => updateEmailSettings("host", e.target.value)}
                    placeholder="smtp.example.com"
                    className="w-full px-4 py-2.5 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Port</label>
                  <input
                    type="number"
                    value={emailSettings.port}
                    onChange={(e) => updateEmailSettings("port", e.target.value)}
                    placeholder="587"
                    className="w-full px-4 py-2.5 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SMTP Username</label>
                <input
                  type="text"
                  value={emailSettings.username}
                  onChange={(e) => updateEmailSettings("username", e.target.value)}
                  placeholder="smtp_user"
                  className="w-full px-4 py-2.5 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SMTP Password</label>
                <input
                  type="password"
                  value={emailSettings.password}
                  onChange={(e) => updateEmailSettings("password", e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
                />
              </div>

              {savingEmail && (
                <p className="text-xs text-sky-600 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving to database...
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold">SMS Settings</p>
              <p className="text-xs text-muted-foreground mt-0.5">Configure SMS provider for notifications</p>
            </div>
            <button
              onClick={() => updateSmsSettings("enabled", !smsSettings.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                smsSettings.enabled ? "bg-emerald-500" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  smsSettings.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {smsSettings.enabled && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SMS Provider</label>
                <select
                  value={smsSettings.provider}
                  onChange={(e) => updateSmsSettings("provider", e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
                >
                  <option value="">Select Provider</option>
                  <option value="twilio">Twilio</option>
                  <option value="aws_sns">AWS SNS</option>
                  <option value="nexmo">Nexmo/Vonage</option>
                  <option value="custom">Custom Provider</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">API Key</label>
                <input
                  type="password"
                  value={smsSettings.apiKey}
                  onChange={(e) => updateSmsSettings("apiKey", e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
                />
              </div>

              {savingSms && (
                <p className="text-xs text-sky-600 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving to database...
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Auto SMS Notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">Automatically send SMS when customer status changes</p>
          </div>
          <button
            onClick={() => updateAutoSms(!autoSmsEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoSmsEnabled ? "bg-emerald-500" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                autoSmsEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        {savingAutoSms && (
          <p className="text-xs text-sky-600 flex items-center gap-1 mt-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Saving to database...
          </p>
        )}
      </div>
    </div>
  );
}
