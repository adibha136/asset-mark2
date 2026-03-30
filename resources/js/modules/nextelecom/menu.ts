import {
  LayoutDashboard,
  Package,
  Users,
  Wifi,
  UserCheck,
  Settings,
  HelpCircle,
  Phone,
  ListChecks,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface MenuItem {
  name: string;
  path: string;
  icon: LucideIcon;
  children?: { name: string; path: string; icon: LucideIcon }[];
}

const menu: MenuItem[] = [
  { name: "Dashboard",              path: "/nextelecom/dashboard",              icon: LayoutDashboard },
  { name: "Assets",                 path: "/nextelecom/assets",                 icon: Package },
  { name: "Clients",                path: "/nextelecom/clients",                icon: UserCheck },
  { name: "Connectivity",           path: "/nextelecom/connectivity",           icon: Wifi },
  { name: "Users & Roles",          path: "/nextelecom/users-roles",            icon: Users },
  { name: "Customer Verification",  path: "/nextelecom/customer-verification",  icon: Phone },
  { name: "Leads",                  path: "/nextelecom/leads",                  icon: ListChecks },
];

export const bottomMenu = [
  { name: "Settings", path: "/nextelecom/settings", icon: Settings },
  { name: "Help",     path: "/nextelecom/help",     icon: HelpCircle },
];

export default menu;
