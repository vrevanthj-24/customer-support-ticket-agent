import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiMessageSquare, FiShield, FiEye, FiEyeOff } from 'react-icons/fi';

export default function LoginPage() {
  const { role } = useParams(); // 'admin' | 'customer'
  const isAdmin = role === 'admin';
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(form.email, form.password);
    setLoading(false);
    if (res.success) {
      if (res.user.is_admin) navigate('/admin/dashboard');
      else navigate('/customer/dashboard');
    }
  };

  return (
    <div className={`min-h-screen flex ${isAdmin ? 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'}`}>
      {/* Left panel */}
      <div className={`hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-16 ${isAdmin ? 'text-white' : 'text-slate-800'}`}>
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-8 ${isAdmin ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-100'}`}>
          {isAdmin ? <FiShield className="w-10 h-10 text-blue-400" /> : <FiMessageSquare className="w-10 h-10 text-blue-600" />}
        </div>
        <h1 className={`text-4xl font-bold mb-4 ${isAdmin ? 'text-white' : 'text-slate-800'}`}>
          {isAdmin ? 'Admin Command Center' : 'Customer Support Portal'}
        </h1>
        <p className={`text-lg text-center max-w-sm ${isAdmin ? 'text-slate-400' : 'text-slate-500'}`}>
          {isAdmin
            ? 'Manage tickets, agents, and monitor AI performance from your dashboard.'
            : 'Submit tickets, track issues, and get AI-powered support assistance.'}
        </p>
        <div className="mt-12 space-y-4 w-full max-w-sm">
          {(isAdmin
            ? ['Full ticket management', 'AI triage & suggestions', 'Analytics & reports', 'Agent & FAQ management']
            : ['Submit support tickets', 'Track ticket status', 'AI chat assistant', 'Browse knowledge base']
          ).map((item, i) => (
            <div key={i} className={`flex items-center gap-3 ${isAdmin ? 'text-slate-300' : 'text-slate-600'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${isAdmin ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>✓</div>
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className={`w-full lg:w-1/2 flex items-center justify-center p-8 ${isAdmin ? 'bg-slate-800/50' : 'bg-white'}`}>
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAdmin ? 'bg-blue-600' : 'bg-blue-600'}`}>
                {isAdmin ? <FiShield className="w-4 h-4 text-white" /> : <FiMessageSquare className="w-4 h-4 text-white" />}
              </div>
              <span className={`text-sm font-medium ${isAdmin ? 'text-slate-400' : 'text-slate-500'}`}>
                {isAdmin ? 'Administrator' : 'Customer'}
              </span>
            </div>
            <h2 className={`text-3xl font-bold ${isAdmin ? 'text-white' : 'text-slate-800'}`}>Sign in</h2>
            <p className={`mt-2 text-sm ${isAdmin ? 'text-slate-400' : 'text-slate-500'}`}>
              {isAdmin ? 'Access your admin dashboard' : 'Welcome back! Sign in to continue'}
            </p>
          </div>

          <form onSubmit={handle} className="space-y-5">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isAdmin ? 'text-slate-300' : 'text-slate-700'}`}>Email</label>
              <div className="relative">
                <FiMail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isAdmin ? 'text-slate-400' : 'text-slate-400'}`} />
                <input
                  type="email" required
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all ${isAdmin
                    ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isAdmin ? 'text-slate-300' : 'text-slate-700'}`}>Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'} required
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-3 rounded-xl border text-sm outline-none transition-all ${isAdmin
                    ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {/* Forgot Password Link */}
            <div className="text-right">
              <Link 
                to="/forgot-password" 
                className={`text-sm ${isAdmin ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'} transition-colors`}
              >
                Forgot password?
              </Link>
            </div>
            
            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            {!isAdmin && (
              <p className={`text-sm ${isAdmin ? 'text-slate-400' : 'text-slate-500'}`}>
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-500 hover:text-blue-400 font-medium">Create one</Link>
              </p>
            )}
            <p className={`text-sm ${isAdmin ? 'text-slate-400' : 'text-slate-500'}`}>
              {isAdmin ? (
                <Link to="/login/customer" className="text-blue-400 hover:text-blue-300">← Customer Portal</Link>
              ) : (
                <Link to="/login/admin" className="text-blue-500 hover:text-blue-400">Admin Portal →</Link>
              )}
            </p>
            <Link to="/" className={`block text-xs ${isAdmin ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'}`}>← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}