import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const DashboardRefreshContext = createContext(null);

export function DashboardRefreshProvider({ children }) {
  const handlerRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);

  const registerRefresh = useCallback((fn) => {
    handlerRef.current = fn;
    return () => {
      if (handlerRef.current === fn) handlerRef.current = null;
    };
  }, []);

  const refresh = useCallback(async () => {
    const fn = handlerRef.current;
    if (!fn) {
      window.location.reload();
      return;
    }
    setRefreshing(true);
    try {
      await fn();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <DashboardRefreshContext.Provider value={{ registerRefresh, refresh, refreshing }}>
      {children}
    </DashboardRefreshContext.Provider>
  );
}

export function useDashboardRefresh() {
  const ctx = useContext(DashboardRefreshContext);
  if (!ctx) {
    return {
      registerRefresh: () => () => {},
      refresh: () => window.location.reload(),
      refreshing: false,
    };
  }
  return ctx;
}

/** Enregistre la fonction qui recharge la page dashboard courante (liste + formulaire ouvert). */
export function useRegisterDashboardRefresh(refreshFn) {
  const { registerRefresh } = useDashboardRefresh();

  useEffect(() => {
    if (typeof refreshFn !== 'function') return undefined;
    return registerRefresh(refreshFn);
  }, [refreshFn, registerRefresh]);
}
