import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ticketAPI, agentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiSend, FiZap, FiCheckCircle, FiUser, FiCpu, FiRefreshCw } from 'react-icons/fi';

const statusOpts = ['open', 'in-progress', 'resolved', 'closed'];
const priorityOpts = ['P1', 'P2', 'P3', 'P4'];
const statusBadge = { open: 'bg-yellow-100 text-yellow-700', 'in-progress': 'bg-blue-100 text-blue-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-slate-100 text-slate-500' };
const priorityBadge = { P1: 'bg-red-100 text-red-700', P2: 'bg-orange-100 text-orange-700', P3: 'bg-yellow-100 text-yellow-700', P4: 'bg-green-100 text-green-700' };

export default function AdminTicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolveModal, setResolveModal] = useState(false);
  const [resolveText, setResolveText] = useState('');
  const [resolving, setResolving] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { fetchAll(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [replies]);

  const fetchAll = async () => {
    try {
      const [tRes, rRes] = await Promise.all([ticketAPI.getOne(id), ticketAPI.getReplies(id)]);
      setTicket(tRes.data);
      setReplies(rRes.data);
    } catch {}
    setLoading(false);
  };

  const getAISuggestion = async () => {
    setAiLoading(true);
    try {
      const { data } = await agentAPI.suggestReply(id);
      setAiSuggestion(data);
      toast.success('AI suggestion ready');
    } catch { toast.error('AI suggestion failed'); }
    setAiLoading(false);
  };

  const runTriage = async () => {
    try {
      await agentAPI.triageTicket(id);
      toast.success('AI triage complete');
      fetchAll();
    } catch { toast.error('Triage failed'); }
  };

  const sendReply = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await ticketAPI.addReply(id, message, 'agent');
      setMessage('');
      const { data } = await ticketAPI.getReplies(id);
      setReplies(data);
      toast.success('Reply sent');
    } catch { toast.error('Failed to send'); }
    setSending(false);
  };

  const updateField = async (field, value) => {
    try {
      await ticketAPI.update(id, { [field]: value });
      setTicket(p => ({ ...p, [field]: value }));
      toast.success('Updated');
    } catch { toast.error('Update failed'); }
  };

  const resolve = async () => {
    if (!resolveText.trim()) { toast.error('Enter resolution'); return; }
    setResolving(true);
    try {
      await agentAPI.resolveTicket(id, resolveText);
      toast.success('Resolved! Email sent to customer.');
      setResolveModal(false);
      fetchAll();
    } catch { toast.error('Resolve failed'); }
    setResolving(false);
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  if (!ticket) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/admin/tickets" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6">
        <FiArrowLeft className="w-4 h-4" /> Back to Tickets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Ticket Info & Conversation */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-xl font-bold text-slate-800">{ticket.title}</h1>
              <span className="text-xs font-mono text-slate-400">#{ticket.ticket_id}</span>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">{ticket.description}</p>
            <div className="flex gap-2 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusBadge[ticket.status]}`}>{ticket.status}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${priorityBadge[ticket.priority]}`}>{ticket.priority}</span>
            </div>
          </div>

          {/* AI Suggestion */}
          {aiSuggestion && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <FiCpu className="w-5 h-5 text-purple-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-purple-800 mb-1">AI Suggestion ({Math.round(aiSuggestion.confidence_score * 100)}% confidence)</p>
                  <p className="text-sm text-purple-700 mb-3">{aiSuggestion.suggested_reply}</p>
                  <button onClick={() => setMessage(aiSuggestion.suggested_reply)}
                    className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-500 transition-all">
                    Use this reply
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conversation */}
          <div className="bg-white rounded-2xl border border-slate-200 flex flex-col" style={{ height: '420px' }}>
            <div className="p-4 border-b border-slate-100 text-sm font-semibold text-slate-800">Conversation ({replies.length})</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {replies.map(r => {
                const isUser = r.sender_type === 'user';
                return (
                  <div key={r.reply_id} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isUser ? 'bg-slate-100' : r.sender_type === 'AI' ? 'bg-purple-50 border border-purple-200' : 'bg-blue-600 text-white'}`}>
                      <div className="text-xs font-medium opacity-60 mb-1">
                        {isUser ? 'Customer' : r.sender_type === 'AI' ? 'AI' : 'Agent (You)'}
                      </div>
                      <p className="text-sm">{r.message}</p>
                      <p className={`text-xs mt-1 ${isUser || r.sender_type === 'AI' ? 'text-slate-400' : 'text-blue-200'}`}>
                        {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div className="p-4 border-t border-slate-100">
              <div className="flex gap-2">
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Reply as agent..."
                  rows={2}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                <button onClick={sendReply} disabled={sending || !message.trim()}
                  className="px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition-all self-end">
                  <FiSend className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="space-y-4">
          {/* Status Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-4 text-sm">Ticket Controls</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Status</label>
                <select value={ticket.status} onChange={e => updateField('status', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {statusOpts.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Priority</label>
                <select value={ticket.priority} onChange={e => updateField('priority', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {priorityOpts.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* AI Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-4 text-sm">AI Actions</h3>
            <div className="space-y-2">
              <button onClick={getAISuggestion} disabled={aiLoading}
                className="w-full flex items-center gap-2 justify-center py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium transition-all">
                <FiCpu className="w-4 h-4" /> {aiLoading ? 'Generating...' : 'Get AI Reply'}
              </button>
              
              {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                <button onClick={() => setResolveModal(true)}
                  className="w-full flex items-center gap-2 justify-center py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-all">
                  <FiCheckCircle className="w-4 h-4" /> Resolve Ticket
                </button>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-3 text-sm">Ticket Info</h3>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex justify-between"><span>Created</span><span>{new Date(ticket.created_at).toLocaleDateString()}</span></div>
              {ticket.updated_at && <div className="flex justify-between"><span>Updated</span><span>{new Date(ticket.updated_at).toLocaleDateString()}</span></div>}
              <div className="flex justify-between"><span>Category</span><span>{ticket.category_id || '—'}</span></div>
              <div className="flex justify-between"><span>User ID</span><span>{ticket.user_id}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-slate-800 text-lg mb-4">Resolve Ticket #{id}</h3>
            <textarea value={resolveText} onChange={e => setResolveText(e.target.value)}
              placeholder="Resolution details (will be emailed to customer)..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setResolveModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={resolve} disabled={resolving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold">
                {resolving ? 'Resolving...' : 'Resolve & Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}