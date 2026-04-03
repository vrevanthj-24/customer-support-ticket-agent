import React from 'react';
import { Link } from 'react-router-dom';
import { FiZap, FiShield, FiMessageSquare, FiTrendingUp, FiCheckCircle, FiArrowRight, FiUsers, FiClock, FiHeart } from 'react-icons/fi';

const features = [
  { icon: FiZap, title: 'AI-Powered Triage', desc: 'Automatically categorizes and prioritizes tickets using advanced AI', color: 'text-yellow-500 bg-yellow-50' },
  { icon: FiMessageSquare, title: 'Smart Reply Suggestions', desc: 'AI suggests contextual replies based on past resolved tickets', color: 'text-blue-500 bg-blue-50' },
  { icon: FiTrendingUp, title: 'Auto-Growing FAQ', desc: 'Automatically builds FAQ from resolved tickets', color: 'text-green-500 bg-green-50' },
  { icon: FiShield, title: 'Priority Routing', desc: 'P1–P4 priority system with smart department routing', color: 'text-purple-500 bg-purple-50' },
];

const stats = [
  { icon: FiZap, value: '85%', label: 'Faster Response', color: 'from-yellow-400 to-orange-500' },
  { icon: FiUsers, value: '60%', label: 'Reduced Workload', color: 'from-blue-400 to-blue-600' },
  { icon: FiHeart, value: '95%', label: 'Customer Satisfaction', color: 'from-pink-400 to-rose-500' },
  { icon: FiClock, value: '24/7', label: 'AI Support', color: 'from-green-400 to-emerald-600' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white overflow-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
            <FiMessageSquare className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg">Sam AI</span>
        </div>
        <div className="flex gap-3">
          <Link to="/login/customer" className="px-4 py-2 text-sm text-blue-300 hover:text-white border border-blue-500/40 hover:border-blue-400 rounded-lg transition-all">
            Customer Portal
          </Link>
          <Link to="/login/admin" className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-all">
            Admin Portal
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center py-24 px-8 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-6">
            <FiZap className="w-3.5 h-3.5" /> Powered by AI
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Customer Support<br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Ticket Management</span>
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Transform your customer support with AI that auto-triages tickets, suggests replies, and builds a self-improving knowledge base.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login/customer" className="group flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40">
              Customer Portal <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/login/admin" className="group flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all">
              Admin Dashboard <FiShield className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-all">
                <div className={`w-12 h-12 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold mb-1">{s.value}</div>
                <div className="text-sm text-slate-400">{s.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Powerful Features for Modern Support</h2>
          <p className="text-slate-400 text-center mb-12">Everything you need to deliver exceptional customer support with AI assistance</p>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group">
                  <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8">
        <div className="max-w-3xl mx-auto bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-slate-300 mb-8">Choose your portal to begin</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-white text-blue-900 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-all">
              Create Account
            </Link>
            <Link to="/login/admin" className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-500 transition-all">
              Admin Login
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 px-8 text-center text-slate-500 text-sm">
        © 2026 SamAI. AI-Powered Customer Support Platform.
      </footer>
    </div>
  );
}