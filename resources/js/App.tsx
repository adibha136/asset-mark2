import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";

// SmartTech (has real backend)
import { SmartTechRoutes } from "@/modules/smarttech/routes";

// NexTelecom (UI only / mock)
import { NexTelecomRoutes } from "@/modules/nextelecom/routes";

// Legacy / SmartTech direct pages (kept for backward compat)
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import Tenants from "./pages/Tenants";
import UsersRoles from "./pages/UsersRoles";
import TenantUsers from "./pages/TenantUsers";
import AssetDetails from "./pages/AssetDetails";
import AssetReport from "./pages/AssetReport";
import ManageUserAssets from "./pages/ManageUserAssets";
import Settings from "./pages/Settings";
import Checklists from "./pages/Checklists";
import Help from "./pages/Help";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BusinessProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Auth */}
              <Route path="/login" element={<Login />} />

              {/* Root redirect → SmartTech dashboard (default business) */}
              <Route path="/" element={<Navigate to="/smarttech/dashboard" replace />} />

              {/* SmartTech module (all routes under /smarttech/*) */}
              <Route
                path="/smarttech/*"
                element={
                  <AdminLayout>
                    <SmartTechRoutes />
                  </AdminLayout>
                }
              />

              {/* NexTelecom module (all routes under /nextelecom/*) */}
              <Route
                path="/nextelecom/*"
                element={
                  <AdminLayout>
                    <NexTelecomRoutes />
                  </AdminLayout>
                }
              />

              {/* Legacy flat routes — preserved for backward compat */}
              <Route
                path="*"
                element={
                  <AdminLayout>
                    <Routes>
                      <Route path="/assets"                                           element={<Assets />} />
                      <Route path="/assets/report"                                    element={<AssetReport />} />
                      <Route path="/assets/:id"                                       element={<AssetDetails />} />
                      <Route path="/tenants"                                          element={<Tenants />} />
                      <Route path="/tenants/:id/users"                                element={<TenantUsers />} />
                      <Route path="/tenants/:tenantId/users/:userId/assets"           element={<ManageUserAssets />} />
                      <Route path="/users"                                            element={<UsersRoles />} />
                      <Route path="/checklists"                                       element={<Checklists />} />
                      <Route path="/settings"                                         element={<Settings />} />
                      <Route path="/help"                                             element={<Help />} />
                      <Route path="*"                                                 element={<NotFound />} />
                    </Routes>
                  </AdminLayout>
                }
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </BusinessProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
