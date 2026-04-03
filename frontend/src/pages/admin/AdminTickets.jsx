import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ticketAPI, agentAPI, userAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiSearch, FiEye, FiZap, FiCheckCircle, FiRefreshCw, FiUser, FiTrash2 } from 'react-icons/fi';

const STATUS_OPTIONS = ['all', 'open', 'in-progress', 'resolved', 'closed'];
const PRIORITY_OPTIONS = ['all', 'P1', 'P2', 'P3', 'P4'];

const statusBadge = {
  open: 'bg-yellow-100 text-yellow-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-500'
};
const priorityBadge = {
  P1: 'bg-red-100 text-red-700',
  P2: 'bg-orange-100 text-orange-700',
  P3: 'bg-yellow-100 text-yellow-700',
  P4: 'bg-green-100 text-green-700'
};

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [users, setUsers] = useState({});  // user_id -> user object
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [priorityF, setPriorityF] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [resolveText, setResolveText] = useState('');
  const [resolving, setResolving] = useState(false);
  const [triaging, setTriaging] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    let res = tickets;
    if (statusF !== 'all') res = res.filter(t => t.status === statusF);
    if (priorityF !== 'all') res = res.filter(t => t.priority === priorityF);
    if (search) {
      const s = search.toLowerCase();
      res = res.filter(t =>
        t.title.toLowerCase().includes(s) ||
        String(t.ticket_id).includes(s) ||
        (users[t.user_id]?.name || '').toLowerCase().includes(s) ||
        (users[t.user_id]?.email || '').toLowerCase().includes(s)
      );
    }
    setFiltered(res);
  }, [tickets, search, statusF, priorityF, users]);

  const fetchAll = async () => {
    try {
      const [tRes, uRes] = await Promise.all([
        ticketAPI.getAll(),
        userAPI.getAll()
      ]);
      const ticketData = tRes.data;
      setTickets(ticketData);

      // Build user map: { user_id: user }
      const userMap = {};
      uRes.data.forEach(u => { userMap[u.user_id] = u; });
      setUsers(userMap);
    } catch {
      toast.error('Failed to load tickets');
    }
    setLoading(false);
  };

  const triage = async (ticketId) => {
    setTriaging(ticketId);
    try {
      await agentAPI.triageTicket(ticketId);
      toast.success('AI triage complete');
      fetchAll();
    } catch { toast.error('AI triage failed'); }
    setTriaging(null);
  };

  const resolve = async () => {
    if (!resolveText.trim()) { toast.error('Enter resolution text'); return; }
    setResolving(true);
    try {
      await agentAPI.resolveTicket(selected.ticket_id, resolveText);
      toast.success('Ticket resolved! Email sent to customer.');
      setSelected(null);
      setResolveText('');
      fetchAll();
    } catch { toast.error('Failed to resolve ticket'); }
    setResolving(false);
  };

  const deleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      return;
    }
    
    setDeleting(ticketId);
    try {
      await ticketAPI.delete(ticketId);
      toast.success(`Ticket #${ticketId} deleted successfully`);
      fetchAll();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete ticket');
    }
    setDeleting(null);
  };

  const updateStatus = async (ticketId, status) => {
    try {
      await ticketAPI.update(ticketId, { status });
      toast.success('Status updated');
      fetchAll();
    } catch { toast.error('Failed to update status'); }
  };

  const updatePriority = async (ticketId, priority) => {
    try {
      await ticketAPI.update(ticketId, { priority });
      toast.success('Priority updated');
      fetchAll();
    } catch { toast.error('Failed to update priority'); }
  };

  const getUserDisplay = (userId) => {
    const u = users[userId];
    if (!u) return { name: 'Unknown', email: '', initials: '?' };
    const initials = u.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
    return { name: u.name, email: u.email, initials };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ticket Management</h1>
          <p className="text-slate-500 text-sm mt-1">{tickets.length} total tickets</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-100 transition-all">
          <FiRefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, customer name or email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s}</option>)}
        </select>
        <select value={priorityF} onChange={e => setPriorityF(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p === 'all' ? 'All Priority' : p}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['#', 'Customer', 'Title', 'Priority', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(t => {
                  const user = getUserDisplay(t.user_id);
                  return (
                    <tr key={t.ticket_id} className="hover:bg-slate-50 transition-all">
                      {/* ID */}
                      <td className="px-4 py-3 font-mono text-slate-400 text-xs">#{t.ticket_id}</td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                            {user.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-700 truncate max-w-[120px]">{user.name}</div>
                            <div className="text-xs text-slate-400 truncate max-w-[120px]">{user.email}</div>
                          </div>
                        </div>
                       </td>

                      {/* Title */}
                      <td className="px-4 py-3 max-w-xs">
                        <Link
                          to={`/admin/tickets/${t.ticket_id}`}
                          className="font-medium text-slate-800 hover:text-blue-600 truncate block transition-colors"
                        >
                          {t.title}
                        </Link>
                       </td>

                      {/* Priority */}
                      <td className="px-4 py-3">
                        <select
                          value={t.priority}
                          onChange={e => updatePriority(t.ticket_id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer outline-none ${priorityBadge[t.priority]}`}
                        >
                          {['P1', 'P2', 'P3', 'P4'].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                       </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <select
                          value={t.status}
                          onChange={e => updateStatus(t.ticket_id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer outline-none ${statusBadge[t.status]}`}
                        >
                          {['open', 'in-progress', 'resolved', 'closed'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                       </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleDateString()}
                       </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/admin/tickets/${t.ticket_id}`}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="View"
                          >
                            <FiEye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => triage(t.ticket_id)}
                            disabled={triaging === t.ticket_id}
                            className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all"
                            title="AI Triage"
                          >
                            <FiZap className={`w-3.5 h-3.5 ${triaging === t.ticket_id ? 'animate-spin' : ''}`} />
                          </button>
                          {t.status !== 'resolved' && t.status !== 'closed' && (
                            <button
                              onClick={() => setSelected(t)}
                              className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                              title="Resolve"
                            >
                              <FiCheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Delete Button */}
                          <button
                            onClick={() => deleteTicket(t.ticket_id)}
                            disabled={deleting === t.ticket_id}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Ticket"
                          >
                            <FiTrash2 className={`w-3.5 h-3.5 ${deleting === t.ticket_id ? 'animate-pulse' : ''}`} />
                          </button>
                        </div>
                       </td>
                     </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">No tickets match your filters</div>
            )}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-slate-800 text-lg mb-1">Resolve Ticket #{selected.ticket_id}</h3>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                {getUserDisplay(selected.user_id).initials}
              </div>
              <span className="text-sm text-slate-500">
                {getUserDisplay(selected.user_id).name} — {selected.title}
              </span>
            </div>
            <textarea
              value={resolveText}
              onChange={e => setResolveText(e.target.value)}
              placeholder="Describe the resolution... (This will be sent to the customer via email)"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setSelected(null); setResolveText(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={resolve}
                disabled={resolving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {resolving ? 'Resolving...' : 'Resolve & Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}