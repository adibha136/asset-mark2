import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export type BusinessId = "smarttech" | "nextelecom";

export interface Business {
  id: BusinessId;
  name: string;
  label: string;
  color: string;
  gradient: string;
  icon: string;
}

export const BUSINESSES: Business[] = [
  {
    id: "smarttech",
    name: "Smart Tech",
    label: "ST",
    color: "#6366f1",
    gradient: "from-indigo-500 to-purple-600",
    icon: "🏢",
  },
  {
    id: "nextelecom",
    name: "NexTelecom",
    label: "NT",
    color: "#0ea5e9",
    gradient: "from-sky-500 to-cyan-600",
    icon: "📡",
  },
];

interface BusinessContextType {
  activeBusiness: Business;
  setActiveBusiness: (business: Business) => void;
  isLoading: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeBusiness, setActiveBusinessState] = useState<Business>(() => {
    const saved = localStorage.getItem("active_business");
    if (saved) {
      const found = BUSINESSES.find((b) => b.id === saved);
      if (found) return found;
    }
    return BUSINESSES[0]; // Default: SmartTech
  });

  const setActiveBusiness = (business: Business) => {
    if (business.id === activeBusiness.id) return;
    setIsLoading(true);
    localStorage.setItem("active_business", business.id);
    setTimeout(() => {
      setActiveBusinessState(business);
      setIsLoading(false);
    }, 400);
  };

  return (
    <BusinessContext.Provider value={{ activeBusiness, setActiveBusiness, isLoading }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
};
