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
  ChevronDown,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
  mobileMenuOpen: boolean;
  onMobileClose: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { 
    name: "Assets", 
    href: "/assets", 
    icon: Package,
    children: [
      { name: "Overview", href: "/assets", icon: Package },
      { name: "Asset Report", href: "/assets/report", icon: BarChart3 },
    ]
  },
  { name: "Tenants", href: "/tenants", icon: Building2 },
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
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  // Automatically open submenus if a child is active
  useEffect(() => {
    navigation.forEach(item => {
      if (item.children?.some(child => location.pathname === child.href)) {
        if (!openMenus.includes(item.name)) {
          setOpenMenus(prev => [...prev, item.name]);
        }
      }
    });
  }, [location.pathname]);

  const toggleMenu = (name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenus(prev => 
      prev.includes(name) 
        ? prev.filter(i => i !== name) 
        : [...prev, name]
    );
  };

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
                Puppy Management
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
            const hasChildren = item.children && item.children.length > 0;
            const isMenuOpen = openMenus.includes(item.name);
            const isChildActive = item.children?.some(child => location.pathname === child.href);
            const isParentActive = location.pathname === item.href;
            const isActive = isParentActive || isChildActive;

            if (hasChildren && !collapsed) {
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={(e) => toggleMenu(item.name, e)}
                    className={cn(
                      "sidebar-item w-full flex items-center justify-between group",
                      isActive && "sidebar-item-active"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
                      <span>{item.name}</span>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isMenuOpen && "rotate-180")} />
                  </button>
                  {isMenuOpen && (
                    <div className="ml-4 pl-4 border-l border-sidebar-border space-y-1 mt-1 animate-in slide-in-from-top-1 duration-200">
                      {item.children?.map((child) => {
                        const isChildLinkActive = location.pathname === child.href;
                        return (
                          <NavLink
                            key={child.name}
                            to={child.href}
                            className={cn(
                              "sidebar-item text-sm py-2 px-3 h-9",
                              isChildLinkActive ? "bg-primary/10 text-primary font-medium" : "text-sidebar-muted hover:text-sidebar-foreground"
                            )}
                          >
                            {child.icon && <child.icon className="w-4 h-4 mr-2" />}
                            <span>{child.name}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.name}
                to={item.href || "#"}
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
