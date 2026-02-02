import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Search, LogOut, Menu, User, Building2, Laptop } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface SearchResults {
  assets: any[];
  tenants: any[];
  users: any[];
}

interface TopNavProps {
  sidebarCollapsed: boolean;
  onMenuClick: () => void;
  isMobile: boolean;
}

export function TopNav({ sidebarCollapsed, onMenuClick, isMobile }: TopNavProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setResults(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleLogout = async () => {
    await logout();
  };

  const hasResults = results && (results.assets.length > 0 || results.tenants.length > 0 || results.users.length > 0);

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-card/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 md:px-6 transition-all duration-300",
        !isMobile 
          ? (sidebarCollapsed ? "left-16" : "left-64") 
          : "left-0"
      )}
    >
      <div className="flex items-center gap-2 md:gap-4 flex-1 max-w-xl">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="flex-shrink-0">
            <Menu className="w-5 h-5" />
          </Button>
        )}
        
        <div
          className={cn(
            "relative flex-1 transition-all duration-200",
            searchFocused && "scale-[1.02]"
          )}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder={isMobile ? "Search..." : "Search assets, tenants, users..."}
            className="pl-10 bg-muted/50 border-0 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => {
              // Delay blur to allow clicking results
              setTimeout(() => setSearchFocused(false), 200);
            }}
          />
          {!isMobile && (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          )}

          {/* Search Results Dropdown */}
          {searchFocused && (searchQuery || loading) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-[80vh] overflow-y-auto z-50">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
              ) : !hasResults ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No results found for "{searchQuery}"</div>
              ) : (
                <div className="p-2">
                  {results.assets.length > 0 && (
                    <div className="mb-2">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assets</div>
                      {results.assets.map((asset) => (
                        <button
                          key={asset.id}
                          className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            navigate(`/assets/${asset.id}`);
                            setSearchFocused(false);
                          }}
                        >
                          <Laptop className="w-4 h-4 text-primary" />
                          <div className="flex flex-col">
                            <span>{asset.name}</span>
                            <span className="text-xs text-muted-foreground">{asset.serial_number}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.tenants.length > 0 && (
                    <div className="mb-2">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tenants</div>
                      {results.tenants.map((tenant) => (
                        <button
                          key={tenant.id}
                          className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            navigate(`/tenants`);
                            setSearchFocused(false);
                          }}
                        >
                          <Building2 className="w-4 h-4 text-primary" />
                          <div className="flex flex-col">
                            <span>{tenant.name}</span>
                            <span className="text-xs text-muted-foreground">{tenant.domain}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.users.length > 0 && (
                    <div className="mb-2">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Users</div>
                      {results.users.map((user) => (
                        <button
                          key={user.id}
                          className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            navigate(`/tenants/${user.tenant_id}/users/${user.id}/assets`);
                            setSearchFocused(false);
                          }}
                        >
                          <User className="w-4 h-4 text-primary" />
                          <div className="flex flex-col">
                            <span>{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-1 md:gap-3">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Badge variant="info" className="text-xs">3 new</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-64 overflow-y-auto">
              <DropdownMenuItem className="group flex flex-col items-start gap-1 py-3 focus:bg-accent">
                <span className="font-medium group-focus:text-accent-foreground">New asset added</span>
                <span className="text-xs text-muted-foreground group-focus:text-accent-foreground/70">MacBook Pro 16" was registered</span>
                <span className="text-xs text-muted-foreground group-focus:text-accent-foreground/70">2 minutes ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="group flex flex-col items-start gap-1 py-3 focus:bg-accent">
                <span className="font-medium group-focus:text-accent-foreground">Sync completed</span>
                <span className="text-xs text-muted-foreground group-focus:text-accent-foreground/70">Directory sync finished successfully</span>
                <span className="text-xs text-muted-foreground group-focus:text-accent-foreground/70">1 hour ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="group flex flex-col items-start gap-1 py-3 focus:bg-accent">
                <span className="font-medium group-focus:text-accent-foreground">User role updated</span>
                <span className="text-xs text-muted-foreground group-focus:text-accent-foreground/70">John Doe promoted to Admin</span>
                <span className="text-xs text-muted-foreground group-focus:text-accent-foreground/70">3 hours ago</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Logout Button */}
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 px-2 md:px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline font-medium">Logout</span>
        </Button>
      </div>
    </header>
  );
}
