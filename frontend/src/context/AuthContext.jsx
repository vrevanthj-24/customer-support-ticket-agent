import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await authAPI.login(email, password);
      localStorage.setItem('token', data.access_token);
      const { data: me } = await authAPI.me();
      localStorage.setItem('user', JSON.stringify(me));
      setUser(me);
      toast.success(`Welcome back, ${me.name}!`);
      return { success: true, user: me };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const register = async (data) => {
    try {
      await authAPI.register(data);
      toast.success('Account created! Please log in.');
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.is_admin === true;

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, isAdmin, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};