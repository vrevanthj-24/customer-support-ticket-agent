import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiLock, FiPhone, FiMessageSquare, FiEye, FiEyeOff } from 'react-icons/fi';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handle = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const res = await register({ name, email, phone, password });
    setLoading(false);
    if (res.success) navigate('/login/customer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiMessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Create Account</h1>
          <p className="text-slate-500 text-sm mt-1">Join our support platform</p>
        </div>

        <form onSubmit={handle} autoComplete="off" className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                autoComplete="off"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Doe"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-400' : 'border-slate-200 focus:border-blue-500'}`}
              />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                autoComplete="off"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-400' : 'border-slate-200 focus:border-blue-500'}`}
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
            <div className="relative">
              <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="tel"
                autoComplete="off"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm outline-none transition-all bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className={`w-full pl-10 pr-10 py-3 rounded-xl border text-sm outline-none transition-all bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-400' : 'border-slate-200 focus:border-blue-500'}`}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 ${errors.confirm ? 'border-red-400' : 'border-slate-200 focus:border-blue-500'}`}
              />
            </div>
            {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm}</p>}
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-all mt-2 shadow-lg shadow-blue-200">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login/customer" className="text-blue-600 hover:text-blue-500 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}