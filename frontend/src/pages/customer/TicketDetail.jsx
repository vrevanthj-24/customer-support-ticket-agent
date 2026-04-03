import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ticketAPI, agentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiSend, FiUser, FiClock, FiZap,
  FiMessageSquare, FiCheckCircle, FiXCircle, FiAlertTriangle,
  FiPlusCircle, FiCpu, FiThumbsUp, FiThumbsDown, FiLoader
} from 'react-icons/fi';

const statusBadge = {
  open: 'bg-yellow-100 text-yellow-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600',
};
const priorityBadge = {
  P1: 'bg-red-100 text-red-700',
  P2: 'bg-orange-100 text-orange-700',
  P3: 'bg-yellow-100 text-yellow-700',
  P4: 'bg-green-100 text-green-700',
};

// Parse AI step-by-step message
function parseAISteps(message) {
  if (!message.includes('**') && !message.includes('Step')) return null;
  const lines = message.split('\n').filter(l => l.trim());
  const steps = lines.filter(l =>
    l.match(/^Step \d+:/i) || l.match(/^\d+\.\s/) || l.match(/^[-•]\s/)
  );
  return steps.length >= 2 ? steps : null;
}

export default function CustomerTicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoSolving, setAutoSolving] = useState(false);
  const [aiSolution, setAiSolution] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSatisfaction, setPendingSatisfaction] = useState(null);
  const [showEscalateForm, setShowEscalateForm] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { fetchAll(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [replies]);

  const fetchAll = async () => {
    try {
      const [tRes, rRes] = await Promise.all([
        ticketAPI.getOne(id),
        ticketAPI.getReplies(id)
      ]);
      setTicket(tRes.data);
      setReplies(rRes.data);

      // Check if AI already attempted to solve
      const aiReply = rRes.data.find(r =>
        r.sender_type === 'AI' && r.message.includes('Did these steps solve')
      );
      if (aiReply) setAiSolution({ alreadySent: true });

    } catch { navigate('/customer/tickets'); }
    setLoading(false);
  };

  const requestAISolve = async () => {
    setAutoSolving(true);
    try {
      const { data } = await agentAPI.autoSolve(id);
      if (data.auto_solved) {
        setAiSolution(data);
        toast.success('AI has analyzed your issue and provided steps!');
        fetchAll();
      } else {
        toast('This issue needs a human agent — ticket escalated', { icon: '👤' });
      }
    } catch (err) {
      toast.error('AI solve failed. Our team will assist you.');
    }
    setAutoSolving(false);
  };

  const handleConfirm = (satisfied) => {
    setPendingSatisfaction(satisfied);
    setShowConfirmModal(true);
  };

 const confirmResolved = async (satisfied) => {
  setConfirming(true);
  try {
    const { data } = await agentAPI.confirmResolved(id, satisfied);
    
    if (satisfied) {
      toast.success('🎉 Thank you! A confirmation email has been sent.');
      fetchAll();
    } else {
      // Customer clicked "No" - ticket should be assigned to agent
      if (data.status === 'assigned') {
        toast.success(`👤 Ticket escalated and assigned to ${data.assigned_agent}. They will respond shortly.`);
        fetchAll();
      } else if (data.status === 'queued') {
        toast.warning('⏳ All agents are busy. Your ticket is queued and will be assigned soon.');
        fetchAll();
      } else {
        toast('👤 Escalating to human agent...', { icon: '👤' });
        fetchAll();
      }
    }
  } catch (err) {
    console.error('Confirmation error:', err);
    toast.error('Failed to confirm. Please try again or contact support.');
  } finally {
    setConfirming(false);
    setShowConfirmModal(false);
  }
};
  const sendReply = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await ticketAPI.addReply(id, message, 'user');
      setMessage('');
      const { data } = await ticketAPI.getReplies(id);
      setReplies(data);
    } catch { toast.error('Failed to send reply'); }
    setSending(false);
  };

  const handleEscalate = () => {
    // Get the AI reply that had the steps
    const aiReply = replies.find(r => r.sender_type === 'AI' && r.message.includes('steps'));
    const userReplies = replies.filter(r => r.sender_type === 'user');
    
    // Build a comprehensive escalation description
    let escalationContext = `**Escalated Ticket from AI Self-Service**\n\n`;
    escalationContext += `**Original Ticket:** #${ticket.ticket_id}\n`;
    escalationContext += `**Original Title:** ${ticket.title}\n\n`;
    escalationContext += `**Original Issue:**\n${ticket.description}\n\n`;
    
    if (aiReply) {
        escalationContext += `**AI Provided Solution:**\n${aiReply.message.substring(0, 500)}...\n\n`;
    }
    
    escalationContext += `**User's Additional Info:**\n`;
    if (userReplies.length > 0) {
        userReplies.forEach(r => {
            escalationContext += `- ${r.message}\n`;
        });
    } else {
        escalationContext += `- No additional details provided yet.\n`;
    }
    
    escalationContext += `\n**Please assist with this escalated issue.**`;
    
    // Navigate to new ticket with pre-filled context
    navigate('/customer/new-ticket', {
        state: {
            prefill: {
                title: `[Escalated] ${ticket.title}`,
                description: escalationContext,
                category_id: ticket.category_id,
                is_escalation: true,
                original_ticket_id: ticket.ticket_id
            }
        }
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <FiLoader className="w-6 h-6 animate-spin" />
    </div>
  );
  if (!ticket) return null;

  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';
  const hasAISteps = replies.some(r =>
    r.sender_type === 'AI' && r.message.includes('Did these steps solve')
  );

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/customer/tickets"
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6 transition-colors">
        <FiArrowLeft className="w-4 h-4" /> Back to Tickets
      </Link>

      {/* Ticket Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-xl font-bold text-slate-800 leading-tight">{ticket.title}</h1>
          <div className="flex gap-2 flex-shrink-0">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${priorityBadge[ticket.priority]}`}>
              {ticket.priority}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusBadge[ticket.status]}`}>
              {ticket.status.replace('-', ' ')}
            </span>
          </div>
        </div>
        <p className="text-slate-600 text-sm leading-relaxed mb-4">{ticket.description}</p>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <FiClock className="w-3.5 h-3.5" />
            {new Date(ticket.created_at).toLocaleString()}
          </span>
          <span>Ticket #{ticket.ticket_id}</span>
        </div>

        {/* Resolved banner */}
        {isResolved && (
          <div className="mt-4 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm">
            <FiCheckCircle className="w-4 h-4" />
            This ticket has been resolved. Check your email for details.
          </div>
        )}
      </div>

      {/* AI Quick Solve Button — show if ticket is open and AI hasn't tried yet */}
      {!isResolved && !hasAISteps && ticket.status === 'open' && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-5 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <FiCpu className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 mb-1">AI Can Help Instantly</h3>
              <p className="text-sm text-slate-500 mb-3">
                Let our AI analyze your issue and provide step-by-step instructions to resolve it right now.
              </p>
              <button
                onClick={requestAISolve}
                disabled={autoSolving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
              >
                {autoSolving ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" />
                    <span>AI is analyzing...</span>
                  </>
                ) : (
                  <>
                    <FiZap className="w-4 h-4" />
                    <span>Get AI Solution</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Satisfaction prompt — show after AI gives steps */}
      {hasAISteps && !isResolved && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4">
          <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <FiAlertTriangle className="w-4 h-4 text-amber-500" />
            Did the AI solution resolve your issue?
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            Please let us know so we can close your ticket or connect you with a human agent.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleConfirm(true)}
              disabled={confirming}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            >
              <FiThumbsUp className="w-4 h-4" />
              Yes, issue resolved!
            </button>
            <button
              onClick={() => handleConfirm(false)}
              disabled={confirming}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            >
              <FiThumbsDown className="w-4 h-4" />
              No, still need help
            </button>
          </div>
        </div>
      )}

      {/* Escalate option — shown after customer says not satisfied */}
      {showEscalateForm && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-4">
          <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <FiAlertTriangle className="w-4 h-4 text-orange-500" />
            Want to raise a detailed ticket?
          </h3>
          <p className="text-sm text-slate-500 mb-3">
            We'll pre-fill the description with your current issue so you don't have to repeat yourself.
          </p>
          <button
            onClick={handleEscalate}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            <FiPlusCircle className="w-4 h-4" />
            Raise Escalated Ticket
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {pendingSatisfaction ? 'Confirm Resolution' : 'Need More Help?'}
            </h3>
            <p className="text-slate-600 mb-4">
              {pendingSatisfaction
                ? 'Were the steps provided able to solve your issue?'
                : 'Would you like to escalate this ticket to a human agent?'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmResolved(pendingSatisfaction)}
                disabled={confirming}
                className={`px-4 py-2 rounded-lg text-white ${
                  pendingSatisfaction
                    ? 'bg-green-600 hover:bg-green-500'
                    : 'bg-orange-600 hover:bg-orange-500'
                }`}
              >
                {confirming ? 'Processing...' : (pendingSatisfaction ? 'Yes, Resolved!' : 'Escalate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conversation */}
      <div className="bg-white rounded-2xl border border-slate-200 flex flex-col" style={{ height: '460px' }}>
        <div className="flex items-center gap-2 p-4 border-b border-slate-100">
          <FiMessageSquare className="w-4 h-4 text-slate-500" />
          <h2 className="font-semibold text-slate-800 text-sm">
            Conversation ({replies.length})
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {replies.length === 0 && (
            <div className="text-center text-slate-400 text-sm py-8">
              No replies yet.
            </div>
          )}
          {replies.map(r => {
            const isUser = r.sender_type === 'user';
            const isAI = r.sender_type === 'AI';
            const steps = isAI ? parseAISteps(r.message) : null;

            return (
              <div key={r.reply_id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : isAI
                    ? 'bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 text-slate-800'
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    {isAI && <FiCpu className="w-3 h-3 text-purple-500" />}
                    {!isAI && !isUser && <FiUser className="w-3 h-3 opacity-60" />}
                    <span className="text-xs font-semibold opacity-75">
                      {isUser ? 'You' : isAI ? 'AI Assistant' : 'Support Agent'}
                    </span>
                    <span className="text-xs opacity-50 ml-auto">
                      {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Render steps as a nice list if AI response has steps */}
                  {steps ? (
                    <div>
                      {r.message.split('\n').map((line, i) => {
                        const isStep = line.match(/^(Step \d+:|^\d+\.|[-•])\s/i);
                        const isBold = line.startsWith('**') && line.endsWith('**');
                        const isSeparator = line === '---';
                        const isCheckOption = line.includes('Did these steps') || line.includes('click');

                        if (isSeparator) return <hr key={i} className="border-purple-200 my-2" />;
                        if (isBold) return (
                          <p key={i} className="font-bold text-slate-800 mb-2 text-sm">
                            {line.replace(/\*\*/g, '')}
                          </p>
                        );
                        if (isStep) return (
                          <div key={i} className="flex items-start gap-2 mb-2">
                            <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                              {i + 1}
                            </div>
                            <p className="text-sm">{line.replace(/^(Step \d+:|^\d+\.|[-•])\s/i, '')}</p>
                          </div>
                        );
                        if (isCheckOption) return (
                          <p key={i} className="text-xs text-slate-500 mt-1">{line}</p>
                        );
                        if (!line.trim()) return null;
                        return <p key={i} className="text-sm mb-1">{line}</p>;
                      })}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{r.message}</p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply input */}
        {!isResolved && (
          <div className="p-4 border-t border-slate-100">
            <div className="flex gap-2">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                placeholder="Type your reply... (Enter to send)"
                rows={2}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={sendReply}
                disabled={sending || !message.trim()}
                className="px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition-all self-end"
              >
                <FiSend className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}