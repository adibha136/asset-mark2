import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Lazy load all pages for this business module
const Dashboard   = lazy(() => import("./pages/Dashboard"));
const Assets      = lazy(() => import("./pages/Assets"));
const AssetReport = lazy(() => import("./pages/AssetReport"));
const Tenants     = lazy(() => import("./pages/Tenants"));
const UsersRoles  = lazy(() => import("./pages/UsersRoles"));
const Checklists  = lazy(() => import("./pages/Checklists"));
const Settings    = lazy(() => import("./pages/Settings"));
const Help        = lazy(() => import("./pages/Help"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

export function SmartTechRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"        element={<Dashboard />} />
        <Route path="assets"           element={<Assets />} />
        <Route path="assets/report"    element={<AssetReport />} />
        <Route path="tenants"          element={<Tenants />} />
        <Route path="users-roles"      element={<UsersRoles />} />
        <Route path="checklists"       element={<Checklists />} />
        <Route path="settings"         element={<Settings />} />
        <Route path="help"             element={<Help />} />
        <Route path="*"                element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
