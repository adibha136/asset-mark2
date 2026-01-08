import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Building2,
  RefreshCw,
  Users,
  ClipboardCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
  mobileMenuOpen: boolean;
  onMobileClose: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Assets", href: "/assets", icon: Package },
  { name: "Tenants", href: "/tenants", icon: Building2 },
  { name: "Auto Sync", href: "/sync", icon: RefreshCw },
  { name: "Users & Roles", href: "/users", icon: Users },
  { name: "Checklists", href: "/checklists", icon: ClipboardCheck },
];

const bottomNav = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help", href: "/help", icon: HelpCircle },
];

export function Sidebar({ 
  collapsed, 
  onToggle, 
  isMobile, 
  mobileMenuOpen, 
  onMobileClose 
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    // In a real app, you would clear tokens/session here
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-all duration-300"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col",
          !isMobile 
            ? (collapsed ? "w-16" : "w-64") 
            : (mobileMenuOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full")
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            {(!collapsed || isMobile) && (
              <span className="text-lg font-semibold text-sidebar-foreground animate-fade-in">
                AssetHub
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="mb-2">
            {(!collapsed || isMobile) && (
              <span className="px-3 text-xs font-medium uppercase tracking-wider text-sidebar-muted">
                Main Menu
              </span>
            )}
          </div>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "sidebar-item",
                  isActive && "sidebar-item-active",
                  (collapsed && !isMobile) && "justify-center px-0"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
                {(!collapsed || isMobile) && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
          {bottomNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "sidebar-item",
                  isActive && "sidebar-item-active",
                  (collapsed && !isMobile) && "justify-center px-0"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {(!collapsed || isMobile) && <span>{item.name}</span>}
              </NavLink>
            );
          })}
          <div
            onClick={handleLogout}
            className={cn(
              "sidebar-item w-full text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer",
              (collapsed && !isMobile) && "justify-center px-0"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {(!collapsed || isMobile) && <span>Logout</span>}
          </div>
        </div>

        {/* Collapse Toggle - Only on desktop */}
        {!isMobile && (
          <button
            onClick={onToggle}
            className="absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center shadow-md hover:bg-muted transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
      </aside>
    </>
  );
}
