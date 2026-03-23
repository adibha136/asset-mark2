import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBusiness } from "@/contexts/BusinessContext";
import { Loader2 } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { isLoading: businessLoading, activeBusiness } = useBusiness();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Close mobile menu on route change
  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname, isMobile]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobile={isMobile}
        mobileMenuOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <TopNav
        sidebarCollapsed={sidebarCollapsed}
        onMenuClick={() => setMobileMenuOpen(true)}
        isMobile={isMobile}
      />
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          !isMobile && (sidebarCollapsed ? "pl-16" : "pl-64"),
          isMobile && "pl-0"
        )}
      >
        {/* Business switching overlay */}
        {businessLoading && (
          <div className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 pointer-events-none animate-in fade-in duration-200">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${activeBusiness.gradient} flex items-center justify-center text-white font-bold text-lg shadow-xl animate-bounce`}
            >
              {activeBusiness.label}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading {activeBusiness.name}…
            </div>
          </div>
        )}

        <div
          className={cn(
            "p-4 md:p-6 transition-opacity duration-300",
            businessLoading && "opacity-0"
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
