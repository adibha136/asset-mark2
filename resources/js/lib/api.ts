import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Helper to get tenant_id from multiple sources
const getTenantId = (): string | null => {
  // First check localStorage
  let tenantId = localStorage.getItem("tenant_id");
  if (tenantId) return tenantId;

  // Then check user data
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.tenant_id) {
        tenantId = user.tenant_id;
        localStorage.setItem("tenant_id", tenantId);
        return tenantId;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  return null;
};

// Add a request interceptor to attach the token and tenant_id
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const tenantId = getTenantId();

  // Add tenant_id as a query parameter to all requests
  if (tenantId) {
    if (!config.params) {
      config.params = {};
    }
    // Only add if not already present
    if (!config.params.tenant_id) {
      config.params.tenant_id = tenantId;
    }
  }

  return config;
});

export default api;
