import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ticketAPI } from '../../services/api';
import { FiSearch, FiFilter, FiPlusCircle, FiArrowRight, FiInbox } from 'react-icons/fi';

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

export default function CustomerTickets() {
  const [tickets, setTickets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ticketAPI.getAll().then(({ data }) => {
      setTickets(data);
      setFiltered(data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let res = tickets;
    if (statusFilter !== 'all') res = res.filter(t => t.status === statusFilter);
    if (search) res = res.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || String(t.ticket_id).includes(search));
    setFiltered(res);
  }, [search, statusFilter, tickets]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Tickets</h1>
          <p className="text-slate-500 text-sm mt-1">{tickets.length} total tickets</p>
        </div>
        <Link to="/customer/new-ticket" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm">
          <FiPlusCircle className="w-4 h-4" /> New Ticket
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FiInbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No tickets found</p>
            <Link to="/customer/new-ticket" className="text-blue-600 text-sm mt-2 inline-block hover:text-blue-500">Submit a new ticket →</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Header */}
            <div className="grid grid-cols-12 px-6 py-3 text-xs font-semibold text-slate-400 uppercase bg-slate-50">
              <div className="col-span-1">#ID</div>
              <div className="col-span-5">Subject</div>
              <div className="col-span-2">Priority</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Date</div>
            </div>
            {filtered.map(t => (
              <Link
                key={t.ticket_id} to={`/customer/tickets/${t.ticket_id}`}
                className="grid grid-cols-12 items-center px-6 py-4 hover:bg-slate-50 transition-all group"
              >
                <div className="col-span-1 text-sm text-slate-400 font-mono">#{t.ticket_id}</div>
                <div className="col-span-5 pr-4">
                  <div className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">{t.title}</div>
                </div>
                <div className="col-span-2">
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${priorityBadge[t.priority]}`}>{t.priority}</span>
                </div>
                <div className="col-span-2">
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${statusBadge[t.status]}`}>{t.status.replace('-', ' ')}</span>
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString()}</span>
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