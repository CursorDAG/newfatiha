"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

type HasanatStats = {
  balance: number;
  totalEarned: number;
  breakdown: Array<{
    type: string;
    label: string;
    totalAmount: number;
    count: number;
  }>;
};

type HasanatContextValue = {
  stats: HasanatStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const HasanatCtx = createContext<HasanatContextValue>({
  stats: null,
  loading: true,
  error: null,
  refresh: () => {},
});

export function useHasanat(): HasanatContextValue {
  return useContext(HasanatCtx);
}

export function HasanatProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [stats, setStats] = useState<HasanatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/hasanat/${userId}/stats`);
      if (!res.ok) throw new Error("Ошибка загрузки");
      const data = await res.json();
      setStats(data.stats ?? data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [userId]);

  return (
    <HasanatCtx.Provider value={{ stats, loading, error, refresh: fetchStats }}>
      {children}
    </HasanatCtx.Provider>
  );
}
