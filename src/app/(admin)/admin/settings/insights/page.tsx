"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Database, 
  Key, 
  Shield, 
  Server, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Users,
  Link2,
  File,
  Activity,
  Settings as SettingsIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SettingsData {
  database: {
    status: string;
    error: string | null;
  };
  environment: {
    database: boolean;
    authSecret: boolean;
    googleClientId: boolean;
    googleClientSecret: boolean;
    appleClientId: boolean;
    appleClientSecret: boolean;
    resendApiKey: boolean;
    awsAccessKeyId: boolean;
    awsSecretAccessKey: boolean;
    awsRegion: boolean;
    awsS3BucketName: boolean;
    stripeSecretKey: boolean;
    stripeWebhookSecret: boolean;
    stripeConnectClientId: boolean;
    nodeEnv: string;
    cookieDomain: boolean;
  };
  stats: {
    users: number;
    links: number;
    files: number;
    activities: number;
  };
  system: {
    nodeVersion: string;
    platform: string;
    uptime: number;
  };
}

function StatusBadge({ status }: { status: "connected" | "error" | "disconnected" }) {
  const config = {
    connected: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20", label: "Connected" },
    error: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", label: "Error" },
    disconnected: { icon: AlertCircle, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20", label: "Disconnected" },
  };

  const { icon: Icon, color, bg, border, label } = config[status];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${bg} ${border} border`}>
      <Icon className={`h-4 w-4 ${color}`} />
      <span className={`text-sm font-medium ${color}`}>{label}</span>
    </div>
  );
}

function SettingCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-sm p-4">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="h-5 w-5 text-white/50" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function EnvVarRow({ label, value, required = true }: { label: string; value: boolean; required?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-white/70">{label}</span>
        {required && <span className="text-xs text-red-400">*</span>}
      </div>
      {value ? (
        <CheckCircle2 className="h-4 w-4 text-green-400" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400" />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-sm p-4">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="h-5 w-5 text-white/50" />
        <span className="text-sm text-white/50">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetchSettings();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session]);

  async function fetchSettings() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        console.error("Failed to fetch settings:", response.status, response.statusText);
        if (response.status === 401) {
          setSettings(null);
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      setSettings(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    fetchSettings();
  }

  function formatUptime(seconds: number) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white/50">Loading...</p>
      </div>
    );
  }



  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-4xl font-bold">Insights</h1>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="bg-white/5 border-white/10 text-white hover:bg-white/10"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {settings && (
          <>
            <StatCard label="Users" value={settings.stats.users} icon={Users} />
            <StatCard label="Links" value={settings.stats.links} icon={Link2} />
            <StatCard label="Files" value={settings.stats.files} icon={File} />
            <StatCard label="Activities" value={settings.stats.activities} icon={Activity} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Database Status */}
        <SettingCard title="Database" icon={Database}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Connection Status</span>
              {settings && <StatusBadge status={settings.database.status as any} />}
            </div>
            {settings?.database.error && (
              <div className="p-3 bg-red-400/10 border border-red-400/20 rounded text-sm text-red-400">
                {settings.database.error}
              </div>
            )}
          </div>
        </SettingCard>

        {/* System Information */}
        <SettingCard title="System Information" icon={Server}>
          <div className="space-y-2">
            {settings && (
              <>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-white/70">Node Version</span>
                  <span className="text-sm font-medium">{settings.system.nodeVersion}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-white/70">Platform</span>
                  <span className="text-sm font-medium capitalize">{settings.system.platform}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-white/70">Environment</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded ${
                    settings.environment.nodeEnv === "production" 
                      ? "bg-green-400/10 text-green-400" 
                      : "bg-yellow-400/10 text-yellow-400"
                  }`}>
                    {settings.environment.nodeEnv}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-white/70">Uptime</span>
                  <span className="text-sm font-medium">{formatUptime(settings.system.uptime)}</span>
                </div>
              </>
            )}
          </div>
        </SettingCard>
      </div>

      {/* Environment Variables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SettingCard title="Authentication" icon={Shield}>
          <div className="space-y-1">
            {settings && (
              <>
                <EnvVarRow label="AUTH_SECRET" value={settings.environment.authSecret} />
                <EnvVarRow label="Google Client ID" value={settings.environment.googleClientId} required={false} />
                <EnvVarRow label="Google Client Secret" value={settings.environment.googleClientSecret} required={false} />
                <EnvVarRow label="Apple Client ID" value={settings.environment.appleClientId} required={false} />
                <EnvVarRow label="Apple Client Secret" value={settings.environment.appleClientSecret} required={false} />
                <EnvVarRow label="Resend API Key" value={settings.environment.resendApiKey} />
                <EnvVarRow label="Cookie Domain" value={settings.environment.cookieDomain} required={false} />
              </>
            )}
          </div>
        </SettingCard>

        <SettingCard title="External Services" icon={Key}>
          <div className="space-y-1">
            {settings && (
              <>
                <EnvVarRow label="Database URL" value={settings.environment.database} />
                <EnvVarRow label="AWS Access Key ID" value={settings.environment.awsAccessKeyId} />
                <EnvVarRow label="AWS Secret Access Key" value={settings.environment.awsSecretAccessKey} />
                <EnvVarRow label="AWS Region" value={settings.environment.awsRegion} />
                <EnvVarRow label="AWS S3 Bucket Name" value={settings.environment.awsS3BucketName} />
                <EnvVarRow label="Stripe Secret Key" value={settings.environment.stripeSecretKey} />
                <EnvVarRow label="Stripe Webhook Secret" value={settings.environment.stripeWebhookSecret} />
                <EnvVarRow label="Stripe Connect Client ID" value={settings.environment.stripeConnectClientId} required={false} />
              </>
            )}
          </div>
        </SettingCard>
      </div>

      {/* Configuration Summary */}
      <div className="bg-white/5 border border-white/5 rounded-sm p-4">
        <div className="flex items-center gap-3 mb-4">
          <SettingsIcon className="h-5 w-5 text-white/50" />
          <h2 className="text-lg font-semibold">Configuration Summary</h2>
        </div>
        {settings && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white/70">Required Variables</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-400">
                  {Object.values(settings.environment).filter(v => v === true).length}
                </span>
                <span className="text-sm text-white/50">configured</span>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white/70">Missing Variables</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-red-400">
                  {Object.values(settings.environment).filter(v => v === false).length}
                </span>
                <span className="text-sm text-white/50">missing</span>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white/70">Database Status</h3>
              <StatusBadge status={settings.database.status as any} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

