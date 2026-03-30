import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Lazy load all NexTelecom pages
const Dashboard   = lazy(() => import("./pages/Dashboard"));
const Assets      = lazy(() => import("./pages/Assets"));
const Clients     = lazy(() => import("./pages/Clients"));
const Connectivity= lazy(() => import("./pages/Connectivity"));
const UsersRoles  = lazy(() => import("./pages/UsersRoles"));
const Settings    = lazy(() => import("./pages/Settings"));
const Help        = lazy(() => import("./pages/Help"));
const CustomerVerification = lazy(() => import("./pages/CustomerVerification"));
const Leads       = lazy(() => import("./pages/Leads"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
  </div>
);

export function NexTelecomRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"            element={<Dashboard />} />
        <Route path="assets"               element={<Assets />} />
        <Route path="clients"              element={<Clients />} />
        <Route path="connectivity"         element={<Connectivity />} />
        <Route path="users-roles"          element={<UsersRoles />} />
        <Route path="customer-verification" element={<CustomerVerification />} />
        <Route path="leads"                element={<Leads />} />
        <Route path="settings"             element={<Settings />} />
        <Route path="help"                 element={<Help />} />
        <Route path="*"                    element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
