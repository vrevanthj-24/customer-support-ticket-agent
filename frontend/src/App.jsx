import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import CustomerLayout from './Layouts/CustomerLayout';
import AdminLayout from './Layouts/AdminLayout';

import LandingPage from './pages/Landingpage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import CustomerDashboard from './pages/customer/Dashboard';
import CustomerTickets from './pages/customer/Tickets';
import CustomerTicketDetail from './pages/customer/TicketDetail';
import CreateTicket from './pages/customer/CreateTicket';
import CustomerChat from './pages/customer/Chat';
import CustomerFAQ from './pages/customer/FAQ';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTickets from './pages/admin/AdminTickets';
import AdminTicketDetail from './pages/admin/AdminTicketDetail';
import AdminAgents from './pages/admin/AdminAgents';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminFAQ from './pages/admin/AdminFAQ';
import AdminAIAgent from './pages/admin/AdminAIAgent';

import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
  </div>
);

// ProtectedRoute MUST be inside Router & AuthProvider — defined inside AppRoutes
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/login/customer" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/customer/dashboard" replace />;
  if (!requireAdmin && isAdmin) return <Navigate to="/admin/dashboard" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <Spinner />;
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin/dashboard' : '/customer/dashboard'} replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login/:role" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/login" element={<Navigate to="/login/customer" replace />} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

      {/* Customer */}
      <Route path="/customer" element={<ProtectedRoute><CustomerLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="tickets" element={<CustomerTickets />} />
        <Route path="tickets/:id" element={<CustomerTicketDetail />} />
        <Route path="new-ticket" element={<CreateTicket />} />
        <Route path="chat" element={<CustomerChat />} />
        <Route path="faq" element={<CustomerFAQ />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="tickets" element={<AdminTickets />} />
        <Route path="tickets/:id" element={<AdminTicketDetail />} />
        <Route path="agents" element={<AdminAgents />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="faq" element={<AdminFAQ />} />
        <Route path="ai-agent" element={<AdminAIAgent />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '12px', fontSize: '14px' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}