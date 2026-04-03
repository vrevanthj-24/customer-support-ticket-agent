import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiHome, FiList, FiPlusCircle, FiHelpCircle,
  FiLogOut, FiMenu, FiUser, FiChevronRight,
  FiCpu
} from 'react-icons/fi';

const navItems = [
  { to: '/customer/dashboard', icon: FiHome, label: 'Dashboard' },
  { to: '/customer/tickets', icon: FiList, label: 'My Tickets' },
  { to: '/customer/new-ticket', icon: FiPlusCircle, label: 'New Ticket' },
  { to: '/customer/chat', icon: () => <span className="text-lg">🤖</span>, label: 'Sam' },
  { to: '/customer/faq', icon: FiHelpCircle, label: 'FAQ' },
];

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => { 
    logout(); 
    navigate('/'); 
  };

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
    <div className={`${mobile ? 'flex' : 'hidden md:flex'} flex-col h-full bg-white border-r border-slate-200`}>
      {/* Logo */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <FiCpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-800 text-sm">Sam AI</div>
            <div className="text-xs text-slate-400">Customer Portal</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`
            }
          >
            {typeof Icon === 'function' && Icon.name === '' ? <Icon /> : <Icon className="w-4 h-4 flex-shrink-0" />}
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Profile & Sign Out at Bottom */}
      <div className="p-4 border-t border-slate-100 mt-auto">
        {/* Profile Section */}
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Guest'}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email || 'guest@example.com'}</div>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user?.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                {user?.is_admin ? 'Administrator' : 'Customer'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all"
        >
          <FiLogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 flex-shrink-0 flex-col">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-64 flex-col bg-white h-full z-10 shadow-xl">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar - with clickable profile (no down arrow) */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setOpen(true)} 
              className="md:hidden text-slate-500 hover:text-slate-700 transition-colors"
            >
              <FiMenu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
              <FiCpu className="w-4 h-4 text-blue-500" />
              <span className="text-slate-400">/</span>
              <span className="font-medium text-slate-700">Customer Portal</span>
            </div>
          </div>
          
          {/* Top Right Clickable Profile (No Down Arrow) */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full hover:opacity-90 transition-all shadow-sm"
            >
              <span className="text-white text-sm font-medium">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </span>
            </button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-800">{user?.name || 'Guest'}</div>
                      <div className="text-xs text-slate-500">{user?.email || 'guest@example.com'}</div>
                    </div>
                  </div>
                </div>
                
                <div className="px-4 py-2">
                  <div className="text-xs text-slate-400 mb-2">Account Type</div>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${user?.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {user?.is_admin ? 'Administrator' : 'Customer'}
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

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
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