import React, { useState, useEffect } from "react";
import {
  Settings,
  Wifi,
  WifiOff,
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
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "nextelecom_api_config";
const TOKEN_KEY   = "nextelecom_api_token";

const API_URLS: Record<AuthType, string> = {
  standard: "https://api.virtualplatform.com.au/v2/auth",
  onetime:  "https://api.virtualplatform.com.au/v2/onetime/auth",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const maskToken = (token: string) =>
  token.length > 20
    ? token.slice(0, 8) + "••••••••••••••" + token.slice(-6)
    : "••••••••••••••••••••";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NexTelecomSettings() {
  const [config, setConfig] = useState<ApiConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved
      ? JSON.parse(saved)
      : { username: "", password: "", mfapin: "0000", authType: "standard" };
  });

  const [tokenData, setTokenData]       = useState<TokenData | null>(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [status, setStatus]             = useState<ConnectionStatus>(
    tokenData ? "connected" : "idle"
  );
  const [errorMsg, setErrorMsg]         = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken]       = useState(false);
  const [copied, setCopied]             = useState(false);
  const [dirty, setDirty]               = useState(false);

  // Auto-save config (without password) when it changes
  useEffect(() => {
    const toSave = { ...config, password: "" }; // never persist plain password
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [config]);

  const update = (field: keyof ApiConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
    if (status === "connected") setStatus("idle"); // mark stale
  };

  // ── Test Connection ──────────────────────────────────────────────────────────
  const testConnection = async () => {
    if (!config.username.trim() || !config.password.trim()) {
      setErrorMsg("Username and password are required.");
      setStatus("failed");
      return;
    }

    setStatus("connecting");
    setErrorMsg("");

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

      if (response.ok && (data.token || data.access_token)) {
        const token = data.token ?? data.access_token;
        const record: TokenData = {
          token,
          savedAt:  new Date().toLocaleString(),
          authType: config.authType,
          username: config.username.trim(),
        };
        localStorage.setItem(TOKEN_KEY, JSON.stringify(record));
        setTokenData(record);
        setStatus("connected");
        setDirty(false);
      } else {
        const msg =
          data.message ?? data.error ?? data.detail ??
          `HTTP ${response.status}: ${response.statusText}`;
        setErrorMsg(msg);
        setStatus("failed");
      }
    } catch (err: any) {
      // Network error
      if (err?.message?.includes("Failed to fetch") || err?.message?.includes("NetworkError")) {
        setErrorMsg(
          "Network error — could not reach the Laravel proxy. " +
          "Ensure your development server is running."
        );
      } else {
        setErrorMsg(err?.message ?? "Unknown network error.");
      }
      setStatus("failed");
    }
  };

  // ── Disconnect ───────────────────────────────────────────────────────────────
  const disconnect = () => {
    localStorage.removeItem(TOKEN_KEY);
    setTokenData(null);
    setStatus("idle");
    setErrorMsg("");
  };

  // ── Copy Token ───────────────────────────────────────────────────────────────
  const copyToken = () => {
    if (!tokenData) return;
    navigator.clipboard.writeText(tokenData.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Status UI helpers ───────────────────────────────────────────────────────
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure NexTelecom's connection to the VirtualPlatform API
          </p>
        </div>
        {/* Live status pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-300 ${statusConfig.badge} ${statusConfig.ring}`}
        >
          {statusConfig.icon}
          {statusConfig.label}
        </div>
      </div>

      {/* ── Connection Status Card ───────────────────────────────────────────── */}
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
          {/* Token display */}
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
          {/* Disconnect */}
          <button
            onClick={disconnect}
            className="flex items-center gap-2 text-sm text-rose-500 hover:text-rose-600 transition-colors font-medium"
          >
            <Trash2 className="w-4 h-4" /> Disconnect & Clear Token
          </button>
        </div>
      )}

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {status === "failed" && errorMsg && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/5 p-4 flex gap-3 animate-in slide-in-from-top-2 duration-200">
          <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-rose-600">Connection Failed</p>
            <p className="text-xs text-rose-500/80 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ── Configuration Form ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm divide-y divide-border">

        {/* Auth Type Toggle */}
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

          {/* Endpoint display */}
          <div className="mt-3 flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
            <Wifi className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs font-mono text-muted-foreground truncate">
              {API_URLS[config.authType]}
            </span>
          </div>
        </div>

        {/* Credentials */}
        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold">Credentials</p>

          {/* Username */}
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

          {/* Password */}
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

          {/* MFA PIN */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              MFA PIN{" "}
              <span className="normal-case text-muted-foreground/60">(default: 0000)</span>
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

        {/* Request Preview */}
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

        {/* Action Buttons */}
        <div className="p-5 flex items-center gap-3">
          <button
            onClick={testConnection}
            disabled={status === "connecting"}
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
    </div>
  );
}
