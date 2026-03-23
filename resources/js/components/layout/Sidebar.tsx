import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  HelpCircle,
  LogOut,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useBusiness } from "@/contexts/BusinessContext";

// menu types
interface MenuItem {
  name: string;
  path: string;
  icon: LucideIcon;
  children?: { name: string; path: string; icon: LucideIcon }[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
  mobileMenuOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  collapsed,
  onToggle,
  isMobile,
  mobileMenuOpen,
  onMobileClose,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeBusiness } = useBusiness();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [bottomItems, setBottomItems] = useState<MenuItem[]>([]);

  // Dynamically load menu for the active business
  useEffect(() => {
    const load = async () => {
      if (activeBusiness.id === "smarttech") {
        const mod = await import("@/modules/smarttech/menu");
        setMenuItems(mod.default);
        setBottomItems(mod.bottomMenu);
      } else {
        const mod = await import("@/modules/nextelecom/menu");
        setMenuItems(mod.default);
        setBottomItems(mod.bottomMenu);
      }
    };
    load();
    setOpenMenus([]); // collapse submenus on switch
  }, [activeBusiness.id]);

  // Auto-open submenus on route match
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.children?.some((child) => location.pathname.startsWith(child.path))) {
        if (!openMenus.includes(item.name)) {
          setOpenMenus((prev) => [...prev, item.name]);
        }
      }
    });
  }, [location.pathname, menuItems]);

  const toggleMenu = (name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenus((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  };

  const handleLogout = () => navigate("/login");

  // Business accent colour for active items  
  const accentRing =
    activeBusiness.id === "nextelecom" ? "ring-sky-500/20" : "ring-primary/20";
  const activeText =
    activeBusiness.id === "nextelecom" ? "text-sky-500" : "text-primary";
  const activeBg =
    activeBusiness.id === "nextelecom" ? "bg-sky-500/10" : "bg-primary/10";

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
            ? collapsed
              ? "w-16"
              : "w-64"
            : mobileMenuOpen
            ? "w-64 translate-x-0"
            : "w-64 -translate-x-full"
        )}
      >
        {/* Logo / Brand */}
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg bg-gradient-to-br ${activeBusiness.gradient} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md transition-all duration-300`}
            >
              {activeBusiness.label}
            </div>
            {(!collapsed || isMobile) && (
              <span className="text-sm font-semibold text-sidebar-foreground truncate animate-in fade-in duration-200">
                {activeBusiness.name}
              </span>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {(!collapsed || isMobile) && (
            <span className="px-3 text-[10px] font-medium uppercase tracking-widest text-sidebar-muted block mb-2">
              Main Menu
            </span>
          )}

          {menuItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isMenuOpen = openMenus.includes(item.name);
            const isChildActive = item.children?.some((c) =>
              location.pathname.startsWith(c.path)
            );
            const isParentActive = location.pathname === item.path;
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
                      <item.icon
                        className={cn("w-5 h-5 flex-shrink-0", isActive && activeText)}
                      />
                      <span>{item.name}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        isMenuOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {isMenuOpen && (
                    <div className="ml-4 pl-4 border-l border-sidebar-border space-y-1 mt-1 animate-in slide-in-from-top-1 duration-200">
                      {item.children?.map((child) => {
                        const isChildLinkActive = location.pathname.startsWith(child.path);
                        return (
                          <NavLink
                            key={child.name}
                            to={child.path}
                            className={cn(
                              "sidebar-item text-sm py-2 px-3 h-9",
                              isChildLinkActive
                                ? `${activeBg} ${activeText} font-medium`
                                : "text-sidebar-muted hover:text-sidebar-foreground"
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
                to={item.path}
                className={cn(
                  "sidebar-item",
                  isActive && "sidebar-item-active",
                  collapsed && !isMobile && "justify-center px-0"
                )}
              >
                <item.icon
                  className={cn("w-5 h-5 flex-shrink-0", isActive && activeText)}
                />
                {(!collapsed || isMobile) && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
          {bottomItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={cn(
                  "sidebar-item",
                  isActive && "sidebar-item-active",
                  collapsed && !isMobile && "justify-center px-0"
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
              collapsed && !isMobile && "justify-center px-0"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {(!collapsed || isMobile) && <span>Logout</span>}
          </div>
        </div>

        {/* Collapse Toggle - Desktop only */}
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
