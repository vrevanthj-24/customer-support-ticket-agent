import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ticketAPI, agentAPI, userAPI } from '../../services/api';
import { FiInbox, FiClock, FiCheckCircle, FiUsers, FiZap, FiTrendingUp, FiArrowRight, FiActivity } from 'react-icons/fi';

const statusBadge = { open: 'bg-yellow-100 text-yellow-700', 'in-progress': 'bg-blue-100 text-blue-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-slate-100 text-slate-500' };
const priorityBadge = { P1: 'bg-red-100 text-red-700', P2: 'bg-orange-100 text-orange-700', P3: 'bg-yellow-100 text-yellow-700', P4: 'bg-green-100 text-green-700' };

export default function AdminDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [tRes, aRes] = await Promise.all([ticketAPI.getAll(), agentAPI.getAll()]);
        const tickets = tRes.data;
        setRecentTickets(tickets.slice(0, 8));
        setAgents(aRes.data);
        const total = tickets.length;
        const open = tickets.filter(t => t.status === 'open').length;
        const inProgress = tickets.filter(t => t.status === 'in-progress').length;
        const resolved = tickets.filter(t => t.status === 'resolved').length;
        const p1 = tickets.filter(t => t.priority === 'P1').length;
        const p2 = tickets.filter(t => t.priority === 'P2').length;
        setAnalytics({ total, open, inProgress, resolved, p1, p2 });
      } catch {}
      setLoading(false);
    })();
  }, []);

  const statCards = [
    { label: 'Total Tickets', value: analytics?.total ?? '—', icon: FiInbox, color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Open', value: analytics?.open ?? '—', icon: FiClock, color: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-600' },
    { label: 'In Progress', value: analytics?.inProgress ?? '—', icon: FiActivity, color: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-600' },
    { label: 'Resolved', value: analytics?.resolved ?? '—', icon: FiCheckCircle, color: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-600' },
    { label: 'Active Agents', value: agents.filter(a => a.status === 'active').length, icon: FiUsers, color: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-600' },
    { label: 'Critical (P1)', value: analytics?.p1 ?? '—', icon: FiZap, color: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-600' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back, {user?.name}. Here's your system overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className={`${s.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${s.text}`} />
              </div>
              <div className="text-2xl font-bold text-slate-800">{loading ? '...' : s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Recent Tickets */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Recent Tickets</h2>
            <Link to="/admin/tickets" className="text-sm text-blue-600 hover:text-blue-500 flex items-center gap-1">View all <FiArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-sm">Loading...</div>
            ) : recentTickets.map(t => (
              <Link key={t.ticket_id} to={`/admin/tickets/${t.ticket_id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-all group">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600">{t.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">#{t.ticket_id} · {new Date(t.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadge[t.priority]}`}>{t.priority}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[t.status]}`}>{t.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Priority Breakdown + Agents */}
        <div className="space-y-4">
          {/* Priority dist */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-4">Priority Distribution</h3>
            {analytics && (
              <div className="space-y-2">
                {[
                  { label: 'P1 Critical', count: analytics.p1, total: analytics.total, color: 'bg-red-500' },
                  { label: 'P2 High', count: analytics.p2, total: analytics.total, color: 'bg-orange-500' },
                  { label: 'P3 Medium', count: analytics.total - analytics.p1 - analytics.p2, total: analytics.total, color: 'bg-yellow-500' },
                ].map(p => (
                  <div key={p.label}>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>{p.label}</span><span>{p.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${p.color} rounded-full transition-all`}
                        style={{ width: `${p.total ? (p.count / p.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agent Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Agents</h3>
              <Link to="/admin/agents" className="text-xs text-blue-600 hover:text-blue-500">Manage</Link>
            </div>
            <div className="space-y-2">
              {agents.slice(0, 4).map(a => (
                <div key={a.agent_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                      {a.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-700 truncate max-w-[120px]">{a.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {a.status}
                  </span>
                </div>
              ))}
              {agents.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No agents yet</p>}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/admin/ai-agent" className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl transition-all">
                <FiZap className="w-4 h-4 text-blue-500" /> Run AI Agent
              </Link>
              <Link to="/admin/tickets?status=open" className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl transition-all">
                <FiInbox className="w-4 h-4 text-yellow-500" /> Open Tickets
              </Link>
              <Link to="/admin/analytics" className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl transition-all">
                <FiTrendingUp className="w-4 h-4 text-green-500" /> View Analytics
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}