import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';
import { playNotificationChime } from '../utils/notificationSound';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const NotificationContext = createContext(null);

const POLL_MS = 22000;

export function NotificationProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [summary, setSummary] = useState({
    pendingOrders: 0,
    unreadMessages: 0,
    total: 0,
    role: null,
  });
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const prevRef = useRef(null);
  const bootRef = useRef(true);

  const fetchSummary = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;
    if (!['restaurant', 'gestionnaire', 'client'].includes(user.role)) return;
    try {
      const res = await axios.get(`${API_URL}/notifications/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = res.data || {};
      const next = {
        pendingOrders: Number(d.pendingOrders || 0),
        unreadMessages: Number(d.unreadMessages || 0),
        total: Number(d.total || 0),
        role: d.role || null,
      };
      setSummary(next);

      if (bootRef.current) {
        bootRef.current = false;
        prevRef.current = next;
        return;
      }

      const prev = prevRef.current;
      if (prev) {
        const ordersUp = next.pendingOrders > prev.pendingOrders;
        const msgUp = next.unreadMessages > prev.unreadMessages;
        if (ordersUp || msgUp) {
          playNotificationChime();
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              if (ordersUp && user.role !== 'client') {
                new Notification('Rapido — Nouvelle commande', {
                  body: 'Une nouvelle commande est en attente de traitement.',
                  icon: '/images/logo.png',
                  tag: 'rapido-order',
                });
              } else if (msgUp) {
                new Notification('Rapido — Message', {
                  body: 'Vous avez un nouveau message.',
                  icon: '/images/logo.png',
                  tag: 'rapido-msg',
                });
              }
            } catch (_) {
              /* ignore */
            }
          }
        }
      }
      prevRef.current = next;
    } catch (_) {
      /* réseau / 401 : ignorer */
    }
  }, [user]);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    bootRef.current = true;
    prevRef.current = null;
  }, [user?._id]);

  useEffect(() => {
    if (!user || !['restaurant', 'gestionnaire', 'client'].includes(user.role)) return undefined;
    fetchSummary();
    const id = setInterval(fetchSummary, POLL_MS);
    return () => clearInterval(id);
  }, [user, fetchSummary]);

  const requestBrowserPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied';
    try {
      const p = await Notification.requestPermission();
      setPermission(p);
      return p;
    } catch (_) {
      return 'denied';
    }
  }, []);

  const value = {
    ...summary,
    notificationPermission: permission,
    requestBrowserPermission,
    refreshNotifications: fetchSummary,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      pendingOrders: 0,
      unreadMessages: 0,
      total: 0,
      role: null,
      notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'denied',
      requestBrowserPermission: async () =>
        typeof Notification !== 'undefined' ? Notification.permission : 'denied',
      refreshNotifications: async () => {},
    };
  }
  return ctx;
}

export default NotificationContext;
