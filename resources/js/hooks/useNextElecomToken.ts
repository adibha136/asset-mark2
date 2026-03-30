import { useCallback } from 'react';

export const useNextElecomToken = () => {
  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/nextelecom/settings/token');
      if (response.ok) {
        const result = await response.json();
        return result?.data?.token || null;
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch token from database:', err);
      return null;
    }
  }, []);

  return { getToken };
};
