import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const SupportWidgetContext = createContext(null);

export function SupportWidgetProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [launch, setLaunch] = useState({ view: 'home', restaurantId: null, productId: null });

  const openSupport = useCallback((options = {}) => {
    setLaunch({
      view: options.view || 'home',
      restaurantId: options.restaurantId ?? null,
      productId: options.productId ?? null,
    });
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      openSupport,
      launch,
    }),
    [open, openSupport, launch]
  );

  return <SupportWidgetContext.Provider value={value}>{children}</SupportWidgetContext.Provider>;
}

export function useSupportWidget() {
  const ctx = useContext(SupportWidgetContext);
  if (!ctx) {
    return {
      open: false,
      setOpen: () => {},
      openSupport: () => {},
      launch: { view: 'home', restaurantId: null, productId: null },
    };
  }
  return ctx;
}
