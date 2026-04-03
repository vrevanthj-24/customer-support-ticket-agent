import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ticketAPI, userAPI } from '../../services/api';
import { FiPlusCircle, FiList, FiCheckCircle, FiClock, FiAlertCircle, FiArrowRight, FiMessageSquare } from 'react-icons/fi';

const statusBadge = {
  open: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'in-progress': 'bg-blue-100 text-blue-700 border-blue-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};
const priorityBadge = {
  P1: 'bg-red-100 text-red-700 border-red-200',
  P2: 'bg-orange-100 text-orange-700 border-orange-200',
  P3: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  P4: 'bg-green-100 text-green-700 border-green-200',
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [tRes] = await Promise.all([ticketAPI.getAll()]);
        const t = tRes.data;
        setTickets(t.slice(0, 5));
        setStats({
          total: t.length,
          open: t.filter(x => x.status === 'open').length,
          resolved: t.filter(x => x.status === 'resolved').length,
        });
      } catch {}
      setLoading(false);
    })();
  }, []);

  const statCards = [
    { label: 'Total Tickets', value: stats.total, icon: FiList, color: 'bg-blue-500', bg: 'bg-blue-50' },
    { label: 'Open', value: stats.open, icon: FiClock, color: 'bg-yellow-500', bg: 'bg-yellow-50' },
    { label: 'Resolved', value: stats.resolved, icon: FiCheckCircle, color: 'bg-green-500', bg: 'bg-green-50' },
  ];

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-slate-500 mt-1">Here's an overview of your support activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <div className={`${s.bg} p-3 rounded-xl`}>
                <Icon className={`w-6 h-6 ${s.color.replace('bg-', 'text-')}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{s.value}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link to="/customer/new-ticket" className="group bg-blue-600 hover:bg-blue-500 text-white rounded-2xl p-6 flex items-center justify-between transition-all shadow-lg shadow-blue-200">
          <div>
            <div className="font-bold text-lg">Submit New Ticket</div>
            <div className="text-blue-100 text-sm mt-1">Get help from our support team</div>
          </div>
          <FiPlusCircle className="w-8 h-8 opacity-80 group-hover:scale-110 transition-transform" />
        </Link>
        <Link to="/customer/chat" className="group bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-center justify-between transition-all">
          <div>
            <div className="font-bold text-lg text-slate-800">AI Chat Assistant</div>
            <div className="text-slate-500 text-sm mt-1">Get instant AI-powered help</div>
          </div>
          <FiMessageSquare className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
        </Link>
      </div>

      {/* Recent Tickets */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Recent Tickets</h2>
          <Link to="/customer/tickets" className="text-sm text-blue-600 hover:text-blue-500 flex items-center gap-1">
            View all <FiArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center">
            <FiAlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400">No tickets yet</p>
            <Link to="/customer/new-ticket" className="text-blue-600 text-sm hover:text-blue-500 mt-2 inline-block">Submit your first ticket →</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tickets.map(t => (
              <Link key={t.ticket_id} to={`/customer/tickets/${t.ticket_id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-all group">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">{t.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">#{t.ticket_id} · {new Date(t.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${priorityBadge[t.priority]}`}>{t.priority}</span>
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${statusBadge[t.status]}`}>{t.status.replace('-', ' ')}</span>
                  <FiArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}