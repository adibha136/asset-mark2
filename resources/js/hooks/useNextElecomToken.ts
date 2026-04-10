import { useCallback } from 'react';
import api from '@/lib/api';

export const useNextElecomToken = () => {
  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      console.log("[useNextElecomToken] Fetching token. TenantId:", localStorage.getItem("tenant_id"));
      
      const response = await api.get('/nextelecom/settings/token');
      console.log("[useNextElecomToken] Response:", response.data);
      
      if (response.data?.data?.token) {
        console.log("[useNextElecomToken] Token found!");
        return response.data.data.token;
      }
      
      console.log("[useNextElecomToken] No token in response");
      return null;
    } catch (err) {
      console.error('[useNextElecomToken] Failed to fetch token from database:', err);
      return null;
    }
  }, []);

  return { getToken };
};
