import React, { useState, useEffect } from 'react';
import { ticketAPI, agentAPI, faqAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiZap, FiCpu, FiCheckCircle, FiBook, FiPlay, FiLoader } from 'react-icons/fi';

export default function AdminAIAgent() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [log, setLog] = useState([]);
  const [bulkFAQ, setBulkFAQ] = useState(false);

  useEffect(() => {
    ticketAPI.getAll().then(({ data }) => {
      setTickets(data.filter(t => t.status === 'open' || t.status === 'in-progress'));
    }).finally(() => setLoading(false));
  }, []);

  const addLog = (msg, type = 'info') => {
    setLog(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  const triageAll = async () => {
    const openTickets = tickets.filter(t => t.status === 'open');
    if (!openTickets.length) { toast.error('No open tickets to triage'); return; }
    setRunning('triage');
    setLog([]);
    addLog(`Starting AI triage on ${openTickets.length} tickets...`, 'info');
    let success = 0;
    for (const t of openTickets) {
      try {
        addLog(`Triaging ticket #${t.ticket_id}: ${t.title}`, 'info');
        await agentAPI.triageTicket(t.ticket_id);
        addLog(`✓ Ticket #${t.ticket_id} triaged successfully`, 'success');
        success++;
      } catch {
        addLog(`✗ Failed to triage ticket #${t.ticket_id}`, 'error');
      }
    }
    addLog(`Triage complete: ${success}/${openTickets.length} tickets processed`, 'success');
    toast.success(`Triaged ${success} tickets`);
    const { data } = await ticketAPI.getAll();
    setTickets(data.filter(t => t.status === 'open' || t.status === 'in-progress'));
    setRunning(null);
  };

  const generateFAQs = async () => {
    setBulkFAQ(true);
    setLog([]);
    addLog('Generating FAQs from resolved tickets...', 'info');
    try {
      const { data } = await faqAPI.bulkGenerate(10);
      addLog(`✓ Generated ${data.generated?.length || 0} new FAQs`, 'success');
      if (data.failed?.length) addLog(`✗ Failed for ${data.failed.length} tickets`, 'error');
      toast.success(`Generated ${data.generated?.length || 0} FAQs`);
    } catch {
      addLog('✗ Bulk FAQ generation failed', 'error');
      toast.error('FAQ generation failed');
    }
    setBulkFAQ(false);
  };

  const suggestAll = async () => {
    const inProgressTickets = tickets.filter(t => t.status === 'in-progress').slice(0, 5);
    if (!inProgressTickets.length) { toast.error('No in-progress tickets'); return; }
    setRunning('suggest');
    setLog([]);
    addLog(`Getting AI suggestions for ${inProgressTickets.length} tickets...`, 'info');
    for (const t of inProgressTickets) {
      try {
        addLog(`Analyzing ticket #${t.ticket_id}: ${t.title}`, 'info');
        const { data } = await agentAPI.suggestReply(t.ticket_id);
        addLog(`✓ #${t.ticket_id}: Suggestion ready (${Math.round(data.confidence_score * 100)}% confidence)`, 'success');
      } catch {
        addLog(`✗ Failed for ticket #${t.ticket_id}`, 'error');
      }
    }
    addLog('AI suggestion run complete', 'success');
    setRunning(null);
  };

  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in-progress').length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">AI Agent Control Center</h1>
        <p className="text-slate-500 text-sm mt-1">Run AI operations on your ticket queue</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
          <div className="text-3xl font-bold text-yellow-600">{openCount}</div>
          <div className="text-sm text-slate-500 mt-1">Open Tickets</div>
          <div className="text-xs text-slate-400 mt-0.5">Awaiting triage</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
          <div className="text-3xl font-bold text-blue-600">{inProgressCount}</div>
          <div className="text-sm text-slate-500 mt-1">In Progress</div>
          <div className="text-xs text-slate-400 mt-0.5">Needs replies</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
          <div className="text-3xl font-bold text-purple-600">{tickets.length}</div>
          <div className="text-sm text-slate-500 mt-1">Active Total</div>
          <div className="text-xs text-slate-400 mt-0.5">Queue size</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Actions */}
        <div className="space-y-4">
          <h2 className="font-bold text-slate-800">AI Operations</h2>

          

      

          {/* FAQ Generation */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <FiBook className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">Auto-Generate FAQs</h3>
                <p className="text-sm text-slate-500 mt-1 mb-3">Extract Q&A pairs from the 10 most recently resolved tickets and add to FAQ.</p>
                <button
                  onClick={generateFAQs}
                  disabled={bulkFAQ}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                >
                  {bulkFAQ ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiPlay className="w-4 h-4" />}
                  {bulkFAQ ? 'Generating...' : 'Generate FAQs'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div>
          <h2 className="font-bold text-slate-800 mb-4">Activity Log</h2>
          <div className="bg-slate-900 rounded-2xl p-4 h-96 overflow-y-auto font-mono text-xs">
            {log.length === 0 ? (
              <div className="text-slate-500 text-center py-8">Run an AI operation to see activity logs here...</div>
            ) : log.map((entry, i) => (
              <div key={i} className={`flex gap-2 mb-1.5 ${entry.type === 'success' ? 'text-green-400' : entry.type === 'error' ? 'text-red-400' : 'text-slate-300'}`}>
                <span className="text-slate-500 flex-shrink-0">[{entry.time}]</span>
                <span>{entry.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Queue */}
      {tickets.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Active Ticket Queue</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {tickets.slice(0, 20).map(t => (
              <div key={t.ticket_id} className="flex items-center gap-4 px-5 py-3">
                <span className="font-mono text-xs text-slate-400 w-10">#{t.ticket_id}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{t.title}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  t.priority === 'P1' ? 'bg-red-100 text-red-700' :
                  t.priority === 'P2' ? 'bg-orange-100 text-orange-700' :
                  t.priority === 'P3' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                }`}>{t.priority}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  t.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                }`}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}