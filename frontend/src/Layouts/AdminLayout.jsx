import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiHome, FiList, FiUsers, FiBarChart2, FiHelpCircle,
  FiLogOut, FiMenu, FiShield, FiBell, FiChevronRight, FiCpu
} from 'react-icons/fi';

const navItems = [
  { to: '/admin/dashboard', icon: FiHome, label: 'Dashboard' },
  { to: '/admin/tickets', icon: FiList, label: 'Tickets' },
  { to: '/admin/agents', icon: FiUsers, label: 'Agents' },
  { to: '/admin/analytics', icon: FiBarChart2, label: 'Analytics' },
  { to: '/admin/faq', icon: FiHelpCircle, label: 'FAQ Management' },
  { to: '/admin/ai-agent', icon: FiCpu, label: 'AI Agent' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/'); };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const Sidebar = ({ mobile }) => (
    <div className={`${mobile ? 'flex' : 'hidden md:flex'} flex-col h-full bg-slate-900 text-white`}>
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <FiShield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm">Sam AI</div>
            <div className="text-xs text-slate-400">Admin Panel</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Profile Section (unchanged) */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800 mb-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.name}</div>
            <div className="text-xs text-slate-400">Administrator</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-900/20 rounded-xl transition-all"
        >
          <FiLogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <div className="hidden md:flex w-64 flex-shrink-0 flex-col">
        <Sidebar />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-64 flex-col h-full z-10">
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header with Clickable Profile Button */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="md:hidden text-slate-500">
              <FiMenu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
              <FiShield className="w-4 h-4 text-blue-600" />
              <FiChevronRight className="w-3 h-3" />
              <span className="font-medium text-slate-700">Admin Dashboard</span>
            </div>
          </div>

          {/* Top Right Clickable Profile (No Down Arrow) */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-full hover:opacity-90 transition-all shadow-sm"
            >
              <span className="text-white text-sm font-medium">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </span>
            </button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {user?.name?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-800">{user?.name || 'Admin'}</div>
                      <div className="text-xs text-slate-500">{user?.email || 'admin@example.com'}</div>
                    </div>
                  </div>
                </div>
                
                <div className="px-4 py-2">
                  <div className="text-xs text-slate-400 mb-2">Role</div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      Administrator
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-slate-100 mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <FiLogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Add animation CSS */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}