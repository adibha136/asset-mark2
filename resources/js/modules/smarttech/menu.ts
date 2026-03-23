import {
  LayoutDashboard,
  Package,
  Building2,
  Users,
  ClipboardCheck,
  Settings,
  HelpCircle,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface MenuItem {
  name: string;
  path: string;
  icon: LucideIcon;
  children?: { name: string; path: string; icon: LucideIcon }[];
}

const menu: MenuItem[] = [
  { name: "Dashboard", path: "/smarttech/dashboard", icon: LayoutDashboard },
  {
    name: "Assets",
    path: "/smarttech/assets",
    icon: Package,
    children: [
      { name: "Overview", path: "/smarttech/assets", icon: Package },
      { name: "Asset Report", path: "/smarttech/assets/report", icon: Package },
    ],
  },
  { name: "Tenants", path: "/smarttech/tenants", icon: Building2 },
  { name: "Users & Roles", path: "/smarttech/users-roles", icon: Users },
  { name: "Checklists", path: "/smarttech/checklists", icon: ClipboardCheck },
];

export const bottomMenu = [
  { name: "Settings", path: "/smarttech/settings", icon: Settings },
  { name: "Help", path: "/smarttech/help", icon: HelpCircle },
];

export default menu;
