import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import {
  registerCapacitorFcmAndSync,
  syncStoredFcmTokenWithServer,
  unregisterCapacitorFcmFromServerBeforeLogout,
} from '../utils/capacitorFcm';

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function triggerFcmRegistrationSoon() {
  setTimeout(() => {
    void syncStoredFcmTokenWithServer();
    void registerCapacitorFcmAndSync();
  }, 500);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (!token) {
      delete axios.defaults.headers.common.Authorization;
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;

    (async () => {
      try {
        const res = await axios.get(`${API_URL}/auth/me`, { timeout: 10000 });
        if (!cancelled) setUser(res.data.user);
      } catch (error) {
        if (cancelled) return;
        if (
          error.code === 'ECONNABORTED' ||
          error.code === 'ERR_NETWORK' ||
          error.message === 'Network Error' ||
          error.code === 'ERR_CONNECTION_REFUSED'
        ) {
          console.warn('Serveur non disponible. Session locale conservée.');
          setUser(null);
        } else if (error.response?.status === 401) {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common.Authorization;
          setToken(null);
          setUser(null);
        } else {
          console.error('Erreur lors de la récupération de l’utilisateur:', error);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/me`, {
        timeout: 10000,
      });
      setUser(res.data.user);
    } catch (error) {
      if (
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' ||
        error.message === 'Network Error' ||
        error.code === 'ERR_CONNECTION_REFUSED'
      ) {
        console.warn('Serveur non disponible. Session locale conservée.');
        setUser(null);
      } else if (error.response?.status === 401) {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common.Authorization;
        setToken(null);
        setUser(null);
      } else {
        console.error('Erreur lors de la récupération de l’utilisateur:', error);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      if (res.data?.requiresTwoFactor) {
        return {
          success: true,
          requiresTwoFactor: true,
          challengeToken: res.data.challengeToken,
          user: res.data.user,
        };
      }
      const { token: newToken, user: newUser } = res.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      triggerFcmRegistrationSoon();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Erreur de connexion' };
    }
  };

  const loginWithToken = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    triggerFcmRegistrationSoon();
  };

  const loginWithGoogle = async (credential) => {
    try {
      const res = await axios.post(`${API_URL}/auth/google`, { credential }, { timeout: 25000 });
      if (res.data?.requiresTwoFactor) {
        return {
          success: true,
          requiresTwoFactor: true,
          challengeToken: res.data.challengeToken,
          user: res.data.user,
        };
      }
      const { token: newToken, user: newUser } = res.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      triggerFcmRegistrationSoon();
      return { success: true };
    } catch (error) {
      const serverMsg = error.response?.data?.message;
      if (!error.response) {
        const net =
          error.code === 'ECONNABORTED' || error.message === 'Network Error'
            ? 'Réseau indisponible ou serveur trop long à répondre. Vérifie la connexion et que l’API (REACT_APP_API_URL) est joignable depuis l’app.'
            : error.message || 'Impossible de joindre le serveur.';
        return { success: false, message: net };
      }
      return { success: false, message: serverMsg || 'Erreur connexion Google' };
    }
  };

  const register = async (userData) => {
    try {
      const res = await axios.post(`${API_URL}/auth/register`, userData);
      const { token: newToken, user: newUser } = res.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      triggerFcmRegistrationSoon();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Erreur d\'inscription' };
    }
  };

  const logout = () => {
    void unregisterCapacitorFcmFromServerBeforeLogout();
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const updatePosition = async (latitude, longitude, adresse) => {
    try {
      await axios.put(`${API_URL}/auth/position`, { latitude, longitude, adresse });
      await fetchUser();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Erreur' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      loading,
      login,
      loginWithToken,
      loginWithGoogle,
      register,
      logout,
      updatePosition,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
